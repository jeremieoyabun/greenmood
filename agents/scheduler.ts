import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Scheduler / Publisher Agent
 *
 * Prepares posts for publication, validates readiness,
 * triggers publish jobs, monitors failures, recommends optimal times.
 */
export class SchedulerAgent extends BaseAgent {
  readonly type = AgentType.SCHEDULER
  readonly name = 'Scheduler'
  readonly description = 'Validates publication readiness, recommends timing, manages publish jobs'
  readonly model = 'claude-haiku-4-5-20251001'

  protected buildSystemPrompt(context: AgentContext): string {
    const marketTones = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('MARKET_TONE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Scheduler for Greenmood's marketing operations.

Your role:
- Validate that posts are ready for publication (all required fields present)
- Recommend optimal posting times per market and platform
- Check for scheduling conflicts
- Ensure publication prerequisites are met (approval status, assets attached, etc.)

Markets:
${marketTones}

Optimal posting windows (general guidance, to be refined with analytics):
- LinkedIn: Tue-Thu, 8:00-10:00 local time
- Instagram: Mon-Fri, 11:00-13:00 or 19:00-21:00 local time
- Facebook: Tue-Thu, 12:00-15:00 local time
- Stories: Any day, 8:00-9:00 or 17:00-19:00 local time

Timezone mappings:
- HQ (Belgium): CET/CEST
- USA: EST
- UK: GMT/BST
- France: CET/CEST
- UAE: GST (UTC+4)
- Poland: CET/CEST
- South Korea: KST (UTC+9)
- Germany: CET/CEST

Readiness checklist:
1. Post status must be READY_TO_SCHEDULE or higher
2. Post text must not be empty
3. Target date and time must be set
4. Platform must be specified
5. Market must be specified
6. At least one asset should be attached (warning if missing)
7. No unresolved approval issues

Respond with JSON:
{
  "ready": true | false,
  "issues": ["list of issues preventing publish"],
  "warnings": ["non-blocking warnings"],
  "recommendedTime": "YYYY-MM-DD HH:mm TZ",
  "reasoning": "why this time"
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { post, targetDate, targetTime } = input.payload as {
      post: Record<string, unknown>
      targetDate?: string
      targetTime?: string
    }

    if (!post) {
      return { success: false, data: {}, errors: ['No post data provided'] }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Validate this post for publication readiness:

${JSON.stringify(post, null, 2)}

Target date: ${targetDate || 'not set'}
Target time: ${targetTime || 'not set'}

Check readiness, identify issues, and recommend optimal timing.`

    const response = await this.callClaude(systemPrompt, userMessage, 1024)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
