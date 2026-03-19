import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic, MODELS } from '@/lib/ai/client'
import { buildContentPrompt } from '@/lib/ai/prompts'
import { AgentType, AgentRunStatus } from '@prisma/client'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * SEO Blog Generator Agent
 *
 * POST /api/agents/blog
 * Body: { postId } or { topic }
 *
 * Generates a full 800-1200 word SEO blog article from an existing post
 * or a topic string. Includes title, meta description, structured content,
 * product facts from KB, and internal links.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { postId, topic } = body as { postId?: string; topic?: string }

    if (!postId && !topic) {
      return NextResponse.json(
        { error: 'Provide either postId or topic' },
        { status: 400 }
      )
    }

    // ─── Resolve source content ───
    let sourceText = ''
    let sourceHashtags = ''
    let sourcePlatform = ''
    let sourceMarket = ''

    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      const variant = post.variants[0]
      if (variant) {
        sourceText = variant.text
        sourceHashtags = variant.hashtags || ''
      }
      sourcePlatform = post.platform
      sourceMarket = post.market
    }

    // ─── Create agent run ───
    const agentRun = await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: AgentType.CONTENT_GENERATOR,
        status: AgentRunStatus.RUNNING,
        input: { postId: postId || null, topic: topic || null } as any,
      },
    })

    // ─── Load KB context ───
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId: WORKSPACE_ID, isActive: true },
    })

    const knowledgeBase: Record<string, string> = {}
    for (const entry of kbEntries) {
      knowledgeBase[`${entry.category}::${entry.key}`] = entry.value
    }

    const contentContext = buildContentPrompt(knowledgeBase)

    // ─── Build prompt ───
    const systemPrompt = `You are an SEO content writer for Greenmood, a premium Belgian biophilic design brand.

${contentContext}

You write long-form blog articles (800-1200 words) for greenmood.be.
Your articles are architecturally credible, SEO-optimized, and grounded in verified product facts.
Think Dezeen editorial meets technical product guide.

INTERNAL LINKS (use where relevant):
- Ball Moss: https://greenmood.be/products/ball-moss
- Reindeer Moss: https://greenmood.be/products/reindeer-moss
- Velvet Leaf: https://greenmood.be/products/velvet-leaf
- Forest Moss: https://greenmood.be/products/forest-moss
- Cork Tiles: https://greenmood.be/products/cork-tiles
- Design Collection: https://greenmood.be/collections/design
- Projects: https://greenmood.be/projects
- About: https://greenmood.be/about
- Sustainability: https://greenmood.be/sustainability

SEO RULES:
- Primary keyword in title, meta description, first paragraph, and at least 2 H2 headings
- Meta description: 150-160 characters
- Use H2 for main sections, H3 for subsections
- Include 2-4 internal links naturally within the text
- End with a clear CTA (contact, explore products, request a sample)
- Slug should be lowercase, hyphenated, keyword-rich

Respond ONLY with valid JSON. No markdown backticks, no preamble.`

    const sourceContext = postId
      ? `Based on this existing social media post:
TEXT: ${sourceText}
HASHTAGS: ${sourceHashtags}
PLATFORM: ${sourcePlatform}
MARKET: ${sourceMarket}

Expand this into a full blog article.`
      : `Write about this topic: ${topic}`

    const userMessage = `${sourceContext}

Generate an 800-1200 word SEO blog article for greenmood.be.

Respond with this JSON format:
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "150-160 char meta description",
  "slug": "url-friendly-slug",
  "content": "Full article in HTML with <h2>, <h3>, <p>, <a>, <strong>, <ul>/<li> tags. No wrapping <html> or <body> tags.",
  "primaryKeyword": "main SEO keyword",
  "secondaryKeywords": ["keyword2", "keyword3"],
  "wordCount": 1000,
  "internalLinks": ["urls used in the article"]
}`

    const response = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // ─── Parse response ───
    let article: any
    try {
      article = JSON.parse(textBlock.text)
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        article = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse blog article from Claude response')
      }
    }

    const durationMs = Date.now() - startTime

    // ─── Log success ───
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: AgentRunStatus.COMPLETED,
        output: article as any,
        durationMs,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      title: article.title,
      metaDescription: article.metaDescription,
      slug: article.slug,
      content: article.content,
      primaryKeyword: article.primaryKeyword,
      secondaryKeywords: article.secondaryKeywords,
      wordCount: article.wordCount,
      internalLinks: article.internalLinks,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('Blog generator error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Blog generator failed',
        durationMs,
      },
      { status: 500 }
    )
  }
}
