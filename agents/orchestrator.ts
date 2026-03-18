import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Orchestrator Agent
 *
 * Receives business objectives and routes work to the right agents.
 * Coordinates multi-agent tasks and keeps work aligned with campaigns.
 */
export class OrchestratorAgent extends BaseAgent {
  readonly type = AgentType.ORCHESTRATOR
  readonly name = 'Orchestrator'
  readonly description = 'Routes objectives to agents, coordinates multi-step workflows'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    const brandRules = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('BRAND_RULE::'))
      .map(([, value]) => `- ${value}`)
      .join('\n')

    return `You are the Orchestrator for Greenmood's marketing operations platform.

Your role:
- Receive business objectives and break them into agent tasks
- Route work to the appropriate specialized agents
- Coordinate multi-step workflows
- Ensure alignment with campaigns and priorities
- Never skip validation steps

Brand rules to enforce:
${brandRules}

Available agents:
1. EDITORIAL_STRATEGIST — proposes calendars, themes, cadence
2. CONTENT_GENERATOR — generates content from briefs
3. FACT_CHECKER — validates against source of truth
4. BRAND_GUARDIAN — enforces tone and brand voice
5. CHANNEL_ADAPTER — transforms content per platform
6. VISUAL_BUILDER — proposes asset selections, carousel logic
7. SCHEDULER — prepares publication, validates readiness
8. PERFORMANCE_ANALYST — analyzes results, recommends improvements
9. MARKET_INTELLIGENCE — monitors trends, competitors, generates signals

Respond with a structured JSON plan of agent tasks to execute.`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = JSON.stringify(input.payload)

    const response = await this.callClaude(systemPrompt, userMessage, 4096)

    try {
      const plan = JSON.parse(response)
      return { success: true, data: { plan } }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
