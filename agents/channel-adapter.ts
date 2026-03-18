import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Channel Adapter Agent
 *
 * Transforms a master message into channel-specific variants.
 * Adapts length, hook, structure, CTA, and formatting per platform.
 */
export class ChannelAdapterAgent extends BaseAgent {
  readonly type = AgentType.CHANNEL_ADAPTER
  readonly name = 'Channel Adapter'
  readonly description = 'Adapts master content into platform-specific variants'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    const platformRules = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PLATFORM_RULE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Channel Adapter for Greenmood, a premium biophilic design brand.

Your role:
- Transform a master message into platform-specific variants
- Adapt length, hook, structure, CTA, and formatting per platform
- Preserve factual consistency across all variants
- Never invent new facts — only reshape existing content

Platform-specific rules:
${platformRules}

Platform guidelines:
- LinkedIn: Professional, data-driven hook on first line. NO links in post body. Link goes in first_comment. 1300-1800 chars optimal. Use line breaks for readability.
- Instagram: Visual storytelling hook. Hashtags after 3 dots on new lines (20 relevant). 2200 char max. Emoji acceptable but not excessive.
- Facebook: Conversational but professional. Can include links. 400-800 chars optimal.
- Stories: Ultra-short, 1-2 lines max per slide. CTA-driven.
- Pinterest: SEO-rich description. 200-500 chars. Keyword-focused.

Respond with JSON:
{
  "variants": {
    "platformId": {
      "text": "adapted post text",
      "first_comment": "link/hashtags for first comment or null",
      "hashtags": "hashtags if applicable",
      "timing": "suggested posting time",
      "charCount": 123,
      "notes": "adaptation notes"
    }
  }
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { masterContent, targetPlatforms, market } = input.payload as {
      masterContent: string
      targetPlatforms: string[]
      market?: string
    }

    if (!masterContent || !targetPlatforms?.length) {
      return {
        success: false,
        data: {},
        errors: ['Missing masterContent or targetPlatforms'],
      }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Adapt the following master content for these platforms: ${targetPlatforms.join(', ')}

Market: ${market || 'global'}

Master content:
---
${masterContent}
---

Create optimized variants for each platform while preserving all factual claims.`

    const response = await this.callClaude(systemPrompt, userMessage, 4096)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
