import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Performance Learner — runs at 22:00 UTC daily
 *
 * Fetches Instagram insights for @greenmood.be via the Instagram Graph API,
 * stores performance snapshots, and uses Claude Haiku to analyze patterns.
 * Stores the analysis as a KB entry (PERFORMANCE_INSIGHT).
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
      agentType: 'PERFORMANCE_ANALYST',
      status: AgentRunStatus.RUNNING,
      input: { trigger: 'cron', schedule: '22:00 UTC daily' },
    },
  })

  try {
    // ─── Get ALL Instagram tokens from social_tokens ───
    const tokenRecords = await prisma.$queryRaw<
      Array<{ access_token: string; account_handle: string; market: string }>
    >`
      SELECT access_token, account_handle, market FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
        AND platform = 'instagram'
    `

    if (!tokenRecords.length) {
      throw new Error('No Instagram tokens found in social_tokens')
    }

    // ─── Fetch and store for ALL accounts ───
    let storedCount = 0
    const postSummaries: Array<{
      market: string
      caption: string
      mediaType: string
      timestamp: string
      likes: number
      comments: number
      reach: number
      impressions: number
      saves: number
      shares: number
    }> = []

    for (const tokenRecord of tokenRecords) {
      const { access_token: accessToken, market, account_handle } = tokenRecord

      try {
        const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`
        const mediaRes = await fetch(mediaUrl)

        if (!mediaRes.ok) {
          console.error(`Instagram API error for ${account_handle}: ${mediaRes.status}`)
          continue
        }

        const mediaData = await mediaRes.json()
        const posts = mediaData.data || []

        for (const post of posts) {
          const likes = post.like_count || 0
          const comments = post.comments_count || 0
          // Use publication date instead of today
          const pubDate = post.timestamp ? new Date(post.timestamp) : new Date()
          pubDate.setHours(0, 0, 0, 0)

          // Check if we already have a snapshot for this IG post
          const existing = await prisma.analyticsSnapshot.findFirst({
            where: {
              platform: 'instagram',
              market,
              metadata: { path: ['igPostId'], equals: post.id },
            },
          })

          if (existing) {
            // Update with latest stats
            await prisma.analyticsSnapshot.update({
              where: { id: existing.id },
              data: { likes, comments },
            })
          } else {
            await prisma.analyticsSnapshot.create({
              data: {
                platform: 'instagram',
                market,
                date: pubDate,
                likes,
                comments,
                shares: 0,
                saves: 0,
                reach: 0,
                impressions: 0,
                engagement: 0,
                metadata: {
                  igPostId: post.id,
                  mediaType: post.media_type,
                  caption: (post.caption || '').substring(0, 200),
                  timestamp: post.timestamp,
                  account: account_handle,
                },
              },
            })
            storedCount++
          }

          postSummaries.push({
            market,
            caption: (post.caption || '').substring(0, 150),
            mediaType: post.media_type,
            timestamp: post.timestamp,
            likes,
            comments,
            reach: 0,
            impressions: 0,
            saves: 0,
            shares: 0,
          })
        }
      } catch (err) {
        console.error(`Failed to fetch stats for ${account_handle}:`, err)
      }
    }

    // ─── AI analysis with Claude Haiku ───
    const analysisPrompt = `You are a social media performance analyst for Greenmood, a premium Belgian biophilic design brand.

Analyze the following Instagram performance data for @greenmood.be and identify actionable patterns.

DATA:
${JSON.stringify(postSummaries, null, 2)}

Provide your analysis as valid JSON with this structure:
{
  "topPerformingTypes": ["list of media types that perform best"],
  "bestPostingTimes": ["list of time windows that get most engagement"],
  "topTopics": ["list of content topics/themes that resonate"],
  "engagementTrend": "increasing | stable | declining",
  "avgEngagementRate": 0.0,
  "keyInsights": ["3-5 actionable insights"],
  "recommendations": ["3-5 specific content recommendations for next week"],
  "summary": "2-3 sentence executive summary"
}

Respond ONLY with valid JSON. No markdown, no preamble.`

    const aiResponse = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 2048,
      messages: [{ role: 'user', content: analysisPrompt }],
    })

    const textBlock = aiResponse.content.find((b) => b.type === 'text')
    const analysisText = textBlock?.type === 'text' ? textBlock.text : '{}'

    // Parse the analysis (strip markdown fences if present)
    let analysis: Record<string, unknown>
    try {
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[1] : analysisText)
    } catch {
      analysis = { rawResponse: analysisText, parseError: true }
    }

    // ─── Store as KB entry (raw SQL to avoid enum mismatch) ───
    const analysisJson = JSON.stringify(analysis)
    await prisma.$executeRawUnsafe(
      `INSERT INTO knowledge_base (id, workspace_id, category, key, value, is_active, source, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'PERFORMANCE_INSIGHT', 'weekly_performance_analysis', $2, true, 'performance_learner_cron', NOW(), NOW())
       ON CONFLICT (workspace_id, category, key) DO UPDATE SET value = $2, updated_at = NOW()`,
      WORKSPACE_ID,
      analysisJson
    )

    const durationMs = Date.now() - startTime
    const tokensUsed =
      (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0)

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: JSON.parse(JSON.stringify({
          postsAnalyzed: postSummaries.length,
          snapshotsStored: storedCount,
          analysis,
        })),
        tokensUsed,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      postsAnalyzed: postSummaries.length,
      snapshotsStored: storedCount,
      analysis,
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

    console.error('Cron performance error:', error)
    return NextResponse.json(
      { success: false, error: errorMessage, durationMs },
      { status: 500 }
    )
  }
}
