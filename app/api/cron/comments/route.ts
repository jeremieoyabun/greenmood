import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Comment Monitor — runs every 30 minutes
 *
 * Fetches recent Instagram comments on @greenmood.be posts,
 * classifies them with Claude Haiku, generates suggested replies,
 * and stores high-priority comments as intelligence signals.
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

  const agentRun = await prisma.agentRun.create({
    data: {
      workspaceId: WORKSPACE_ID,
      agentType: 'COMMENT_MONITOR',
      status: AgentRunStatus.RUNNING,
      input: { trigger: 'cron', schedule: 'every 30 min' },
    },
  })

  try {
    // ─── Get Instagram token ───
    const tokenRecords = await prisma.$queryRaw<
      Array<{ access_token: string }>
    >`
      SELECT access_token FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
        AND market = 'hq'
        AND platform = 'instagram'
      LIMIT 1
    `

    if (!tokenRecords.length) {
      throw new Error('No Instagram token found for market=hq in social_tokens')
    }

    const accessToken = tokenRecords[0].access_token

    // ─── Fetch recent media with comments ───
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,comments{text,username,timestamp,id}&limit=10&access_token=${accessToken}`
    const mediaRes = await fetch(mediaUrl)

    if (!mediaRes.ok) {
      const errBody = await mediaRes.text()
      throw new Error(`Instagram API error ${mediaRes.status}: ${errBody}`)
    }

    const mediaData = await mediaRes.json()
    const posts = mediaData.data || []

    // ─── Find already-seen comment IDs (stored in title prefix) ───
    const existingSignals = await prisma.intelligenceSignal.findMany({
      where: { category: 'social_comment' },
      select: { title: true },
    })
    const seenCommentIds = new Set(
      existingSignals.map((s) => s.title.split('|')[0]?.trim()).filter(Boolean)
    )

    // ─── Collect new comments ───
    const newComments: Array<{
      commentId: string
      text: string
      username: string
      timestamp: string
      postId: string
      postCaption: string
    }> = []

    for (const post of posts) {
      const comments = post.comments?.data || []
      for (const comment of comments) {
        if (!seenCommentIds.has(comment.id)) {
          newComments.push({
            commentId: comment.id,
            text: comment.text,
            username: comment.username,
            timestamp: comment.timestamp,
            postId: post.id,
            postCaption: (post.caption || '').substring(0, 100),
          })
        }
      }
    }

    if (newComments.length === 0) {
      const durationMs = Date.now() - startTime
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          output: { message: 'No new comments found', commentsProcessed: 0 },
          durationMs,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        commentsProcessed: 0,
        message: 'No new comments found',
        durationMs,
      })
    }

    // ─── Classify all new comments in a single AI call ───
    const classifyPrompt = `You are a social media community manager for Greenmood, a premium Belgian biophilic design brand that makes preserved moss walls, cork acoustic panels, and biophilic architectural products.

Classify each comment and generate a suggested reply. High-priority commenters include architects, interior designers, brands looking for partnerships, and anyone asking about products/pricing.

COMMENTS TO CLASSIFY:
${JSON.stringify(newComments.map((c) => ({
  id: c.commentId,
  username: c.username,
  text: c.text,
  postContext: c.postCaption,
})), null, 2)}

For each comment, respond with valid JSON array:
[
  {
    "commentId": "the comment id",
    "classification": "question | compliment | spam | architect_inquiry | designer_inquiry | partnership_request | product_question | general",
    "priority": "high | medium | low",
    "suggestedReply": "a warm, professional reply in Greenmood's refined tone (or null for spam)",
    "isHighValue": true/false,
    "reason": "brief reason for the classification"
  }
]

Rules:
- Architects and designers are ALWAYS high priority.
- Partnership requests are ALWAYS high priority.
- Product/pricing questions are high priority.
- Compliments are medium priority.
- Spam is low priority with no reply.
- Keep replies warm but professional. Never overpromise. Never share pricing in comments.
- Respond ONLY with valid JSON array. No markdown, no preamble.`

    const aiResponse = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 3000,
      messages: [{ role: 'user', content: classifyPrompt }],
    })

    const totalTokens =
      (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0)

    const textBlock = aiResponse.content.find((b) => b.type === 'text')
    const responseText = textBlock?.type === 'text' ? textBlock.text : '[]'

    let classifications: Array<{
      commentId: string
      classification: string
      priority: string
      suggestedReply: string | null
      isHighValue: boolean
      reason: string
    }>

    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      classifications = JSON.parse(jsonMatch ? jsonMatch[1] : responseText)
    } catch {
      console.error('Failed to parse comment classification:', responseText.substring(0, 200))
      classifications = []
    }

    // ─── Store classified comments as intelligence signals ───
    const storedSignals: string[] = []
    const highPrioritySignals: string[] = []

    for (const classified of classifications) {
      const originalComment = newComments.find((c) => c.commentId === classified.commentId)
      if (!originalComment) continue

      // Map priority to urgency
      const urgencyMap: Record<string, string> = {
        high: 'act_now',
        medium: 'this_week',
        low: 'monitor',
      }

      // Map priority to score
      const scoreMap: Record<string, number> = {
        high: 3.0,
        medium: 1.5,
        low: 0.5,
      }

      try {
        const signal = await prisma.intelligenceSignal.create({
          data: {
            title: `${originalComment.commentId} | @${originalComment.username}: ${classified.classification}`,
            category: 'social_comment',
            country: 'Belgium',
            summary: originalComment.text,
            whyItMatters: classified.reason,
            confidence: 'high',
            urgency: urgencyMap[classified.priority] || 'monitor',
            recommendedAction: classified.suggestedReply || 'No reply needed (spam)',
            recommendedFormat: 'comment_reply',
            recommendedChannel: 'instagram',
            score: scoreMap[classified.priority] || 0.5,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        })

        storedSignals.push(signal.id)

        if (classified.priority === 'high' || classified.isHighValue) {
          highPrioritySignals.push(signal.id)
        }
      } catch (err) {
        console.error('Failed to store comment signal:', originalComment.commentId, err)
      }
    }

    const durationMs = Date.now() - startTime

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: {
          commentsProcessed: newComments.length,
          signalsStored: storedSignals.length,
          highPriority: highPrioritySignals.length,
          signalIds: storedSignals,
          highPriorityIds: highPrioritySignals,
        },
        tokensUsed: totalTokens,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      commentsProcessed: newComments.length,
      signalsStored: storedSignals.length,
      highPriority: highPrioritySignals.length,
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

    console.error('Cron comments error:', error)
    return NextResponse.json(
      { success: false, error: errorMessage, durationMs },
      { status: 500 }
    )
  }
}
