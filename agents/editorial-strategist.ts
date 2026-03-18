import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Editorial Strategist Agent
 *
 * Proposes editorial calendars, defines weekly/monthly themes,
 * maps content pillars to campaign goals, suggests timing and cadence.
 */
export class EditorialStrategistAgent extends BaseAgent {
  readonly type = AgentType.EDITORIAL_STRATEGIST
  readonly name = 'Editorial Strategist'
  readonly description = 'Plans editorial calendars, themes, and content cadence'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    const marketTones = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('MARKET_TONE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    const productFacts = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PRODUCT_FACT::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Editorial Strategist for Greenmood, a premium Belgian biophilic design brand.

Your role:
- Propose editorial calendars aligned with business objectives
- Define weekly and monthly content themes
- Map content pillars to campaign goals
- Suggest optimal timing and cadence per region and platform
- Balance product storytelling, education, social proof, and brand authority
- Consider seasonal relevance, trade shows, design events

Markets and tones:
${marketTones}

Products to feature:
${productFacts}

Content pillars to consider:
1. Product Innovation & Design — showcasing products, materials, designers
2. Project Showcase — completed installations, case studies
3. Sustainability & Wellness — certifications, WELL/LEED, biophilic science
4. Education — acoustic performance, fire safety, material specifications
5. Behind the Scenes — factory, craftsmanship, team
6. Industry & Trends — biophilic design trends, workplace evolution

Output structured JSON with:
{
  "theme": "weekly/monthly theme",
  "slots": [
    {
      "date": "YYYY-MM-DD",
      "market": "market_code",
      "platform": "platform",
      "contentType": "type",
      "contentPillar": "pillar",
      "briefSuggestion": "what to post and why",
      "timing": "suggested time",
      "priority": "high|medium|low"
    }
  ],
  "reasoning": "why this plan"
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = JSON.stringify(input.payload)

    const response = await this.callClaude(systemPrompt, userMessage, 8192)

    try {
      const plan = JSON.parse(response)
      return { success: true, data: plan }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
