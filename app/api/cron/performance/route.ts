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
    // ─── Get Instagram token from social_tokens ───
    const tokenRecords = await prisma.$queryRaw<
      Array<{ access_token: string; account_handle: string }>
    >`
      SELECT access_token, account_handle FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
        AND market = 'hq'
        AND platform = 'instagram'
      LIMIT 1
    `

    if (!tokenRecords.length) {
      throw new Error('No Instagram token found for market=hq in social_tokens')
    }

    const accessToken = tokenRecords[0].access_token

    // ─── Fetch recent media with insights ───
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,timestamp,like_count,comments_count,insights.metric(reach,impressions,saved,shares)&limit=25&access_token=${accessToken}`
    const mediaRes = await fetch(mediaUrl)

    if (!mediaRes.ok) {
      const errBody = await mediaRes.text()
      throw new Error(`Instagram API error ${mediaRes.status}: ${errBody}`)
    }

    const mediaData = await mediaRes.json()
    const posts = mediaData.data || []

    if (posts.length === 0) {
      throw new Error('No media returned from Instagram API')
    }

    // ─── Store performance snapshots ───
    let storedCount = 0
    const postSummaries: Array<{
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

    for (const post of posts) {
      // Extract insight metrics
      const insights = post.insights?.data || []
      const getMetric = (name: string): number => {
        const m = insights.find((i: { name: string }) => i.name === name)
        return m?.values?.[0]?.value || 0
      }

      const reach = getMetric('reach')
      const impressions = getMetric('impressions')
      const saves = getMetric('saved')
      const shares = getMetric('shares')
      const likes = post.like_count || 0
      const comments = post.comments_count || 0
      const totalEngagement = reach > 0
        ? ((likes + comments + saves + shares) / reach) * 100
        : 0

      // Check if we already have a snapshot for this post today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const existing = await prisma.analyticsSnapshot.findFirst({
        where: {
          platform: 'instagram',
          date: today,
          metadata: {
            path: ['igPostId'],
            equals: post.id,
          },
        },
      })

      if (!existing) {
        await prisma.analyticsSnapshot.create({
          data: {
            platform: 'instagram',
            market: 'hq',
            date: today,
            impressions,
            reach,
            likes,
            comments,
            shares,
            saves,
            engagement: totalEngagement,
            metadata: {
              igPostId: post.id,
              mediaType: post.media_type,
              caption: (post.caption || '').substring(0, 200),
              timestamp: post.timestamp,
            },
          },
        })
        storedCount++
      }

      postSummaries.push({
        caption: (post.caption || '').substring(0, 150),
        mediaType: post.media_type,
        timestamp: post.timestamp,
        likes,
        comments,
        reach,
        impressions,
        saves,
        shares,
      })
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

    // ─── Store as KB entry ───
    const today = new Date().toISOString().split('T')[0]
    await prisma.knowledgeBaseEntry.upsert({
      where: {
        workspaceId_category_key: {
          workspaceId: WORKSPACE_ID,
          category: 'PERFORMANCE_INSIGHT',
          key: 'weekly_performance_analysis',
        },
      },
      update: {
        value: JSON.stringify(analysis),
        metadata: {
          lastUpdated: today,
          postsAnalyzed: posts.length,
          snapshotsStored: storedCount,
        },
        isActive: true,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        category: 'PERFORMANCE_INSIGHT',
        key: 'weekly_performance_analysis',
        value: JSON.stringify(analysis),
        source: 'performance_learner_cron',
        metadata: {
          lastUpdated: today,
          postsAnalyzed: posts.length,
          snapshotsStored: storedCount,
        },
      },
    })

    const durationMs = Date.now() - startTime
    const tokensUsed =
      (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0)

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: JSON.parse(JSON.stringify({
          postsAnalyzed: posts.length,
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
      postsAnalyzed: posts.length,
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
