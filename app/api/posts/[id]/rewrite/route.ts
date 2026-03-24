import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { instruction, text, platform, market } = await req.json()

  if (!text) {
    return NextResponse.json({ success: false, error: 'text required' }, { status: 400 })
  }

  try {
    // Get brand rules from KB
    const rules = await prisma.knowledgeBaseEntry.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        isActive: true,
        category: { in: ['BRAND_RULE', 'RESTRICTED_CLAIM', 'PLATFORM_RULE'] },
      },
      select: { key: true, value: true },
    })

    const brandContext = rules.map(r => `${r.key}: ${r.value}`).join('\n')

    const systemPrompt = `You are a senior copywriter for Greenmood, a premium biophilic design brand.
You write short, design-literate, architecturally credible copy. Never generic marketing speak.
The photo does the work. Captions add context, not filler.
Style references: Dezeen, Wallpaper*, Monocle.

RULES:
- Never use em dashes
- Never invent product facts
- NEVER invent URLs. greenmood.com DOES NOT EXIST. Use [INSERT LINK] as placeholder
- Product names stay in English in all languages
- Instagram: short, punchy, photo-first
- LinkedIn: data-driven, thought leadership, NO link in post body
- Keep the same language as the original text

BRAND CONTEXT:
${brandContext.substring(0, 2000)}`

    const userPrompt = instruction
      ? `Here is the current caption for a ${platform || 'instagram'} post (market: ${market || 'hq'}):\n\n"${text}"\n\nInstruction: ${instruction}\n\nProvide 2 alternative versions. Return JSON: { "versions": [{ "text": "...", "reasoning": "..." }, { "text": "...", "reasoning": "..." }] }`
      : `Here is the current caption for a ${platform || 'instagram'} post (market: ${market || 'hq'}):\n\n"${text}"\n\nPropose 2 alternative versions:\n1. A shorter, punchier version\n2. A version with a different angle or hook\n\nReturn JSON: { "versions": [{ "text": "...", "reasoning": "..." }, { "text": "...", "reasoning": "..." }] }`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    let versions: Array<{ text: string; reasoning: string }> = []
    const jsonMatch = responseText.match(/\{[\s\S]*"versions"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        versions = parsed.versions || []
      } catch {
        versions = [{ text: responseText, reasoning: 'Raw response' }]
      }
    }

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: 'CONTENT_GENERATOR',
        status: 'COMPLETED',
        input: `Rewrite: ${instruction || 'propose alternatives'} | Original: ${text.substring(0, 100)}`,
        output: JSON.stringify(versions).substring(0, 2000),
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        durationMs: 0,
      },
    })

    return NextResponse.json({ success: true, data: { versions } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Rewrite failed' },
      { status: 500 }
    )
  }
}
