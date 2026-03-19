import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { buildContentPrompt } from '@/lib/ai/prompts'
import {
  AgentType,
  AgentRunStatus,
  PostStatus,
  CalendarStatus,
  VariantSource,
  CampaignStatus,
  ContentType,
} from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Campaign Planner Agent
 *
 * POST /api/agents/campaign
 * Body: { eventName, eventDate, market, duration }
 *
 * Plans a multi-week campaign around an event:
 * - Pre-event posts (countdown, teasers)
 * - During-event posts (live coverage)
 * - Post-event posts (recaps, highlights)
 *
 * Creates campaign, posts, variants, and calendar slots automatically.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { eventName, eventDate, market, duration } = body as {
      eventName: string
      eventDate: string
      market: string
      duration: number
    }

    if (!eventName || !eventDate || !market || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: eventName, eventDate, market, duration' },
        { status: 400 }
      )
    }

    // ─── Create agent run ───
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: AgentType.EDITORIAL_STRATEGIST,
        status: AgentRunStatus.RUNNING,
        input: { eventName, eventDate, market, duration } as any,
      },
    })

    // ─── Load KB context ───
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId: WORKSPACE_ID, isActive: true },
    })

    const knowledgeBase: Record<string, string> = {}
    for (const entry of kbEntries) {
      knowledgeBase[`${entry.category}::${entry.key}`] = entry.value
    }

    const contentPromptContext = buildContentPrompt(knowledgeBase)

    // ─── Call Claude to plan the campaign ───
    const systemPrompt = `You are a campaign strategist for Greenmood, a premium Belgian biophilic design brand.

${contentPromptContext}

You plan multi-week event campaigns with a pre/during/post structure.
Each post must be platform-appropriate and grounded in real Greenmood products and facts.
Respond ONLY with valid JSON. No markdown backticks, no preamble.`

    const eventDateObj = new Date(eventDate)
    const preEventStart = new Date(eventDateObj)
    preEventStart.setDate(preEventStart.getDate() - Math.floor(duration / 2))
    const postEventEnd = new Date(eventDateObj)
    postEventEnd.setDate(postEventEnd.getDate() + Math.ceil(duration / 2))

    const userMessage = `Plan a campaign for:
EVENT: ${eventName}
DATE: ${eventDate}
MARKET: ${market}
DURATION: ${duration} days total (split across pre/during/post event)

Pre-event window: ${preEventStart.toISOString().split('T')[0]} to ${new Date(eventDateObj.getTime() - 86400000).toISOString().split('T')[0]}
Event day: ${eventDate}
Post-event window: ${new Date(eventDateObj.getTime() + 86400000).toISOString().split('T')[0]} to ${postEventEnd.toISOString().split('T')[0]}

Create a campaign plan with posts for each phase:
- PRE-EVENT: countdown teasers, "visit us at booth X", product highlights to showcase
- DURING-EVENT: live stories, booth photos, meetings, on-site content
- POST-EVENT: recap, highlights, connections made, thank you posts

For each post specify the best platform (linkedin or instagram).

Respond with this JSON format:
{
  "campaignTitle": "string",
  "campaignBrief": "string",
  "phases": [
    {
      "phase": "pre-event" | "during-event" | "post-event",
      "posts": [
        {
          "date": "YYYY-MM-DD",
          "time": "HH:MM",
          "platform": "linkedin" | "instagram",
          "contentType": "EVENT",
          "brief": "what this post is about",
          "text": "full post caption text",
          "hashtags": "relevant hashtags",
          "firstComment": "link or null",
          "notes": "visual/creative direction"
        }
      ]
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // ─── Parse response ───
    let plan: any
    try {
      plan = JSON.parse(textBlock.text)
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse campaign plan from Claude response')
      }
    }

    // ─── Create campaign + posts + variants + calendar slots ───
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: WORKSPACE_ID,
        title: plan.campaignTitle || `${eventName} Campaign`,
        brief: plan.campaignBrief || `Campaign for ${eventName} on ${eventDate}`,
        contentType: ContentType.EVENT,
        status: CampaignStatus.IN_PROGRESS,
        markets: [market],
        platforms: ['linkedin', 'instagram'],
      },
    })

    const createdPosts: Array<{
      postId: string
      slotId: string
      phase: string
      date: string
      platform: string
      brief: string
    }> = []

    const phases = plan.phases || []
    for (const phase of phases) {
      const phasePosts = phase.posts || []
      for (const postPlan of phasePosts) {
        try {
          const result = await prisma.$transaction(async (tx) => {
            const post = await tx.post.create({
              data: {
                workspaceId: WORKSPACE_ID,
                campaignId: campaign.id,
                market,
                platform: postPlan.platform || 'linkedin',
                status: PostStatus.AI_GENERATED,
              },
            })

            await tx.postVariant.create({
              data: {
                postId: post.id,
                version: 1,
                text: postPlan.text || `[AI Draft] ${postPlan.brief}`,
                hashtags: postPlan.hashtags || null,
                firstComment: postPlan.firstComment || null,
                timing: postPlan.time || null,
                notes: postPlan.notes || postPlan.brief,
                source: VariantSource.AI_GENERATED,
              },
            })

            const calendarSlot = await tx.calendarSlot.create({
              data: {
                workspaceId: WORKSPACE_ID,
                campaignId: campaign.id,
                postId: post.id,
                date: new Date(postPlan.date),
                time: postPlan.time || '10:00',
                market,
                platform: postPlan.platform || 'linkedin',
                status: CalendarStatus.CONTENT_READY,
                notes: `[${phase.phase}] ${postPlan.brief}`,
              },
            })

            await tx.approvalStep.create({
              data: {
                postId: post.id,
                fromStatus: PostStatus.DRAFT,
                toStatus: PostStatus.AI_GENERATED,
                action: 'AUTO_PASS',
                comment: `Campaign planner: ${eventName} — ${phase.phase}`,
              },
            })

            return { postId: post.id, slotId: calendarSlot.id }
          })

          createdPosts.push({
            postId: result.postId,
            slotId: result.slotId,
            phase: phase.phase,
            date: postPlan.date,
            platform: postPlan.platform || 'linkedin',
            brief: postPlan.brief,
          })
        } catch (err) {
          console.error('Failed to create campaign post:', err)
        }
      }
    }

    const durationMs = Date.now() - startTime

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: {
          campaignId: campaign.id,
          campaignTitle: plan.campaignTitle,
          postsCreated: createdPosts.length,
          posts: createdPosts,
        } as any,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      campaignTitle: plan.campaignTitle,
      campaignBrief: plan.campaignBrief,
      postsCreated: createdPosts.length,
      posts: createdPosts,
      phases: phases.map((p: any) => ({
        phase: p.phase,
        postCount: p.posts?.length || 0,
      })),
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('Campaign planner error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Campaign planner failed',
        durationMs,
      },
      { status: 500 }
    )
  }
}
