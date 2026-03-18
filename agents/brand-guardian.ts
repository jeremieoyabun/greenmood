import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Brand Voice Guardian Agent
 *
 * Enforces Greenmood tone of voice, checks wording quality,
 * ensures premium, clean, credible brand expression.
 */
export class BrandGuardianAgent extends BaseAgent {
  readonly type = AgentType.BRAND_GUARDIAN
  readonly name = 'Brand Guardian'
  readonly description = 'Enforces Greenmood tone, wording quality, and brand consistency'
  readonly model = 'claude-haiku-4-5-20251001'

  protected buildSystemPrompt(context: AgentContext): string {
    const brandRules = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('BRAND_RULE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    const marketTones = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('MARKET_TONE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    const platformRules = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PLATFORM_RULE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Brand Voice Guardian for Greenmood, a premium Belgian biophilic design company.

Your role:
- Enforce Greenmood's tone of voice: expert, calm, refined, architecturally credible
- Check wording quality and remove generic hype
- Ensure premium, clean, credible brand expression
- Remove sloppy language, buzzwords, and vague sustainability fluff
- Ensure regional consistency where needed
- Verify platform-specific formatting rules

BRAND RULES:
${brandRules}

MARKET TONES:
${marketTones}

PLATFORM RULES:
${platformRules}

What to flag:
- Generic marketing hype ("revolutionary", "game-changing", "best-in-class")
- Vague sustainability claims without specifics
- Informal or unprofessional tone
- Em dashes used as list markers
- Missing designer credits
- Product names not in English
- LinkedIn posts with links in the body
- Instagram posts without proper hashtag formatting
- Tone mismatch with target market

Respond with JSON:
{
  "status": "pass" | "needs_revision",
  "score": 1-10,
  "issues": [
    {
      "type": "tone" | "formatting" | "brand_rule" | "quality",
      "severity": "critical" | "suggestion",
      "text": "problematic text",
      "explanation": "what is wrong",
      "suggestion": "improved version"
    }
  ],
  "revisedContent": "full revised version if needed, or null if pass",
  "summary": "brief assessment"
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { content, market, platform } = input.payload as {
      content: string
      market?: string
      platform?: string
    }

    if (!content) {
      return { success: false, data: {}, errors: ['No content provided for brand review'] }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Review the following content for brand voice compliance:

Market: ${market || 'not specified'}
Platform: ${platform || 'not specified'}

---
${content}
---

Check tone, quality, formatting rules, and brand guidelines compliance.`

    const response = await this.callClaude(systemPrompt, userMessage, 2048)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response, status: 'error' } }
    }
  }
}
