import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function POST(req: NextRequest) {
  try {
    const { signalId, title, summary, whyItMatters, recommendedAction, recommendedFormat, recommendedChannel, country } = await req.json()

    if (!title) {
      return NextResponse.json({ success: false, error: 'title required' }, { status: 400 })
    }

    // Load brand rules and product facts for grounding
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId: WORKSPACE_ID, isActive: true, category: { in: ['BRAND_RULE', 'PRODUCT_FACT', 'RESTRICTED_CLAIM', 'PLATFORM_RULE'] } },
      take: 50,
    })
    const brandRules = kbEntries.filter(e => e.category === 'BRAND_RULE').map(e => `- ${e.value}`).join('\n')
    const platformRules = kbEntries.filter(e => e.category === 'PLATFORM_RULE').map(e => `- ${e.value}`).join('\n')
    const restricted = kbEntries.filter(e => e.category === 'RESTRICTED_CLAIM').map(e => `- ${e.value}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are the Greenmood Content Orchestrator. Generate 2 social media post proposals inspired by this intelligence signal.

SIGNAL:
- Title: ${title}
- Summary: ${summary}
- Why it matters: ${whyItMatters}
- Recommended action: ${recommendedAction}
- Suggested format: ${recommendedFormat || 'any'}
- Suggested channel: ${recommendedChannel || 'instagram + linkedin'}
- Region: ${country || 'global'}

GREENMOOD: Premium biophilic design brand. Preserved moss walls, cork acoustic panels (by Alain Gilles), design collection. Founded 2014, Brussels. Handcrafted in Europe. NRC 0.73 Ball Moss. B-S2-d0 fire rating. WELL v2 + LEED v5 compatible.

BRAND RULES:
${brandRules.substring(0, 2000)}

PLATFORM RULES:
${platformRules.substring(0, 1000)}

NEVER DO:
${restricted.substring(0, 500)}
- Never use em dashes
- Never invent technical facts
- Never use generic marketing hype

Generate exactly 2 posts:
1. An Instagram post (short caption, photo-first, the image does the work)
2. A LinkedIn post (longer, data-driven, thought leadership, NO link in body)

For Instagram: captions should be 1-3 lines MAX. Like a design publication, not a sales pitch. Examples of good IG captions: "Quiet never looked this good." / "Cork. Foam. Side by side." / "Forest Mix. Dubai."

For LinkedIn: hook on first line (data or provocative statement), then 3-5 paragraphs, end with a thought-provoking question. Link goes in first comment.

Respond with JSON:
{
  "posts": [
    {
      "platform": "instagram",
      "market": "hq",
      "format": "post" | "carousel" | "reel",
      "caption": "the caption",
      "hashtags": "...\\n#tag1 #tag2 ... (20 hashtags, lowercase)",
      "firstComment": null,
      "visualDirection": "what the photo/visual should show"
    },
    {
      "platform": "linkedin",
      "market": "hq",
      "format": "post",
      "caption": "the full linkedin post",
      "hashtags": null,
      "firstComment": "link or additional context here",
      "visualDirection": "what image to use"
    }
  ]
}`
      }],
    })

    const text = (response.content[0] as any).text
    let result
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
      else return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: 'CONTENT_GENERATOR',
        status: 'COMPLETED',
        input: { signalId, title, summary } as any,
        output: result as any,
        tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate posts from signal error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
