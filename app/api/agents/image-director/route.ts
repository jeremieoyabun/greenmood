import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { searchAssets } from '@/lib/cloudinary'
import { getCurrentUser } from '@/lib/auth'
import { composeOverlayImage, type OverlayData } from '@/lib/image-compose'
import { AgentType, AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'
const AUTO_SELECT_ALLOWED_EMAIL = 'jeremie.kuntzinger@gmail.com'

/**
 * Image Director Agent
 *
 * POST /api/agents/image-director
 * Body: { postId?, caption?, platform?, autoSelect? }
 *
 * Default: suggests Cloudinary folder + Pomelli prompt + dimensions.
 * If autoSelect=true AND user is Jeremie: actually picks the best image
 * from Cloudinary and returns the top match + alternatives.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { postId, caption, platform, autoSelect } = body as {
      postId?: string
      caption?: string
      platform?: string
      autoSelect?: boolean
    }

    if (!postId && (!caption || !platform)) {
      return NextResponse.json(
        { error: 'Provide either postId or both caption and platform' },
        { status: 400 }
      )
    }

    // ─── Auto-select scope check (Jeremie only) ───
    let canAutoSelect = false
    if (autoSelect) {
      const user = await getCurrentUser()
      canAutoSelect = user?.email === AUTO_SELECT_ALLOWED_EMAIL
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
          autoSelect: canAutoSelect,
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

    // ─── Call Claude for visual direction ───
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

    // ─── Auto-select from Cloudinary (Jeremie only) ───
    let autoSelection: {
      status: 'selected' | 'needs_image'
      selectedImage?: { url: string; publicId: string; width: number; height: number; score: number; reason: string }
      alternatives?: Array<{ url: string; publicId: string; score: number; reason: string }>
      message?: string
    } | null = null

    let overlayResult: {
      applied: boolean
      template?: string
      url?: string
      publicId?: string
      reason?: string
    } | null = null

    if (canAutoSelect) {
      autoSelection = await autoSelectImage({
        direction,
        caption: resolvedCaption,
        platform: resolvedPlatform,
      })

      // If we selected an image, let the agent decide if it needs a text overlay
      if (autoSelection?.status === 'selected' && autoSelection.selectedImage) {
        const overlayDecision = await decideOverlay(resolvedCaption, resolvedPlatform)
        if (overlayDecision && overlayDecision.overlayData) {
          try {
            const composed = await composeOverlayImage({
              baseImageUrl: autoSelection.selectedImage.url,
              overlayData: overlayDecision.overlayData,
              width: direction.dimensions?.width || 1080,
              height: direction.dimensions?.height || 1350,
            })
            overlayResult = {
              applied: true,
              template: overlayDecision.overlayData.template,
              url: composed.url,
              publicId: composed.publicId,
              reason: overlayDecision.reason,
            }
            // Replace selected image with composed version
            autoSelection.selectedImage = {
              ...autoSelection.selectedImage,
              url: composed.url,
              publicId: composed.publicId,
            }
          } catch (err) {
            console.error('Overlay composition failed:', err)
            overlayResult = { applied: false, reason: 'composition_failed' }
          }
        } else {
          overlayResult = { applied: false, reason: overlayDecision?.reason || 'not_needed' }
        }
      }
    }

    const durationMs = Date.now() - startTime

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: { ...direction, autoSelection, overlayResult } as any,
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
      autoSelection,
      overlayResult,
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

/**
 * Fetch candidates from Cloudinary and ask Haiku to pick the best match.
 * Returns { status: 'selected', selectedImage, alternatives } or { status: 'needs_image' }.
 */
async function autoSelectImage({
  direction,
  caption,
  platform,
}: {
  direction: any
  caption: string
  platform: string
}) {
  const folders = [
    direction.cloudinarySuggestion?.primaryFolder,
    ...(direction.cloudinarySuggestion?.alternativeFolders || []),
  ].filter(Boolean) as string[]

  // ─── Gather candidates from all suggested folders ───
  const seen = new Set<string>()
  const candidates: Array<{
    url: string
    publicId: string
    width: number
    height: number
    format: string
    tags: string[]
    context: any
    folder: string
  }> = []

  for (const folder of folders.slice(0, 3)) {
    try {
      const assets = await searchAssets({ folder, maxResults: 20 })
      for (const a of assets) {
        if (seen.has(a.publicId)) continue
        if (a.format === 'mp4' || a.format === 'mov') continue // images only for now
        seen.add(a.publicId)
        candidates.push({
          url: a.url,
          publicId: a.publicId,
          width: a.width,
          height: a.height,
          format: a.format,
          tags: a.tags || [],
          context: (a as any).context || {},
          folder,
        })
      }
    } catch (err) {
      console.warn('searchAssets failed for folder:', folder, err)
    }
  }

  if (candidates.length === 0) {
    return {
      status: 'needs_image' as const,
      message: 'No images found in suggested folders. Generate via Pomelli or upload manually.',
    }
  }

  // ─── Pre-filter by aspect ratio tolerance ───
  const targetRatio = direction.dimensions?.width / direction.dimensions?.height || 1
  const scored = candidates
    .map((c) => {
      const ratio = c.width / c.height
      const ratioDistance = Math.abs(ratio - targetRatio) / targetRatio
      return { ...c, ratioDistance }
    })
    .sort((a, b) => a.ratioDistance - b.ratioDistance)
    .slice(0, 12) // top 12 by ratio match

  // ─── Ask Haiku to pick best match against caption ───
  const candidatesPrompt = scored
    .map((c, i) => {
      const tags = c.tags.slice(0, 8).join(', ') || 'no tags'
      const ctx = c.context.originalName || c.publicId.split('/').pop() || ''
      return `${i}. ${ctx} [${c.width}x${c.height}, ${c.folder}] tags: ${tags}`
    })
    .join('\n')

  const pickResponse = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 1024,
    system: `You are selecting the best stock photo match for a social media post. Reply with valid JSON only.`,
    messages: [
      {
        role: 'user',
        content: `POST CAPTION: ${caption}
PLATFORM: ${platform}
VISUAL BRIEF: ${direction.visualDirection?.mood || ''}. ${direction.cloudinarySuggestion?.notes || ''}

CANDIDATES (choose the best and 2 alternatives):
${candidatesPrompt}

Return JSON:
{
  "topPick": { "index": 0, "score": 0.92, "reason": "close-up ball moss texture matches acoustic angle" },
  "alternatives": [
    { "index": 3, "score": 0.78, "reason": "office context, but less dramatic" },
    { "index": 5, "score": 0.71, "reason": "right ratio but more decorative" }
  ]
}`,
      },
    ],
  })

  const pickText = pickResponse.content.find((b) => b.type === 'text')
  if (!pickText || pickText.type !== 'text') {
    return {
      status: 'needs_image' as const,
      message: 'Scoring model returned no response.',
    }
  }

  let pick: any
  try {
    pick = JSON.parse(pickText.text)
  } catch {
    const m = pickText.text.match(/\{[\s\S]*\}/)
    if (!m) {
      return {
        status: 'needs_image' as const,
        message: 'Could not parse scoring response.',
      }
    }
    pick = JSON.parse(m[0])
  }

  const topIdx = pick.topPick?.index
  const top = typeof topIdx === 'number' ? scored[topIdx] : null
  if (!top) {
    return {
      status: 'needs_image' as const,
      message: 'Scoring picked an invalid candidate.',
    }
  }

  const alternatives = (pick.alternatives || [])
    .map((alt: any) => {
      const c = scored[alt.index]
      if (!c) return null
      return {
        url: c.url,
        publicId: c.publicId,
        score: alt.score,
        reason: alt.reason,
      }
    })
    .filter(Boolean)
    .slice(0, 3)

  return {
    status: 'selected' as const,
    selectedImage: {
      url: top.url,
      publicId: top.publicId,
      width: top.width,
      height: top.height,
      score: pick.topPick?.score || 0,
      reason: pick.topPick?.reason || '',
    },
    alternatives,
  }
}

