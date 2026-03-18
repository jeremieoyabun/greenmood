import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'

/**
 * Visual / Carousel Builder Agent
 *
 * Proposes asset selections, suggests carousel order,
 * drafts slide-by-slide messaging, helps create structured visual storytelling.
 */
export class VisualBuilderAgent extends BaseAgent {
  readonly type = AgentType.VISUAL_BUILDER
  readonly name = 'Visual Builder'
  readonly description = 'Proposes carousel structures, slide logic, and visual storytelling'
  readonly model = 'claude-sonnet-4-20250514'

  protected buildSystemPrompt(context: AgentContext): string {
    const productFacts = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('PRODUCT_FACT::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Visual Builder for Greenmood, a premium biophilic design brand.

Your role:
- Propose carousel slide structures and ordering
- Draft slide-by-slide messaging and text overlays
- Suggest asset selections from available media
- Create structured visual storytelling narratives
- Recommend image generation prompts for AI-generated visuals

Greenmood products:
${productFacts}

Visual style:
- Premium, architectural photography feel
- Clean compositions, natural materials, warm lighting
- Avoid stock photo aesthetic
- Prefer in-situ product photography, detail shots, process shots
- Color palette: forest greens, warm coppers, natural creams, dark backgrounds

Carousel best practices:
- Slide 1: Hook — bold statement, question, or striking visual
- Slides 2-8: Story — problem, solution, proof, details
- Final slide: CTA — clear action, brand reinforcement
- Each slide: minimal text (max 20 words), strong visual hierarchy
- Educational carousels: one key fact per slide

Respond with JSON:
{
  "concept": "carousel concept summary",
  "slideCount": 5,
  "slides": [
    {
      "slideNumber": 1,
      "type": "hook" | "content" | "data" | "quote" | "cta",
      "headline": "slide headline text",
      "body": "slide body text or null",
      "visualDescription": "what the image should show",
      "assetSuggestion": "suggested asset from library or null",
      "imagePrompt": "AI image generation prompt or null"
    }
  ],
  "notes": "additional creative notes"
}`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const { topic, contentType, platform, slideCount } = input.payload as {
      topic: string
      contentType?: string
      platform?: string
      slideCount?: number
    }

    if (!topic) {
      return { success: false, data: {}, errors: ['No topic provided'] }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const userMessage = `Create a visual carousel structure for:

Topic: ${topic}
Content type: ${contentType || 'educational'}
Platform: ${platform || 'instagram'}
Target slides: ${slideCount || '5-7'}

Design a compelling visual storytelling narrative with clear slide-by-slide structure.`

    const response = await this.callClaude(systemPrompt, userMessage, 4096)

    try {
      const result = JSON.parse(response)
      return { success: true, data: result }
    } catch {
      return { success: true, data: { rawResponse: response } }
    }
  }
}
