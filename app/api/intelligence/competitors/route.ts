import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { name, website, country } = await req.json()

    if (!name || !website) {
      return NextResponse.json({ success: false, error: 'name and website required' }, { status: 400 })
    }

    // Create competitor
    const competitor = await prisma.competitorEntity.create({
      data: {
        name,
        website,
        country: country || 'Global',
        isActive: true,
      },
    })

    // Scan competitor website with AI
    let scanResults: any[] = []
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are the Greenmood Market Intelligence Agent. Analyze this competitor in the biophilic design / preserved moss / acoustic panels industry.

Competitor: ${name}
Website: ${website}
Country: ${country || 'Global'}

Based on your knowledge of this company (if you know them), generate 2-3 intelligence signals. For each signal, provide:
- What they're doing (products, campaigns, positioning, events, awards)
- How it matters for Greenmood (a premium preserved moss wall and cork acoustic panel brand)
- Recommended marketing action for Greenmood

Respond with JSON array:
[{
  "title": "signal title",
  "summary": "what was detected",
  "category": "competitor_move" | "trend" | "market_shift",
  "country": "${country || 'global'}",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "score": 50-95,
  "whyItMatters": "why Greenmood should care",
  "recommendedAction": "what Greenmood should do",
  "recommendedFormat": "carousel" | "reel" | "post" | "article",
  "recommendedChannel": "instagram" | "linkedin" | "both",
  "positioning": "one line about their market position"
}]

If you don't know this company, still generate 1-2 plausible signals based on the industry and their website domain. Be specific and actionable, not generic.`
        }],
      })

      const text = (response.content[0] as any).text
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        scanResults = JSON.parse(match[0])
      }

      // Update competitor positioning from scan
      if (scanResults.length > 0 && scanResults[0].positioning) {
        await prisma.competitorEntity.update({
          where: { id: competitor.id },
          data: { positioning: scanResults[0].positioning },
        })
      }

      // Create intelligence signals
      for (const signal of scanResults) {
        await prisma.intelligenceSignal.create({
          data: {
            competitorId: competitor.id,
            title: signal.title,
            summary: signal.summary,
            category: signal.category || 'competitor_move',
            country: signal.country || 'global',
            urgency: signal.urgency || 'MEDIUM',
            score: signal.score || 70,
            whyItMatters: signal.whyItMatters,
            recommendedAction: signal.recommendedAction,
            recommendedFormat: signal.recommendedFormat,
            recommendedChannel: signal.recommendedChannel,
            confidence: signal.score || 70,
            isDuplicate: false,
            detectedAt: new Date(),
          },
        })
      }

      // Log agent run
      await prisma.agentRun.create({
        data: {
          workspaceId: 'cmmvt7qrr0000tcg4mgcwdxxg',
          agentType: 'MARKET_INTELLIGENCE',
          status: 'COMPLETED',
          input: { competitor: name, website } as any,
          output: { signalsGenerated: scanResults.length, signals: scanResults } as any,
          tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          completedAt: new Date(),
        },
      })
    } catch (scanError) {
      console.error('Competitor scan failed:', scanError)
      // Competitor still created, scan just failed
    }

    return NextResponse.json({
      success: true,
      data: {
        competitor,
        signalsGenerated: scanResults.length,
      },
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Create failed' },
      { status: 500 }
    )
  }
}