/**
 * Ask Claude Haiku whether this post's caption warrants a text overlay,
 * and if so which template and what data to render.
 * Returns null when nothing is parseable.
 */
async function decideOverlay(
  caption: string,
  platform: string
): Promise<{ overlayData: OverlayData | null; reason: string } | null> {
  const response = await anthropic.messages.create({
    model: MODELS.HAIKU,
    max_tokens: 800,
    system: `You decide whether a social media post needs a text overlay on its image.
Most posts do NOT need an overlay (product shots, lifestyle, project photos, generic captions).
ONLY recommend an overlay when the caption strongly fits one of these 4 templates:

- "quote": a memorable quote or declaration attributed to a person. Extract quote + attribution.
- "stat": a strong numerical claim (e.g. "NRC 0.73", "10 years lifespan", "5-11x lower cost").
- "event": an announcement of a trade show, launch, or date-specific event.
- "product": introducing a specific named product with 1-3 short specs worth highlighting as pills.

Reply ONLY with valid JSON. Use this shape:
{ "needsOverlay": true, "template": "quote", "reason": "...", "data": { ...template fields } }
OR
{ "needsOverlay": false, "reason": "standard product shot, caption doesn't need overlay" }

Template data fields:
- quote: { "quote": "...", "attribution": "Name, Title" }
- stat: { "stat": "0.73", "label": "NRC Rating", "context": "Ball Moss" }
- event: { "eventName": "...", "date": "Jun 10-12", "location": "Chicago", "cta": "Visit us at booth 42" }
- product: { "productName": "Mario Pouf", "specs": ["NRC 0.35", "Expanded Cork", "5 kg"] }`,
    messages: [
      {
        role: 'user',
        content: `CAPTION: ${caption}\nPLATFORM: ${platform}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  let parsed: any
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    const m = textBlock.text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      parsed = JSON.parse(m[0])
    } catch {
      return null
    }
  }

  if (!parsed.needsOverlay) {
    return { overlayData: null, reason: parsed.reason || 'not_needed' }
  }

  const template = parsed.template as OverlayData['template']
  if (!['quote', 'stat', 'event', 'product'].includes(template)) {
    return { overlayData: null, reason: 'invalid_template' }
  }

  return {
    overlayData: { template, ...parsed.data } as OverlayData,
    reason: parsed.reason || '',
  }
}
