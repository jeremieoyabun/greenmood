import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AgentRunStatus } from '@prisma/client'
import { PostInspectorAgent } from '@/agents/post-inspector'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Post Inspector Cron — runs at :20 and :50 past each hour
 *
 * Finds posts published in the last 60 minutes, fetches their media
 * from Instagram Graph API, and uses Claude Vision to inspect for
 * cropping issues, text visibility, and quality problems.
 */
export async function GET(req: NextRequest) {
  // ─── Auth check ───
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()

  // Create agent run record
  const agentRun = await prisma.agentRun.create({
    data: {
      workspaceId: WORKSPACE_ID,
      agentType: 'POST_INSPECTOR',
      status: AgentRunStatus.RUNNING,
      input: { trigger: 'cron', schedule: ':20/:50 hourly' },
    },
  })

  try {
    // ─── Find recently published posts (last 60 min) ───
    const recentlyPublished = await prisma.$queryRaw<
      Array<{
        post_id: string
        platform: string
        market: string
        comment: string
        created_at: Date
      }>
    >`
      SELECT as2.post_id, p.platform, p.market, as2.comment, as2.created_at
      FROM approval_steps as2
      JOIN posts p ON p.id = as2.post_id
      WHERE as2.to_status = 'PUBLISHED'
        AND as2.created_at > NOW() - INTERVAL '60 minutes'
        AND p.workspace_id = ${WORKSPACE_ID}
      ORDER BY as2.created_at DESC
    `

    if (!recentlyPublished.length) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          output: { message: 'No recently published posts to inspect', postsChecked: 0 },
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, postsChecked: 0 })
    }

    // ─── Get Instagram tokens ───
    const tokenRecords = await prisma.$queryRaw<
      Array<{ access_token: string; market: string; platform: string }>
    >`
      SELECT access_token, market, platform FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
    `
    const tokenMap = new Map<string, string>()
    for (const t of tokenRecords) {
      tokenMap.set(`${t.platform}:${t.market}`, t.access_token)
    }

    const inspector = new PostInspectorAgent()
    const results: Array<Record<string, unknown>> = []
    let issuesFound = 0

    for (const pub of recentlyPublished) {
      // Extract platformId from approval step comment
      const platformIdMatch = pub.comment?.match(/Platform ID:\s*(.+)/i)
      if (!platformIdMatch) continue

      const platformId = platformIdMatch[1].trim().split(',')[0] // Take first ID for multi-story

      // Skip non-Instagram for now (LinkedIn doesn't return media_url the same way)
      if (pub.platform !== 'instagram' && pub.platform !== 'stories') continue

      const token = tokenMap.get(`instagram:${pub.market}`)
      if (!token) continue

      try {
        // ─── Fetch published media from Instagram Graph API ───
        const igRes = await fetch(
          `https://graph.instagram.com/v25.0/${platformId}?fields=id,media_url,media_type,caption,thumbnail_url&access_token=${token}`
        )

        if (!igRes.ok) {
          results.push({ postId: pub.post_id, error: `IG API ${igRes.status}`, skipped: true })
          continue
        }

        const igData = await igRes.json()
        const mediaUrl = igData.media_url || igData.thumbnail_url

        if (!mediaUrl) {
          results.push({ postId: pub.post_id, error: 'No media_url from IG', skipped: true })
          continue
        }

        // ─── Get intended content from variant ───
        const variant = await prisma.postVariant.findFirst({
          where: { postId: pub.post_id, isActive: true },
          select: { text: true, hashtags: true },
        })

        // ─── Run the inspector agent ───
        const output = await inspector.run({
          workspaceId: WORKSPACE_ID,
          payload: {
            postId: pub.post_id,
            platformId,
            platform: pub.platform,
            market: pub.market,
            mediaUrl,
            caption: variant?.text || igData.caption || '',
            hashtags: variant?.hashtags || '',
          },
        })

        const inspection = (output.data as any)?.inspection
        results.push({
          postId: pub.post_id,
          platform: pub.platform,
          market: pub.market,
          status: inspection?.status || 'unknown',
          summary: inspection?.summary || '',
          checks: inspection?.checks || {},
        })

        // ─── Create notification if issues found ───
        if (inspection?.status === 'issues_found' || inspection?.status === 'critical') {
          issuesFound++

          const severity = inspection.status === 'critical' ? '🔴' : '⚠️'
          const title = `${severity} Post inspection: ${inspection.status === 'critical' ? 'critical issues' : 'issues found'}`

          // Get first operator user for notification
          const operators = await prisma.user.findMany({
            where: { workspaceId: WORKSPACE_ID, role: 'OPERATOR' },
            select: { id: true },
            take: 1,
          })

          if (operators[0]) {
            await prisma.$executeRaw`
              INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
              VALUES (
                gen_random_uuid()::text,
                ${operators[0].id},
                'warning',
                ${title},
                ${`${pub.platform} post (${pub.market}): ${inspection.summary || 'Check required'}. ${(inspection.recommendations || []).join('. ')}`},
                ${'/approvals'},
                NOW()
              )
            `
          }
        }
      } catch (err) {
        results.push({
          postId: pub.post_id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const durationMs = Date.now() - startTime

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: JSON.parse(JSON.stringify({
          postsChecked: recentlyPublished.length,
          postsInspected: results.filter((r) => !r.skipped && !r.error).length,
          issuesFound,
          results,
        })),
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      postsChecked: recentlyPublished.length,
      postsInspected: results.filter((r) => !r.skipped && !r.error).length,
      issuesFound,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.FAILED,
        error: errorMessage,
        durationMs,
        completedAt: new Date(),
      },
    })

    console.error('Cron post-inspector error:', error)
    return NextResponse.json(
      { success: false, error: errorMessage, durationMs },
      { status: 500 }
    )
  }
}
