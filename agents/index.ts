/**
 * Greenmood V2 — Agent Registry
 *
 * Central registry for all AI agents. Import from here.
 */

export { BaseAgent } from './base-agent'
export type { AgentInput, AgentOutput, AgentContext } from './base-agent'

export { OrchestratorAgent } from './orchestrator'
export { EditorialStrategistAgent } from './editorial-strategist'
export { ContentGeneratorAgent } from './content-generator'
export { FactCheckerAgent } from './fact-checker'
export { BrandGuardianAgent } from './brand-guardian'
export { ChannelAdapterAgent } from './channel-adapter'
export { VisualBuilderAgent } from './visual-builder'
export { SchedulerAgent } from './scheduler'
export { PerformanceAnalystAgent } from './performance-analyst'
export { MarketIntelligenceAgent } from './market-intelligence'

// ─── Agent Factory ───

import { AgentType } from '@prisma/client'
import { BaseAgent } from './base-agent'
import { OrchestratorAgent } from './orchestrator'
import { EditorialStrategistAgent } from './editorial-strategist'
import { ContentGeneratorAgent } from './content-generator'
import { FactCheckerAgent } from './fact-checker'
import { BrandGuardianAgent } from './brand-guardian'
import { ChannelAdapterAgent } from './channel-adapter'
import { VisualBuilderAgent } from './visual-builder'
import { SchedulerAgent } from './scheduler'
import { PerformanceAnalystAgent } from './performance-analyst'
import { MarketIntelligenceAgent } from './market-intelligence'

const agentRegistry: Record<AgentType, () => BaseAgent> = {
  ORCHESTRATOR: () => new OrchestratorAgent(),
  EDITORIAL_STRATEGIST: () => new EditorialStrategistAgent(),
  CONTENT_GENERATOR: () => new ContentGeneratorAgent(),
  FACT_CHECKER: () => new FactCheckerAgent(),
  BRAND_GUARDIAN: () => new BrandGuardianAgent(),
  CHANNEL_ADAPTER: () => new ChannelAdapterAgent(),
  VISUAL_BUILDER: () => new VisualBuilderAgent(),
  SCHEDULER: () => new SchedulerAgent(),
  PERFORMANCE_ANALYST: () => new PerformanceAnalystAgent(),
  MARKET_INTELLIGENCE: () => new MarketIntelligenceAgent(),
  COMMENT_MONITOR: () => new MarketIntelligenceAgent(), // Comment monitor runs inline in cron
  REPURPOSE_AGENT: () => new ContentGeneratorAgent(), // Repurpose runs inline in cron
}

/**
 * Get an agent instance by type.
 */
export function getAgent(type: AgentType): BaseAgent {
  const factory = agentRegistry[type]
  if (!factory) {
    throw new Error(`Unknown agent type: ${type}`)
  }
  return factory()
}

/**
 * List all available agents.
 */
export function listAgents(): Array<{ type: AgentType; name: string; description: string }> {
  return Object.entries(agentRegistry).map(([type, factory]) => {
    const agent = factory()
    return { type: type as AgentType, name: agent.name, description: agent.description }
  })
}
