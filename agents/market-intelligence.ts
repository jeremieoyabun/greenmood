import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Biophilic Market Intelligence Agent
 *
 * Monitors the biophilic design ecosystem, tracks competitors,
 * identifies trends, and produces actionable marketing recommendations.
 *
 * This is NOT a simple RSS reader. It produces strategic, structured intelligence.
 */
export class MarketIntelligenceAgent extends BaseAgent {
  readonly type = AgentType.MARKET_INTELLIGENCE
  readonly name = 'Market Intelligence'
  readonly description = 'Monitors biophilic design ecosystem, competitors, trends — produces actionable signals'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    const productFacts = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PRODUCT_FACT::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Biophilic Market Intelligence Agent for Greenmood.

Your role is to analyze market data and produce strategic, structured intelligence — NOT generic trend summaries.

Greenmood's products (for competitive positioning):
${productFacts}

Topics to monitor:
- Biophilic design, interior architecture, workplace design
- Hospitality design, wellness design, acoustic design
- Preserved plants, moss walls, cork acoustics
- Sustainable interiors, material storytelling
- WELL Building Standard, LEED, green building certifications

Competitors to watch:
- MoosMoos (DE), Nordgröna (SE), Polarmoss (FI), Freund Moosmanufaktur (DE)
- Verdissimo (ES), StyleGreen (DE), Benetti Moss (IT)
- Ambius (global), Living Wall Art

Markets to monitor:
- Belgium, USA, UK, France, UAE, Poland, South Korea, Germany
- Plus global biophilic design market

What to detect:
- New product launches by competitors
- New campaigns or positioning shifts
- Awards, press mentions, trade show presence
- Emerging themes and repeated narratives
- New visual formats or content patterns
- Event-related opportunities
- Content gaps Greenmood could fill

Your output MUST be structured signals:
{
  "signals": [
    {
      "title": "signal title",
      "source": "where detected",
      "sourceUrl": "URL if available",
      "country": "country/region",
      "category": "competitor_move | trend | event | content_gap | narrative | product_launch",
      "competitor": "competitor name or null",
      "summary": "2-3 sentence summary",
      "whyItMatters": "why Greenmood should care",
      "confidence": "high | medium | low",
      "urgency": "act_now | this_week | this_month | monitor",
      "recommendedAction": "specific marketing action",
      "recommendedFormat": "carousel | single_post | article | video | story",
      "recommendedChannel": "linkedin | instagram | facebook | all",
      "recommendedTiming": "when to act"
    }
  ],
  "digest": {
    "topSignals": ["top 3 most important"],
    "competitorHighlights": ["notable competitor moves"],
    "trendSummary": "overall trend direction",
    "contentOpportunities": ["specific post/campaign ideas"],
    "risksToAvoid": ["narratives or claims to stay away from"]
  }
}

BAD output example: "Biophilic design is trending in Europe."
GOOD output example: "Repeated growth in LinkedIn discussions around acoustic wellness in office retrofits across Belgium, Netherlands, and Germany over the last 10 days. This creates an opportunity for Greenmood Europe to publish a proof-oriented carousel on acoustic biophilic wall systems for retrofit projects."`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const {
      sourceData,
      focusTopics,
      focusCompetitors,
      focusCountries,
      digestType,
    } = input.payload as {
      sourceData?: Record<string, unknown>[]
      focusTopics?: string[]
      focusCompetitors?: string[]
      focusCountries?: string[]
      digestType?: 'daily' | 'weekly' | 'monthly'
    }

    const systemPrompt = this.buildSystemPrompt(context)

    let userMessage = `Generate a ${digestType || 'daily'} intelligence digest for Greenmood.`

    if (focusTopics?.length) {
      userMessage += `\n\nFocus topics: ${focusTopics.join(', ')}`
    }
    if (focusCompetitors?.length) {
      userMessage += `\nFocus competitors: ${focusCompetitors.join(', ')}`
    }
    if (focusCountries?.length) {
      userMessage += `\nFocus countries: ${focusCountries.join(', ')}`
    }
    if (sourceData?.length) {
      userMessage += `\n\nSource data to analyze:\n${JSON.stringify(sourceData, null, 2)}`
    } else {
      userMessage += `\n\nNo pre-fetched source data available. Based on your knowledge of the biophilic design market (up to your training cutoff), generate intelligence signals that would be relevant for Greenmood's marketing strategy. Flag confidence as "medium" or "low" for signals based on general knowledge rather than real-time data.`
    }

    userMessage += `\n\nProduce structured, actionable intelligence signals. Each signal must include a specific recommended marketing action for Greenmood.`

    const response = await this.callClaude(systemPrompt, userMessage, 8192)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
