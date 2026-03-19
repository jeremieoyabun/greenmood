import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { AgentRunStatus, PostStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'
const MAX_REPURPOSE_PER_RUN = 3

/**
 * Platform-to-platform repurpose mapping.
 * For each source platform, defines what target platforms to create.
 */
const REPURPOSE_MAP: Record<string, string[]> = {
  linkedin: ['instagram', 'stories'],
  instagram: ['linkedin', 'stories'],
  stories: [], // Stories are not repurposed further
}

/**
 * Repurpose Agent — runs at 08:10 UTC daily (after editorial + validate)
 *
 * Finds posts created today and generates adapted versions for other platforms.
 * Creates new posts, variants, and calendar slots for repurposed content.
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
      agentType: 'REPURPOSE_AGENT',
      status: AgentRunStatus.RUNNING,
      input: { trigger: 'cron', schedule: '08:10 UTC daily' },
    },
  })

  try {
    // ─── Load KB for prompt context ───
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId: WORKSPACE_ID, isActive: true },
    })
    const kb: Record<string, string> = {}
    for (const entry of kbEntries) {
      kb[`${entry.category}::${entry.key}`] = entry.value
    }

    // ─── Find today's posts that can be repurposed ───
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const sourcePosts = await prisma.post.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        createdAt: { gte: todayStart, lte: todayEnd },
        platform: { in: ['linkedin', 'instagram'] },
        status: {
          in: [
            PostStatus.AI_GENERATED,
            PostStatus.FACT_CHECKED,
            PostStatus.BRAND_APPROVED,
            PostStatus.READY_TO_SCHEDULE,
            PostStatus.SCHEDULED,
          ],
        },
      },
      include: {
        variants: { where: { isActive: true }, take: 1 },
      },
      take: MAX_REPURPOSE_PER_RUN,
    })

    if (sourcePosts.length === 0) {
      const durationMs = Date.now() - startTime
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          output: { message: 'No posts to repurpose today', repurposedCount: 0 },
          durationMs,
          completedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        repurposedCount: 0,
        message: 'No posts to repurpose today',
        durationMs,
      })
    }

    const repurposedPosts: Array<{ sourcePostId: string; targetPlatform: string; newPostId: string }> = []
    let totalTokens = 0

    for (const sourcePost of sourcePosts) {
      const activeVariant = sourcePost.variants[0]
      if (!activeVariant) continue

      const targetPlatforms = REPURPOSE_MAP[sourcePost.platform] || []

      for (const targetPlatform of targetPlatforms) {
        // Check if a repurposed version already exists for this combination
        const existingRepurpose = await prisma.post.findFirst({
          where: {
            workspaceId: WORKSPACE_ID,
            campaignId: sourcePost.campaignId,
            market: sourcePost.market,
            platform: targetPlatform,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        })

        if (existingRepurpose) continue

        // ─── Build repurpose prompt ───
        const platformRules = Object.entries(kb)
          .filter(([k]) => k.startsWith('PLATFORM_RULE::'))
          .map(([k, v]) => `- ${k.split('::')[1]}: ${v}`)
          .join('\n')

        const brandRules = Object.entries(kb)
          .filter(([k]) => k.startsWith('BRAND_RULE::'))
          .map(([k, v]) => `- ${k.split('::')[1]}: ${v}`)
          .join('\n')

        let adaptationInstruction = ''
        if (sourcePost.platform === 'linkedin' && targetPlatform === 'instagram') {
          adaptationInstruction = `Adapt this LinkedIn post into an Instagram caption:
- Make it SHORT (1-3 lines max). The photo does the work.
- Think Dezeen Instagram style.
- Remove any data-heavy content. Keep the visual hook.
- Hashtags go in the "hashtags" field, not in the caption.
- No links in caption.`
        } else if (sourcePost.platform === 'instagram' && targetPlatform === 'linkedin') {
          adaptationInstruction = `Expand this Instagram caption into a LinkedIn post:
- Add depth, context, data points if available.
- Hook on the first line (surprising fact or provocative question).
- NO link in the post body (kills reach). Link goes in firstComment.
- 4-6 short paragraphs max.
- End with a thought, not a CTA.`
        } else if (targetPlatform === 'stories') {
          adaptationInstruction = `Create 3 Instagram Stories text slides from this post:
- Each slide should be 1-2 short lines.
- Think visual-first, minimal text.
- Slide 1: Hook/attention grabber.
- Slide 2: Key fact or visual description.
- Slide 3: Subtle CTA or thought-provoking close.
Return as a single text with slides separated by "---".`
        }

        const prompt = `You are Greenmood's content adaptation specialist. Greenmood is a premium Belgian biophilic design brand.

SOURCE PLATFORM: ${sourcePost.platform}
TARGET PLATFORM: ${targetPlatform}
MARKET: ${sourcePost.market}

ORIGINAL CONTENT:
${activeVariant.text}
${activeVariant.hashtags ? `\nHASHTAGS: ${activeVariant.hashtags}` : ''}
${activeVariant.firstComment ? `\nFIRST COMMENT: ${activeVariant.firstComment}` : ''}

PLATFORM RULES:
${platformRules || '- None registered'}

BRAND RULES:
${brandRules || '- None registered'}

TASK:
${adaptationInstruction}

Respond with valid JSON only:
{
  "text": "adapted post text",
  "hashtags": "hashtags if applicable (Instagram only), or null",
  "firstComment": "first comment text if applicable (LinkedIn link, etc.), or null",
  "notes": "brief note on what was changed and why"
}`

        const aiResponse = await anthropic.messages.create({
          model: MODELS.HAIKU,
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        })

        totalTokens +=
          (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0)

        const textBlock = aiResponse.content.find((b) => b.type === 'text')
        const responseText = textBlock?.type === 'text' ? textBlock.text : '{}'

        let adapted: { text?: string; hashtags?: string | null; firstComment?: string | null; notes?: string }
        try {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
          adapted = JSON.parse(jsonMatch ? jsonMatch[1] : responseText)
        } catch {
          console.error('Failed to parse repurpose response:', responseText.substring(0, 200))
          continue
        }

        if (!adapted.text) continue

        // ─── Create new post + variant + calendar slot ───
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const newPost = await prisma.post.create({
          data: {
            workspaceId: WORKSPACE_ID,
            campaignId: sourcePost.campaignId,
            market: sourcePost.market,
            platform: targetPlatform,
            status: PostStatus.AI_GENERATED,
            variants: {
              create: {
                version: 1,
                text: adapted.text,
                hashtags: adapted.hashtags || null,
                firstComment: adapted.firstComment || null,
                notes: adapted.notes || `Repurposed from ${sourcePost.platform} post ${sourcePost.id}`,
                source: 'AI_GENERATED',
                isActive: true,
              },
            },
          },
        })

        // Create calendar slot for the next day
        await prisma.calendarSlot.create({
          data: {
            workspaceId: WORKSPACE_ID,
            campaignId: sourcePost.campaignId,
            postId: newPost.id,
            date: tomorrow,
            time: targetPlatform === 'linkedin' ? '09:00' : '12:00',
            market: sourcePost.market,
            platform: targetPlatform,
            status: 'PLANNED',
            notes: `Auto-repurposed from ${sourcePost.platform}`,
          },
        })

        // Log approval step
        await prisma.approvalStep.create({
          data: {
            postId: newPost.id,
            fromStatus: PostStatus.DRAFT,
            toStatus: PostStatus.AI_GENERATED,
            action: 'AUTO_PASS',
            comment: `Auto-repurposed from ${sourcePost.platform} post ${sourcePost.id}`,
          },
        })

        repurposedPosts.push({
          sourcePostId: sourcePost.id,
          targetPlatform,
          newPostId: newPost.id,
        })
      }
    }

    const durationMs = Date.now() - startTime

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: {
          sourcePosts: sourcePosts.length,
          repurposedCount: repurposedPosts.length,
          repurposedPosts,
        },
        tokensUsed: totalTokens,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      sourcePosts: sourcePosts.length,
      repurposedCount: repurposedPosts.length,
      repurposedPosts,
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

    console.error('Cron repurpose error:', error)
    return NextResponse.json(
      { success: false, error: errorMessage, durationMs },
      { status: 500 }
    )
  }
}
