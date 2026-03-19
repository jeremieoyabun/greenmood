import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * Greenmood Product Taxonomy — the AI uses this to identify products in images
 */
const PRODUCT_TAXONOMY = {
  // Acoustic Green Walls
  'ball-moss': {
    names: ['Ball Moss', 'Boule de mousse'],
    visual: 'Round, bulbous preserved moss clusters, deep green, 3D spherical texture, looks like broccoli or cauliflower shapes',
    category: 'acoustic-green-wall',
  },
  'reindeer-moss': {
    names: ['Reindeer Moss', 'Lichen', 'Mousse de renne'],
    visual: 'Flat, coral-like branching structure, soft fluffy texture, available in multiple colors (green, white, blue, pink, yellow)',
    category: 'acoustic-green-wall',
  },
  'velvet-leaf': {
    names: ['Velvet Leaf'],
    visual: 'Dense flat preserved leaves, dark green, smooth velvety carpet-like texture, uniform coverage',
    category: 'acoustic-green-wall',
  },
  'forest': {
    names: ['Forest', 'Forest Mix'],
    visual: 'Mix of different preserved plants, ferns, leaves, grasses, branches. Wild garden/forest look, multiple textures and colors (green, brown, earth tones)',
    category: 'acoustic-green-wall',
  },
  // Acoustic Cork Walls
  'cork-brickx': {
    names: ['Cork Tiles Brickx', 'Brickx'],
    visual: '3D cork tiles arranged in brick-like staggered pattern, protruding rectangular blocks, natural cork brown color, designed by Alain Gilles',
    category: 'acoustic-cork-wall',
  },
  'cork-parenthese': {
    names: ['Cork Tiles Parenthèse', 'Parenthèse', 'Parenthese'],
    visual: 'Cork tiles with alternating light and dark horizontal stripes, checkerboard-like pattern, flat surface, designed by Alain Gilles',
    category: 'acoustic-cork-wall',
  },
  'cork-sillon': {
    names: ['Cork Tiles Sillon', 'Sillon'],
    visual: 'Cork tiles with deep grooved linear patterns in alternating directions (horizontal/vertical), dark brown cork, geometric grid, designed by Alain Gilles',
    category: 'acoustic-cork-wall',
  },
  'cork-morse': {
    names: ['Cork Tiles Morse', 'Morse'],
    visual: 'Cork tiles in elongated brick shapes, multi-colored (grey, brown, orange accents), stacked horizontally, looks like colored brickwork, designed by Alain Gilles',
    category: 'acoustic-cork-wall',
  },
  // Design Collection
  'g-circle': {
    names: ['G-Circle'],
    visual: 'Circular wall-mounted or suspended moss panel with metal frame ring. Available in various sizes and frame colors (gold, black, white, corten). Filled with Ball Moss, Reindeer Moss, or Forest. Designed by Alain Gilles',
    category: 'design-collection',
  },
  'hoverlight': {
    names: ['Hoverlight'],
    visual: 'Horizontal suspended biophilic luminaire/pendant light with preserved plants hanging down from a metal bar with integrated LED lighting. Designed by Cas Moor',
    category: 'design-collection',
  },
  'cascade': {
    names: ['Cascade'],
    visual: 'Suspended modular system with preserved plants cascading downward from red/colored stems. Vertical hanging installation. Designed by Alain Gilles',
    category: 'design-collection',
  },
  'modulor': {
    names: ['Modulor'],
    visual: 'Mobile room divider on wheels filled with preserved moss. Available in straight, half-arch, and full arch shapes. Metal frame with moss fill. Designed by Alain Gilles',
    category: 'design-collection',
  },
  'framed': {
    names: ['Framed', 'Framed2'],
    visual: 'Rectangular framed panels with geometric patterns made of different colored moss/felt/cork sections. Abstract art-like compositions. Wall-mounted',
    category: 'design-collection',
  },
  'rings': {
    names: ['Rings'],
    visual: 'Circular metal ring with moss filling on one side, creating a 3D sculptural element. Wall-mounted or suspended. Asymmetric moss placement within the ring',
    category: 'design-collection',
  },
  'belt': {
    names: ['Belt'],
    visual: 'Circular moss panel suspended by a leather or fabric strap/belt from a wooden peg. Rustic-modern aesthetic. Wall-mounted',
    category: 'design-collection',
  },
  'tail': {
    names: ['Tail'],
    visual: 'Circular moss panel with a horizontal metal arm extending to one side, creating an asymmetric tail-like silhouette. Minimal, sculptural',
    category: 'design-collection',
  },
  'perspective-lines': {
    names: ['Perspective Lines'],
    visual: 'Vertical hanging panel/curtain of preserved plants creating depth and perspective. Multiple layers of greenery',
    category: 'design-collection',
  },
  'moss-frames': {
    names: ['Moss Frames'],
    visual: 'Simple rectangular wooden frames filled with moss. Various sizes, typically ball moss or reindeer moss. Wall-mounted art pieces',
    category: 'design-collection',
  },
  'g-divider': {
    names: ['G-Divider'],
    visual: 'Tall free-standing room divider with metal frame structure filled with preserved moss/plants. Floor-to-ceiling or partial height. Transparent metal structure',
    category: 'design-collection',
  },
  'planters': {
    names: ['Mario Planters', 'Cruz Planters', 'Terra Planters', 'Planters'],
    visual: 'Ceramic or cork planters with preserved plant fillings. Various shapes (cylindrical, conical). Neutral colors (beige, grey, terracotta)',
    category: 'design-collection',
  },
  'pouf': {
    names: ['Mario Pouf', 'Terra Pouf', 'Pouf'],
    visual: 'Round or cylindrical seating poufs made from expanded cork. Natural cork texture, warm brown tones. Can have preserved plant on top',
    category: 'design-collection',
  },
  // Other
  'semi-natural-trees': {
    names: ['Semi-natural Trees'],
    visual: 'Full-size indoor trees with real trunk and preserved foliage canopy. Tall, realistic-looking. Used in lobbies and atriums',
    category: 'custom-solutions',
  },
  'custom-logos': {
    names: ['Green Logos', 'Custom Logos'],
    visual: 'Company logos or text shapes made from preserved moss mounted on walls. Brand signage in greenery',
    category: 'custom-solutions',
  },
  'planter-fillings': {
    names: ['Planter Fillings', 'Tailored Planter Fillings'],
    visual: 'Mixed preserved plants arranged in planters or containers. Custom compositions with various plant types',
    category: 'custom-solutions',
  },
}

