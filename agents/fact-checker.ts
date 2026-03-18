import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Greenmood Fact Checker Agent
 *
 * Validates technical accuracy against the source of truth.
 * Checks product facts, materials, approved vs restricted claims.
 * Never invents technical details.
 */
export class FactCheckerAgent extends BaseAgent {
  readonly type = AgentType.FACT_CHECKER
  readonly name = 'Fact Checker'
  readonly description = 'Validates content accuracy against Greenmood source of truth'
  readonly model = 'claude-haiku-4-5-20251001'

  protected buildSystemPrompt(context: AgentContext): string {
    const productFacts = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PRODUCT_FACT::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    const approvedClaims = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('APPROVED_CLAIM::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    const restrictedClaims = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('RESTRICTED_CLAIM::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Fact Checker for Greenmood, a premium biophilic design brand.

Your ONLY job is to verify factual accuracy. You must:
1. Check every technical claim against the approved facts below
2. Flag any claim not present in the approved facts
3. Flag any restricted claim that appears in the content
4. Flag incorrect product names, specs, or attributions
5. Flag unsupported sustainability or performance claims
6. NEVER approve content with invented technical details

APPROVED PRODUCT FACTS:
${productFacts}

APPROVED CLAIMS (may be used):
${approvedClaims || '- No approved claims registered yet'}

RESTRICTED CLAIMS (must NOT be used):
${restrictedClaims || '- No restricted claims registered yet'}

Respond with JSON:
{
  "status": "pass" | "fail" | "warning",
  "issues": [
    {
      "type": "incorrect_fact" | "unsupported_claim" | "restricted_claim" | "missing_attribution" | "invented_detail",
      "severity": "critical" | "warning",
      "text": "the problematic text",
      "explanation": "what is wrong",
      "suggestion": "corrected version or null"
    }
  ],
  "summary": "brief overall assessment"
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { content, contentType } = input.payload as {
      content: string
      contentType?: string
    }

    if (!content) {
      return { success: false, data: {}, errors: ['No content provided to fact-check'] }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Please fact-check the following ${contentType || 'content'}:

---
${content}
---

Check every claim, product name, specification, and technical detail against the approved facts. Flag anything that is not verifiable from the approved source of truth.`

    const response = await this.callClaude(systemPrompt, userMessage, 2048)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response, status: 'error' } }
    }
  }
}
