import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'
import { buildContentPrompt } from '@/lib/ai/prompts'

/**
 * Content Generator Agent
 *
 * Generates social media content from briefs, grounded in the knowledge base.
 * Produces per-market, per-platform variants.
 */
export class ContentGeneratorAgent extends BaseAgent {
  readonly type = AgentType.CONTENT_GENERATOR
  readonly name = 'Content Generator'
  readonly description = 'Generates social content from briefs, per market and platform'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    return buildContentPrompt(context.knowledgeBase)
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { brief, contentType, markets, platforms } = input.payload as {
      brief: string
      contentType: string
      markets: string[]
      platforms: string[]
    }

    if (!brief || !contentType || !markets?.length || !platforms?.length) {
      return {
        success: false,
        data: {},
        errors: ['Missing required fields: brief, contentType, markets, platforms'],
      }
    }

    const systemPrompt = this.buildSystemPrompt(context)

    const userMessage = `TYPE: ${contentType}
BRIEF: ${brief}
MARKETS: ${markets.join(', ')}
PLATFORMS: ${platforms.join(', ')}

Generate content for each market × platform combination.
Respond ONLY with valid JSON. No markdown, no preamble.

Format:
{
  "title": "campaign title",
  "posts": {
    "marketId--platformId": {
      "text": "full post text",
      "first_comment": "link for linkedin or null",
      "hashtags": "hashtags string",
      "timing": "posting time suggestion",
      "notes": "any notes"
    }
  },
  "image_prompts": ["2-3 image generation prompts"],
  "stories": ["story descriptions if applicable"]
}`

    const response = await this.callClaude(systemPrompt, userMessage, 8192)

    try {
      const content = JSON.parse(response)
      return { success: true, data: content }
    } catch {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const content = JSON.parse(jsonMatch[0])
          return { success: true, data: content }
        } catch {
          // Fall through
        }
      }
      return {
        success: false,
        data: { rawResponse: response },
        errors: ['Failed to parse AI response as JSON'],
      }
    }
  }
}
