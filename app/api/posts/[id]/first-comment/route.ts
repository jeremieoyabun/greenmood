import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { text, platform, market } = await req.json()

  if (!text) {
    return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
  }

  try {
    // Get brand rules + product facts from KB
    const rules = await prisma.knowledgeBaseEntry.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        isActive: true,
        category: { in: ['BRAND_RULE', 'PLATFORM_RULE', 'PRODUCT_FACT'] },
      },
      select: { key: true, value: true },
    })

    const brandContext = rules.map(r => `${r.key}: ${r.value}`).join('\n')

    const isLinkedIn = platform === 'linkedin'

    const systemPrompt = `You are a senior social media strategist for Greenmood, a premium biophilic design brand.
You craft first comments that drive engagement and add value.

RULES:
- Never use em dashes
- Product names stay in English in all languages
- Keep the same language as the post caption
- Never invent product facts
${isLinkedIn ? `
LINKEDIN FIRST COMMENT RULES:
- The first comment MUST contain the relevant link (product page, case study, article)
- Start with a compelling hook or CTA before the link
- Add 2-3 relevant hashtags after the link
- Example format: "Discover the full case study → [link]\n\n#BiophilicDesign #Acoustics #WellBuilding"
- If you don't know the exact URL, suggest a placeholder like [greenmood.be/product-name]
` : `
INSTAGRAM FIRST COMMENT RULES:
- Links ARE clickable in Instagram comments — always include a direct link when relevant
- Engage the audience with a question or CTA
- NEVER say "link in bio" — put the actual link in the comment instead
- Keep it conversational and on-brand
- Can add extra context that didn't fit in the caption
`}

BRAND CONTEXT:
${brandContext.substring(0, 2000)}`

    const userPrompt = `Here is the post caption for ${platform || 'instagram'} (market: ${market || 'hq'}):

"${text}"

Generate 2 first comment suggestions. Each should be different in approach:
1. Engagement-focused (question or CTA)
2. ${isLinkedIn ? 'Link-focused with relevant URL placeholder and hashtags' : 'Value-add (extra context, behind-the-scenes, or educational angle)'}

Return ONLY valid JSON: { "suggestions": [{ "text": "...", "approach": "..." }, { "text": "...", "approach": "..." }] }`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''

    let suggestions: Array<{ text: string; approach: string }> = []
    const jsonMatch = responseText.match(/\{[\s\S]*"suggestions"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        suggestions = parsed.suggestions || []
      } catch {
        suggestions = [{ text: responseText, approach: 'Raw' }]
      }
    }

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: 'CONTENT_GENERATOR',
        status: 'COMPLETED',
        input: `First comment suggestion | Platform: ${platform} | Caption: ${text.substring(0, 100)}`,
        output: JSON.stringify(suggestions).substring(0, 2000),
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        durationMs: 0,
      },
    })

    return NextResponse.json({ success: true, data: { suggestions } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
