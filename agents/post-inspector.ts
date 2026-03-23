import { AgentType } from '@prisma/client'
import { BaseAgent, AgentInput, AgentOutput, AgentContext } from './base-agent'
import { MODELS } from '@/lib/ai/client'
import { anthropic } from '@/lib/ai/client'

/**
 * Post Publication Inspector Agent
 *
 * Runs after publication to verify posts rendered correctly on the platform.
 * Uses Claude Vision to inspect media for cropping issues, text visibility,
 * aspect ratio problems, and overall quality.
 */
export class PostInspectorAgent extends BaseAgent {
  readonly type = 'POST_INSPECTOR' as AgentType
  readonly name = 'Post Publication Inspector'
  readonly description = 'Inspects published posts for visual/content issues via Claude Vision'
  readonly model = MODELS.HAIKU

  protected buildSystemPrompt(context: AgentContext): string {
    // Collect brand rules from KB
    const brandRules = Object.entries(context.knowledgeBase)
      .filter(([key]) => key.startsWith('BRAND_RULE::') || key.startsWith('PLATFORM_RULE::'))
      .map(([key, value]) => `- ${key.split('::')[1]}: ${value}`)
      .join('\n')

    return `You are the Post Publication Inspector for Greenmood, a premium Belgian biophilic design brand.

Your job is to inspect published social media posts and verify they rendered correctly.

BRAND CONTEXT:
${brandRules || 'Premium biophilic design brand. Calm, refined, architecturally credible.'}

PLATFORM REQUIREMENTS:
- Instagram Feed: 1080×1080 (1:1) or 1080×1350 (4:5). Portrait or square only.
- Instagram Stories: 1080×1920 (9:16). Full-screen vertical.
- LinkedIn: 1200×627 (landscape) or 1080×1080 (square).
- TikTok: 1080×1920 (9:16).

You will receive an image from a published post. Analyze it carefully and check:
1. CROPPING: Is any important content cut off? Are edges awkwardly cropped?
2. TEXT VISIBILITY: If there is text overlay, is it fully readable? Not cut off?
3. ASPECT RATIO: Does the image look correct for its platform, or is it stretched/squished?
4. VISUAL QUALITY: Is the image sharp, well-lit, and professional?
5. BRAND ALIGNMENT: Does it match Greenmood's premium, calm aesthetic?

Respond ONLY with valid JSON. No markdown, no preamble.`
  }

  protected async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const {
      postId,
      platformId,
      platform,
      market,
      mediaUrl,
      caption,
      hashtags,
    } = input.payload as {
      postId: string
      platformId: string
      platform: string
      market: string
      mediaUrl: string
      caption?: string
      hashtags?: string
    }

    if (!mediaUrl) {
      return {
        success: true,
        data: {
          status: 'skipped',
          reason: 'No media URL available for inspection',
          postId,
        },
      }
    }

    const systemPrompt = this.buildSystemPrompt(context)

    const userMessage = `Inspect this published ${platform} post for Greenmood (market: ${market}).

Platform ID: ${platformId}
Intended caption: ${caption ? caption.substring(0, 300) : 'N/A'}
Hashtags expected: ${hashtags || 'N/A'}

Analyze the image and respond with this JSON structure:
{
  "status": "pass" | "issues_found" | "critical",
  "checks": {
    "cropping": { "pass": true/false, "detail": "description" },
    "text_visibility": { "pass": true/false, "detail": "description" },
    "aspect_ratio": { "pass": true/false, "detail": "description" },
    "visual_quality": { "pass": true/false, "detail": "description" },
    "brand_alignment": { "pass": true/false, "detail": "description" }
  },
  "summary": "1-2 sentence summary of findings",
  "recommendations": ["list of specific fixes if any issues found"]
}`

    // Call Claude Vision with image URL
    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: mediaUrl },
            },
            {
              type: 'text',
              text: userMessage,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const responseText = textBlock?.type === 'text' ? textBlock.text : '{}'

    let analysis: Record<string, unknown>
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[1] : responseText)
    } catch {
      analysis = { status: 'error', rawResponse: responseText, parseError: true }
    }

    return {
      success: true,
      data: {
        postId,
        platformId,
        platform,
        market,
        mediaUrl,
        inspection: analysis,
        tokensUsed:
          (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    }
  }
}
