import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MarketIntelligenceAgent } from '@/agents'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

const COMPETITORS = [
  'MOSS UK',
  'Nordgröna',
  'Quiet Earth Moss',
  'GrowUp Greenwalls',
  'MoosMoos',
  'Freund Moosmanufaktur',
  'Polarmoss',
  'Verdissimo',
  'StyleGreen',
  'Benetti Moss',
]

const FOCUS_TOPICS = [
  'biophilic design',
  'moss walls',
  'cork acoustics',
  'workplace wellness',
  'preserved plants',
  'acoustic panels',
  'WELL Building Standard',
  'LEED certification',
  'sustainable interiors',
]

/**
 * Weekly Intelligence Scraper — runs every Monday at 06:00 UTC
 *
 * Uses the MarketIntelligenceAgent to generate structured intelligence signals
 * about the biophilic design market, competitors, and trends.
 * Stores signals in the intelligence_signals table.
 */
export async function GET(req: NextRequest) {
  // ─── Auth check ───
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()

  try {
    // Run the market intelligence agent
    const agent = new MarketIntelligenceAgent()
    const result = await agent.run({
      workspaceId: WORKSPACE_ID,
      triggeredBy: undefined,
      payload: {
        focusTopics: FOCUS_TOPICS,
        focusCompetitors: COMPETITORS,
        focusCountries: ['Belgium', 'USA', 'UK', 'France', 'UAE', 'Poland', 'South Korea', 'Germany'],
        digestType: 'weekly',
      },
    })

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.errors?.[0] || 'Intelligence agent failed',
        durationMs: Date.now() - startTime,
      }, { status: 500 })
    }

    // Extract signals from agent output — handle rawResponse wrapping
    let signals: any[] = []
    const data = result.data as any
    if (data.signals) {
      signals = data.signals
    } else if (data.rawResponse) {
      // Parse JSON from rawResponse (may be wrapped in ```json blocks)
      const raw = data.rawResponse
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
      try {
        const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : raw)
        signals = parsed.signals || []
      } catch { /* parsing failed */ }
    }
    const storedSignals: string[] = []

    // Look up competitor entities for linking
    const competitorEntities = await prisma.competitorEntity.findMany({
      where: { isActive: true },
    })
    const competitorMap = new Map(
      competitorEntities.map((c) => [c.name.toLowerCase(), c.id])
    )

    for (const signal of signals) {
      try {
        // Calculate score from confidence + urgency
        const confidenceMap: Record<string, number> = { high: 3, medium: 2, low: 1 }
        const urgencyMap: Record<string, number> = { act_now: 4, this_week: 3, this_month: 2, monitor: 1 }
        const confidenceScore = confidenceMap[signal.confidence as string] || 1
        const urgencyScore = urgencyMap[signal.urgency as string] || 1
        const score = (confidenceScore * urgencyScore) / 4 // Normalize 0-3

        // Link to competitor entity if found
        const competitorId = signal.competitor
          ? competitorMap.get(signal.competitor.toLowerCase()) || null
          : null

        const created = await prisma.intelligenceSignal.create({
          data: {
            title: signal.title || 'Untitled signal',
            category: signal.category || 'trend',
            country: signal.country || null,
            summary: signal.summary || '',
            whyItMatters: signal.whyItMatters || '',
            confidence: signal.confidence || 'medium',
            urgency: signal.urgency || 'monitor',
            recommendedAction: signal.recommendedAction || '',
            recommendedFormat: signal.recommendedFormat || null,
            recommendedChannel: signal.recommendedChannel || null,
            score,
            competitorId,
            expiresAt: signal.urgency === 'act_now'
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)   // 3 days
              : signal.urgency === 'this_week'
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)   // 7 days
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        })

        storedSignals.push(created.id)
      } catch (err) {
        console.error('Failed to store signal:', signal.title, err)
      }
    }

    // Store digest summary if available
    const digest = (result.data as any).digest
    if (digest && storedSignals.length > 0) {
      await prisma.intelligenceDigest.create({
        data: {
          type: 'weekly',
          period: new Date().toISOString().split('T')[0],
          content: digest as any,
          signalIds: storedSignals,
        },
      })
    }

    return NextResponse.json({
      success: true,
      signalsGenerated: signals.length,
      signalsStored: storedSignals.length,
      signalIds: storedSignals,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Cron intelligence error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Intelligence cron failed',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
