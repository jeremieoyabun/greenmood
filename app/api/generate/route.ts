import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/ai/client'
import { buildContentPrompt } from '@/lib/ai/prompts'
import { generateContentSchema } from '@/lib/schemas/validation'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { findNextAvailableSlotDate } from '@/lib/calendar-utils'

const CONTENT_TYPE_MAP: Record<string, string> = {
  article: 'ARTICLE',
  project: 'PROJECT',
  product: 'PRODUCT',
  event: 'EVENT',
  education: 'EDUCATION',
  behind: 'BEHIND_THE_SCENES',
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const parsed = generateContentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const { brief, contentType, markets, platforms, campaignId, contentPillarId } = parsed.data
    const workspaceId = await getWorkspaceId()

    // Load knowledge base for dynamic prompt
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId, isActive: true },
    })
    const knowledgeBase: Record<string, string> = {}
    for (const entry of kbEntries) {
      knowledgeBase[`${entry.category}::${entry.key}`] = entry.value
    }

    const systemPrompt = buildContentPrompt(knowledgeBase)

    // Load recent posts to avoid duplication
    const recentPosts = await prisma.postVariant.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { text: true },
    })
    const recentCaptions = recentPosts.map(p => p.text).join('\n---\n')

    const userMessage = `TYPE: ${contentType}
BRIEF: ${brief}
MARKETS: ${markets.join(', ')}
PLATFORMS: ${platforms.join(', ')}

RECENT POSTS (do NOT repeat similar angles or topics):
${recentCaptions || 'None'}

EDITORIAL STYLE (match this exactly):
- Short, punchy captions. The photo does the work.
- Tone: like a design publication, not a sales pitch. Expert, calm, refined.
- Use 🌿 sparingly (max 1x per post). No other emojis unless data-related (📉, 🔹).
- NEVER use em dashes (—). Use periods, commas, or line breaks instead.
- Instagram: 8-12 hashtags max in #CamelCase. Hashtags at the end, no "..." separator.
- LinkedIn: NO link in post body (put in first_comment). Hook on first line. Data-driven.
- Stories: use --- to separate slides (3 slides max).

IMAGE SUGGESTIONS:
- For each post, suggest in "notes" field either:
  - A Pomelli AI prompt for product imagery (detailed, photographic style)
  - OR "Check Nextcloud for [specific photo type]" for real photos
- Priority: real photos from Nextcloud > Pomelli AI-generated

Generate content for each market × platform combination.
Respond ONLY with valid JSON.

Format:
{
  "title": "campaign title",
  "posts": {
    "marketId--platformId": {
      "text": "full post text",
      "first_comment": "link or engagement text, or null",
      "hashtags": "#Tag1 #Tag2 ... or null for LinkedIn",
      "timing": "posting time suggestion",
      "notes": "Image: [Pomelli prompt or Nextcloud reference]"
    }
  },
  "image_prompts": ["Detailed Pomelli prompt 1", "Detailed Pomelli prompt 2"],
  "stories": ["Slide 1 --- Slide 2 --- Slide 3"]
}`

    const response = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse response
    let result: any
    try {
      result = JSON.parse(textBlock.text)
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to parse AI response', raw: textBlock.text },
          { status: 500 }
        )
      }
    }

    const durationMs = Date.now() - startTime
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Create campaign + posts + variants in a transaction
    const dbContentType = CONTENT_TYPE_MAP[contentType] || 'ARTICLE'
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        title: result.title || `${contentType} — ${brief.substring(0, 50)}`,
        brief,
        contentType: dbContentType as any,
        status: 'IN_PROGRESS',
        markets,
        platforms,
        ...(contentPillarId ? { contentPillarId } : {}),
      },
    })

    // Create posts for each market × platform variant
    const postEntries = Object.entries(result.posts || {}) as [string, any][]
    const createdPosts = []

    for (const [key, postData] of postEntries) {
      const [market, platform] = key.split('--')
      if (!market || !platform) continue

      const post = await prisma.post.create({
        data: {
          workspaceId,
          campaignId: campaign.id,
          market,
          platform,
          status: 'AI_GENERATED',
          variants: {
            create: {
              version: 1,
              text: postData.text || '',
              hashtags: postData.hashtags || null,
              firstComment: postData.first_comment || null,
              timing: postData.timing || null,
              notes: postData.notes || null,
              source: 'AI_GENERATED',
            },
          },
        },
        include: { variants: true },
      })

      // Create approval step for AI generation
      await prisma.approvalStep.create({
        data: {
          postId: post.id,
          fromStatus: 'DRAFT',
          toStatus: 'AI_GENERATED',
          action: 'AUTO_PASS',
          comment: `Generated by Content Generator Agent. ${tokensUsed} tokens, ${(durationMs / 1000).toFixed(1)}s.`,
        },
      })

      createdPosts.push(post)
    }

    // Auto-schedule posts to calendar
    for (const post of createdPosts) {
      const slotDate = await findNextAvailableSlotDate(workspaceId)
      const timeByPlatform: Record<string, string> = {
        instagram: '12:00',
        linkedin: '09:00',
        stories: '08:00',
      }
      const time = timeByPlatform[post.platform] || '10:00'

      await prisma.calendarSlot.create({
        data: {
          workspaceId,
          campaignId: campaign.id,
          postId: post.id,
          date: slotDate,
          time,
          market: post.market,
          platform: post.platform,
          status: 'CONTENT_READY',
        },
      })
    }

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId,
        campaignId: campaign.id,
        agentType: 'CONTENT_GENERATOR',
        status: 'COMPLETED',
        input: { brief, contentType, markets, platforms } as any,
        output: result as any,
        tokensUsed,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        campaignId: campaign.id,
        postsCreated: createdPosts.length,
      },
    })
  } catch (error) {
    console.error('Generation error:', error)

    // Log failed run
    try {
      const wsId = await getWorkspaceId()
      await prisma.agentRun.create({
        data: {
          workspaceId: wsId,
          agentType: 'CONTENT_GENERATOR',
          status: 'FAILED',
          input: { error: 'request failed' } as any,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        },
      })
    } catch { /* ignore logging errors */ }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
