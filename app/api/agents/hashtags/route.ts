import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { AgentType, AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Hashtag Optimizer Agent
 *
 * POST /api/agents/hashtags
 * Body: { text, platform, market }
 *
 * Generates 3 sets of hashtags (broad reach, niche targeted, branded)
 * plus a recommended best mix of 20 hashtags.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { text, platform, market } = body as {
      text: string
      platform: string
      market: string
    }

    if (!text || !platform || !market) {
      return NextResponse.json(
        { error: 'Missing required fields: text, platform, market' },
        { status: 400 }
      )
    }

    // ─── Create agent run ───
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: AgentType.CHANNEL_ADAPTER,
        status: AgentRunStatus.RUNNING,
        input: { text, platform, market } as any,
      },
    })

    // ─── Load KB for brand/platform context ───
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        isActive: true,
        category: { in: ['BRAND_RULE', 'PLATFORM_RULE', 'PRODUCT_FACT'] },
      },
    })

    const kbContext = kbEntries
      .map((e) => `- ${e.category}/${e.key}: ${e.value}`)
      .join('\n')

    // ─── Call Claude ───
    const systemPrompt = `You are a hashtag strategist for Greenmood, a premium Belgian biophilic design brand.

BRAND CONTEXT:
${kbContext}

GREENMOOD BRANDED HASHTAGS (always available):
#greenmood #greenmooddesign #designedbynature #biophilicdesign #preservedmoss #mosswalls #corkdesign #naturalinteriors

You generate optimized hashtag sets for social media posts.
You understand hashtag strategy: mixing high-volume discovery hashtags with niche targeted ones and branded community hashtags.

RULES:
- Instagram: up to 20 hashtags total recommended
- LinkedIn: 3-5 hashtags max (less is more)
- All hashtags lowercase, no spaces
- No banned or spammy hashtags
- Include industry-specific hashtags (architecture, interior design, acoustics, sustainability)
- Adapt to market language where appropriate (e.g., French hashtags for FR market)

Respond ONLY with valid JSON. No markdown backticks, no preamble.`

    const userMessage = `Generate optimized hashtag sets for this post:

TEXT: ${text}
PLATFORM: ${platform}
MARKET: ${market}

Respond with this JSON format:
{
  "setA": {
    "label": "Broad Reach",
    "description": "High-volume discovery hashtags",
    "hashtags": ["#hashtag1", "#hashtag2", "...15-20 hashtags"]
  },
  "setB": {
    "label": "Niche Targeted",
    "description": "Low competition, high relevance hashtags",
    "hashtags": ["#hashtag1", "#hashtag2", "...15-20 hashtags"]
  },
  "setC": {
    "label": "Branded & Community",
    "description": "Greenmood branded + design community hashtags",
    "hashtags": ["#hashtag1", "#hashtag2", "...15-20 hashtags"]
  },
  "recommended": {
    "label": "Recommended Mix",
    "description": "Best combination of A+B+C for maximum impact",
    "hashtags": ["#hashtag1", "#hashtag2", "...exactly 20 hashtags"],
    "strategy": "Brief explanation of why this mix works"
  }
}`

    const response = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // ─── Parse response ───
    let hashtagSets: any
    try {
      hashtagSets = JSON.parse(textBlock.text)
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        hashtagSets = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse hashtag sets from Claude response')
      }
    }

    const durationMs = Date.now() - startTime

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: hashtagSets as any,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      setA: hashtagSets.setA,
      setB: hashtagSets.setB,
      setC: hashtagSets.setC,
      recommended: hashtagSets.recommended,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('Hashtag optimizer error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Hashtag optimizer failed',
        durationMs,
      },
      { status: 500 }
    )
  }
}
