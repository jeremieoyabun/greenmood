import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { AgentType, AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Image Director Agent
 *
 * POST /api/agents/image-director
 * Body: { postId } or { caption, platform }
 *
 * Suggests visual direction for a post:
 * - Which Nextcloud folder/image type to look for
 * - A Pomelli AI image generation prompt
 * - Recommended dimensions per platform
 * - Visual direction notes (lighting, angle, mood)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { postId, caption, platform } = body as {
      postId?: string
      caption?: string
      platform?: string
    }

    if (!postId && (!caption || !platform)) {
      return NextResponse.json(
        { error: 'Provide either postId or both caption and platform' },
        { status: 400 }
      )
    }

    // ─── Resolve source content ───
    let resolvedCaption = caption || ''
    let resolvedPlatform = platform || ''
    let resolvedMarket = ''

    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      const variant = post.variants[0]
      if (variant) {
        resolvedCaption = variant.text
      }
      resolvedPlatform = post.platform
      resolvedMarket = post.market
    }

    // ─── Create agent run ───
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: AgentType.VISUAL_BUILDER,
        status: AgentRunStatus.RUNNING,
        input: {
          postId: postId || null,
          caption: resolvedCaption,
          platform: resolvedPlatform,
        } as any,
      },
    })

    // ─── Load KB for product context ───
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        isActive: true,
        category: { in: ['PRODUCT_FACT', 'BRAND_RULE', 'COLOR_PALETTE'] },
      },
    })

    const kbContext = kbEntries
      .map((e) => `- ${e.category}/${e.key}: ${e.value}`)
      .join('\n')

    // ─── Call Claude ───
    const systemPrompt = `You are the visual director for Greenmood, a premium Belgian biophilic design brand.

BRAND CONTEXT:
${kbContext}

GREENMOOD PRODUCT VISUAL LIBRARY (Nextcloud folders):
- /Products/Ball Moss — ball moss wall installations, close-ups, textures
- /Products/Reindeer Moss — flat reindeer moss panels, color variations
- /Products/Velvet Leaf — velvet leaf close-ups, installations
- /Products/Forest — forest moss arrangements, natural textures
- /Products/Cork Tiles — Alain Gilles designed cork panels (Parenthèse, Sillon, Brickx, Morse)
- /Design Collection — G-Circle, Hoverlight, Cascade, Rings, Pouf, Planters, Modulor, Framed, Perspective Lines
- /Projects — real installation photos by project name
- /Factory — Bogdaniec factory, production, behind-the-scenes
- /Team — team photos, events, trade shows
- /Lifestyle — mood shots, biophilic interiors, nature details
- /Events — trade show booths, NeoCon, Maison&Objet, Stockholm Furniture Fair

PLATFORM DIMENSIONS:
- Instagram Feed: 1080x1080 (square) or 1080x1350 (portrait, higher engagement)
- Instagram Stories: 1080x1920 (9:16 vertical)
- Instagram Carousel: 1080x1080 or 1080x1350 (consistent across slides)
- LinkedIn Feed: 1200x627 (landscape) or 1080x1080 (square)
- LinkedIn Article: 1200x627 (landscape header)

VISUAL STYLE:
- Clean, minimal, architectural photography aesthetic
- Natural lighting preferred, warm tones
- Negative space for text overlays when needed
- Premium, editorial feel — think Dezeen or Wallpaper*
- Show products in real architectural contexts, not isolated

Respond ONLY with valid JSON. No markdown backticks, no preamble.`

    const userMessage = `Suggest visual direction for this post:

CAPTION: ${resolvedCaption}
PLATFORM: ${resolvedPlatform}
${resolvedMarket ? `MARKET: ${resolvedMarket}` : ''}

Respond with this JSON format:
{
  "nextcloudSuggestion": {
    "primaryFolder": "/Products/Ball Moss",
    "alternativeFolders": ["/Projects", "/Lifestyle"],
    "searchTerms": ["ball moss", "office installation", "acoustic"],
    "notes": "Look for close-up texture shots showing NRC acoustic properties"
  },
  "pomelliPrompt": "Detailed AI image generation prompt: a premium architectural interior featuring Greenmood preserved ball moss wall panels in a modern office space, natural daylight streaming through floor-to-ceiling windows, minimalist Scandinavian furniture, warm oak flooring, shot at eye level with shallow depth of field, editorial photography style, Hasselblad quality, 4K",
  "dimensions": {
    "width": 1080,
    "height": 1350,
    "aspectRatio": "4:5",
    "format": "portrait"
  },
  "visualDirection": {
    "mood": "calm, premium, architecturally credible",
    "lighting": "natural daylight, warm tones",
    "angle": "eye level or slightly elevated",
    "composition": "rule of thirds, product as focal point with architectural context",
    "colorPalette": ["#2D5016", "#A8C49A", "#F5F0E8", "#8B7355"],
    "doNot": ["stock photo feel", "oversaturated colors", "isolated product on white background"],
    "reference": "Dezeen project photography style"
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
    let direction: any
    try {
      direction = JSON.parse(textBlock.text)
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        direction = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse image direction from Claude response')
      }
    }

    const durationMs = Date.now() - startTime

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: direction as any,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      nextcloudSuggestion: direction.nextcloudSuggestion,
      pomelliPrompt: direction.pomelliPrompt,
      dimensions: direction.dimensions,
      visualDirection: direction.visualDirection,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('Image director error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Image director failed',
        durationMs,
      },
      { status: 500 }
    )
  }
}
