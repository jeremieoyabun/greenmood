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

GREENMOOD VISUAL LIBRARY (Cloudinary folders — greenmood/):
PRODUCTS:
- products/g-circle — G-Circle wall feature
- products/hoverlight — Hoverlight suspended element
- products/cascade — Cascade wall installation
- products/modulor — Modulor room divider
- products/framed — Framed wall panels
- products/perspective-lines — Perspective Lines wall art
- products/moss-frames — Moss Frames
- products/rings — Rings wall feature
- products/belt — Belt wall element
- products/tail — Tail wall element
- products/planters — Planters (Mario, Cruz, Terra)
- products/g-divider — G-Divider
- products/green-walls — Green walls (Ball Moss, Reindeer Moss, Velvet Leaf, Forest)
- products/semi-natural-trees — Semi-natural trees
- products/sample-box — Sample box
- products/custom-logos — Custom moss logos

MARIO POUF COLLECTION (4 versions):
- products/pouf/mario-pouf/expanded-cork — Expanded Cork version (pure smoked, dark tone, 5.5kg)
- products/pouf/mario-pouf/compressed-cork — Compressed Cork version (100% recycled, 9kg)
- products/pouf/mario-pouf/sneaker-white — Sneaker White version (cork + white microfiber, 12kg)
- products/pouf/mario-pouf/sneaker-black — Sneaker Black version (cork + black microfiber, 10.8kg)
- products/pouf/ — General pouf gallery images

PROJECTS:
- projects/loreal-paris, projects/uc-davis, projects/cloud-ix-budapest, projects/ap-rooftop-nj, projects/ci3-yorkshire, projects/jll-brussels, projects/athora-brussels, projects/saltire-edinburgh

OTHER:
- factory/ — Bogdaniec factory, production, behind-the-scenes
- team/ — team photos
- events/neocon, events/workspace-expo, events/icff-2024 — trade shows
- showrooms/ — showroom photos
- textures/ — material textures and close-ups
- press-kit/ — press materials
- social/ — published social media assets (instagram, linkedin, stories per market)

PLATFORM DIMENSIONS:
- Instagram Feed: 1080x1080 (square) or 1080x1350 (portrait, higher engagement)
- Instagram Stories: 1080x1920 (9:16 vertical)
- Instagram Carousel: 1080x1080 or 1080x1350 (consistent across slides)
- LinkedIn Feed: 1080x1080 (square, recommended) or 1200x627 (landscape)
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
  "cloudinarySuggestion": {
    "primaryFolder": "greenmood/products/green-walls",
    "alternativeFolders": ["greenmood/projects", "greenmood/showrooms"],
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
      cloudinarySuggestion: direction.cloudinarySuggestion,
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
