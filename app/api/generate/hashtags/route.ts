import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { text, platform } = await req.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
    }

    const isInstagram = platform === 'instagram' || platform === 'stories'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Generate ${isInstagram ? '20' : '5'} relevant hashtags for this ${platform || 'social media'} post by Greenmood, a premium biophilic design brand (preserved moss walls, cork acoustic panels, design collection).

Post caption:
${text}

Rules:
- All lowercase
- No em dashes
- Include #greenmood
- For Instagram: 20 hashtags, mix of niche (#preservedmoss, #acousticdesign) and broader (#interiordesign, #sustainabledesign)
- For LinkedIn: 3-5 hashtags only, professional tone
- Relevant to biophilic design, architecture, acoustics, sustainability
- Return ONLY the hashtags, separated by spaces, starting with ...\\n`
      }],
    })

    const hashtags = (message.content[0] as any).text?.trim() || ''

    return NextResponse.json({ success: true, data: { hashtags } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
