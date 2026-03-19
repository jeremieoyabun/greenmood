import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentGeneratorAgent, EditorialStrategistAgent } from '@/agents'
import { PostStatus, CalendarStatus, VariantSource } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

// Default markets and platforms for daily proposals
const DEFAULT_MARKETS = ['hq', 'us', 'uk', 'fr']
const DEFAULT_PLATFORMS = ['linkedin', 'instagram']

/**
 * Daily Editorial Proposer — runs at 07:00 UTC
 *
 * Uses the EditorialStrategistAgent to propose 2-3 posts for the day,
 * then the ContentGeneratorAgent to produce the actual content.
 * Creates posts, variants, and calendar slots automatically.
 * All posts start as AI_GENERATED (needs human review).
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
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  try {
    // ─── 1. Gather context ───

    // Recent intelligence signals (last 7 days)
    const recentSignals = await prisma.intelligenceSignal.findMany({
      where: {
        detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDuplicate: false,
      },
      orderBy: { score: 'desc' },
      take: 10,
    })

    // What's already scheduled this week
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + 1) // Monday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // Sunday

    const existingSlots = await prisma.calendarSlot.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        post: {
          include: {
            variants: { where: { isActive: true }, take: 1 },
          },
        },
      },
    })

    // KB entries for context
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId: WORKSPACE_ID, isActive: true },
      take: 50,
    })

    // ─── 2. Run Editorial Strategist ───

    const strategist = new EditorialStrategistAgent()
    const strategyResult = await strategist.run({
      workspaceId: WORKSPACE_ID,
      payload: {
        date: todayStr,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        existingSlots: existingSlots.map((s) => ({
          date: new Date(s.date).toISOString().split('T')[0],
          market: s.market,
          platform: s.platform,
          status: s.status,
          hasContent: !!s.post?.variants?.[0]?.text,
        })),
        recentSignals: recentSignals.map((s) => ({
          title: s.title,
          category: s.category,
          summary: s.summary,
          recommendedAction: s.recommendedAction,
          recommendedFormat: s.recommendedFormat,
          recommendedChannel: s.recommendedChannel,
          urgency: s.urgency,
          score: s.score,
        })),
        instruction: `Propose 2-3 posts for today (${todayStr}) using the 4R framework:
- Reveal: Share something new (product detail, behind-the-scenes)
- Reference: Cite industry data, certifications, or standards
- Results: Show project results, case studies, before/after
- Relate: Connect to audience pain points (noise, wellness, sustainability)

Prioritize gaps in this week's calendar. Use intelligence signals when relevant.
For each slot, pick the best market and platform combination.`,
      },
    })

    if (!strategyResult.success || !strategyResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Editorial strategist failed',
        details: strategyResult.errors,
        durationMs: Date.now() - startTime,
      }, { status: 500 })
    }

    // ─── 3. Generate content for each proposed slot ───

    const proposedSlots = (strategyResult.data as any).slots || []
    const createdPosts: Array<{
      postId: string
      slotId: string
      market: string
      platform: string
      brief: string
    }> = []

    const contentGenerator = new ContentGeneratorAgent()

    for (const slot of proposedSlots.slice(0, 3)) {
      // Limit to 3 posts max
      const market = slot.market || DEFAULT_MARKETS[0]
      const platform = slot.platform || DEFAULT_PLATFORMS[0]
      const brief = slot.briefSuggestion || slot.brief || 'Biophilic design thought leadership post'
      const contentType = slot.contentType || 'PRODUCT'
      const timing = slot.timing || '10:00'

      try {
        // Generate content via the content generator agent
        const contentResult = await contentGenerator.run({
          workspaceId: WORKSPACE_ID,
          payload: {
            brief,
            contentType,
            markets: [market],
            platforms: [platform],
          },
        })

        // Extract generated text
        let postText = ''
        let hashtags = ''
        let firstComment = ''
        let notes = ''

        if (contentResult.success && contentResult.data) {
          const posts = (contentResult.data as any).posts || {}
          const key = Object.keys(posts)[0]
          if (key && posts[key]) {
            postText = posts[key].text || ''
            hashtags = posts[key].hashtags || ''
            firstComment = posts[key].first_comment || ''
            notes = posts[key].notes || ''
          }
        }

        // Fallback if no text was generated
        if (!postText) {
          postText = `[AI Draft] ${brief}`
        }

        // Create post + variant + calendar slot in a transaction
        const result = await prisma.$transaction(async (tx) => {
          const post = await tx.post.create({
            data: {
              workspaceId: WORKSPACE_ID,
              market,
              platform,
              status: PostStatus.AI_GENERATED,
            },
          })

          await tx.postVariant.create({
            data: {
              postId: post.id,
              version: 1,
              text: postText,
              hashtags: hashtags || null,
              firstComment: firstComment || null,
              timing: timing || null,
              notes: notes || brief,
              source: VariantSource.AI_GENERATED,
            },
          })

          const calendarSlot = await tx.calendarSlot.create({
            data: {
              workspaceId: WORKSPACE_ID,
              postId: post.id,
              date: new Date(todayStr),
              time: timing,
              market,
              platform,
              status: CalendarStatus.CONTENT_READY,
              notes: brief,
            },
          })

          // Record approval step for the AI generation
          await tx.approvalStep.create({
            data: {
              postId: post.id,
              fromStatus: PostStatus.DRAFT,
              toStatus: PostStatus.AI_GENERATED,
              action: 'AUTO_PASS',
              comment: `Auto-generated by daily editorial cron. Brief: ${brief}`,
            },
          })

          return { postId: post.id, slotId: calendarSlot.id }
        })

        createdPosts.push({
          postId: result.postId,
          slotId: result.slotId,
          market,
          platform,
          brief,
        })
      } catch (err) {
        console.error('Failed to create post for slot:', slot, err)
      }
    }

    return NextResponse.json({
      success: true,
      proposedSlots: proposedSlots.length,
      postsCreated: createdPosts.length,
      posts: createdPosts,
      theme: (strategyResult.data as any).theme || null,
      reasoning: (strategyResult.data as any).reasoning || null,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Cron editorial error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Editorial cron failed',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
