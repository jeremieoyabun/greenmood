import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { prisma } from '@/lib/db'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function POST(req: NextRequest) {
  const { product, objective, targetAudience, market } = await req.json()

  if (!product) return NextResponse.json({ success: false, error: 'Product required' }, { status: 400 })

  // Load KB context for this product
  const kbEntries = await prisma.knowledgeBaseEntry.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      isActive: true,
      OR: [
        { key: { contains: product.toLowerCase().replace(/\s/g, '_') } },
        { category: 'BRAND_RULE' },
        { category: 'PRODUCT_FACT' },
      ],
    },
    select: { key: true, value: true },
    take: 20,
  })

  const kbContext = kbEntries.map(e => `${e.key}: ${e.value}`).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an expert Meta Ads copywriter for Greenmood, a premium biophilic design brand.

Product data:
${kbContext}

Generate ad copy for:
- Product: ${product}
- Objective: ${objective || 'leads'}
- Target audience: ${targetAudience || 'architects and interior designers'}
- Market: ${market || 'global'}

Return JSON:
{
  "headlines": ["headline1 (max 40 chars)", "headline2", "headline3"],
  "bodies": ["body1 (max 125 chars)", "body2", "body3"],
  "cta": "suggested CTA button text",
  "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"],
  "strategy": "brief strategy note"
}

Rules: No em dashes. Premium, credible tone. Use real product data. No generic marketing fluff.`,
      }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: 'CONTENT_GENERATOR',
        status: 'COMPLETED',
        input: `Ad copy for ${product}`,
        output: text.substring(0, 2000),
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    })

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