/**
 * Analyze an image and detect Greenmood products using Claude Vision
 */
export async function detectProducts(imageUrl: string): Promise<{
  products: Array<{
    id: string
    name: string
    confidence: number
    category: string
  }>
  tags: string[]
  description: string
  mossType?: string
  setting?: string
}> {
  const taxonomyDesc = Object.entries(PRODUCT_TAXONOMY)
    .map(([id, p]) => `- ${id}: ${p.names[0]} — ${p.visual}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: `You are a Greenmood product expert. Analyze this image and identify any Greenmood biophilic design products.

PRODUCT CATALOG:
${taxonomyDesc}

Respond in JSON only:
{
  "products": [{ "id": "product-id", "name": "Product Name", "confidence": 0.95 }],
  "mossType": "ball-moss|reindeer-moss|velvet-leaf|forest|cork|none",
  "setting": "office|hotel|restaurant|showroom|factory|residential|outdoor|studio",
  "description": "Brief description of what's in the image",
  "suggestedTags": ["tag1", "tag2"]
}

If no Greenmood products are visible, return empty products array. Be precise — don't guess.`,
        },
      ],
    }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return { products: [], tags: [], description: 'Unable to analyze' }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const products = (parsed.products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      confidence: p.confidence || 0.5,
      category: PRODUCT_TAXONOMY[p.id as keyof typeof PRODUCT_TAXONOMY]?.category || 'unknown',
    }))

    const tags = [
      ...(parsed.suggestedTags || []),
      ...products.map((p: any) => p.id),
      ...(parsed.mossType && parsed.mossType !== 'none' ? [parsed.mossType] : []),
      ...(parsed.setting ? [parsed.setting] : []),
      'greenmood',
    ]

    return {
      products,
      tags: [...new Set(tags)],
      description: parsed.description || '',
      mossType: parsed.mossType,
      setting: parsed.setting,
    }
  } catch {
    return { products: [], tags: ['greenmood'], description: text.substring(0, 200) }
  }
}

/**
 * Get suggested folder based on detected products
 */
export function suggestFolder(products: Array<{ id: string; category: string }>): string {
  if (products.length === 0) return 'greenmood/social/instagram'

  const main = products[0]
  const folderMap: Record<string, string> = {
    'ball-moss': 'greenmood/products/ball-moss',
    'reindeer-moss': 'greenmood/products/green-walls',
    'velvet-leaf': 'greenmood/products/green-walls',
    'forest': 'greenmood/products/green-walls',
    'cork-brickx': 'greenmood/products/cork-tiles',
    'cork-parenthese': 'greenmood/products/cork-tiles',
    'cork-sillon': 'greenmood/products/cork-tiles',
    'cork-morse': 'greenmood/products/cork-tiles',
    'g-circle': 'greenmood/products/g-circle',
    'hoverlight': 'greenmood/products/hoverlight',
    'cascade': 'greenmood/products/cascade',
    'modulor': 'greenmood/products/modulor',
    'framed': 'greenmood/products/framed',
    'rings': 'greenmood/products/rings',
    'belt': 'greenmood/products/belt',
    'tail': 'greenmood/products/tail',
    'perspective-lines': 'greenmood/products/perspective-lines',
    'moss-frames': 'greenmood/products/moss-frames',
    'g-divider': 'greenmood/products/g-divider',
    'planters': 'greenmood/products/planters',
    'pouf': 'greenmood/products/pouf',
    'semi-natural-trees': 'greenmood/products/semi-natural-trees',
    'custom-logos': 'greenmood/products/custom-logos',
    'planter-fillings': 'greenmood/products/planters',
  }

  return folderMap[main.id] || 'greenmood/products/green-walls'
}
