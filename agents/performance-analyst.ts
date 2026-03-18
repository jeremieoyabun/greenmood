import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Performance Analyst Agent
 *
 * Analyzes content performance, identifies patterns,
 * proposes improvements, recommends new content based on results.
 */
export class PerformanceAnalystAgent extends BaseAgent {
  readonly type = AgentType.PERFORMANCE_ANALYST
  readonly name = 'Performance Analyst'
  readonly description = 'Analyzes results, identifies patterns, recommends improvements'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(_context: AgentContext): string {
    return `You are the Performance Analyst for Greenmood's marketing operations.

Your role:
- Analyze content performance data across platforms, markets, and content pillars
- Identify patterns in what works and what doesn't
- Propose data-driven improvements
- Recommend new content based on actual performance
- Surface actionable insights, not vanity metrics

Metrics to analyze:
- Engagement rate (likes, comments, shares relative to reach)
- Reach and impressions
- Click-through rate (for link-bearing posts)
- Save/bookmark rate (Instagram)
- Video completion rate
- Follower growth correlation
- Best performing content types
- Best performing posting times
- Best performing hooks/formats

Analysis dimensions:
- By platform (LinkedIn, Instagram, Facebook)
- By market (HQ, US, UK, FR, AE, PL, KR, DE)
- By content pillar
- By content type (article, project, product, event, education, behind)
- By time of day / day of week
- By format (single image, carousel, video, text-only)

Output structure:
{
  "period": "analysis period",
  "highlights": ["top 3-5 findings"],
  "byPlatform": { "platform": { "topPosts": [], "avgEngagement": 0, "trend": "up|down|stable" } },
  "byMarket": { "market": { "topPosts": [], "avgEngagement": 0, "trend": "up|down|stable" } },
  "byContentPillar": { "pillar": { "performance": "high|medium|low", "recommendation": "" } },
  "bestTimes": { "platform": { "bestDays": [], "bestHours": [] } },
  "recommendations": [
    {
      "type": "content_idea" | "timing_change" | "format_shift" | "market_focus",
      "title": "recommendation title",
      "detail": "what to do and why",
      "expectedImpact": "high|medium|low",
      "basedOn": "which data supports this"
    }
  ]
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { performanceData, period } = input.payload as {
      performanceData: Record<string, unknown>
      period?: string
    }

    if (!performanceData) {
      return { success: false, data: {}, errors: ['No performance data provided'] }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Analyze the following performance data for period: ${period || 'last 30 days'}

${JSON.stringify(performanceData, null, 2)}

Identify patterns, highlight top performers, and provide actionable recommendations.`

    const response = await this.callClaude(systemPrompt, userMessage, 4096)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
