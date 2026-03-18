import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODELS } from '@/lib/ai/client'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const postId = formData.get('postId') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Get post context if provided
    let postContext = ''
    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
          campaign: { select: { title: true, brief: true } },
        },
      })
      if (post) {
        const variant = post.variants[0]
        postContext = `
POST CONTEXT:
- Platform: ${post.platform}
- Market: ${post.market}
- Campaign: ${post.campaign?.title || 'N/A'}
- Caption: ${variant?.text || 'N/A'}
- Visual Direction: ${(() => { try { return JSON.parse(variant?.notes || '{}').visualDirection || 'N/A' } catch { return 'N/A' } })()}
`
      }
    }

    // Load KB for product verification
    const workspaceId = await getWorkspaceId()
    const kbEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { workspaceId, isActive: true, category: { in: ['PRODUCT_FACT', 'RESTRICTED_CLAIM', 'BRAND_RULE'] } },
    })
    const productFacts = kbEntries.filter(e => e.category === 'PRODUCT_FACT').map(e => `- ${e.key}: ${e.value}`).join('\n')
    const restrictedClaims = kbEntries.filter(e => e.category === 'RESTRICTED_CLAIM').map(e => `- ${e.value}`).join('\n')
    const brandRules = kbEntries.filter(e => e.category === 'BRAND_RULE').map(e => `- ${e.value}`).join('\n')

    const systemPrompt = `You are the Greenmood Image Quality & Fact Checker. Analyze images submitted for social media posts.

GREENMOOD PRODUCTS (verify what's shown matches these):
${productFacts.substring(0, 4000)}

BRAND RULES:
${brandRules}

RESTRICTED CLAIMS (flag if the image implies any of these):
${restrictedClaims}

Your job:
1. IDENTIFY what's in the image (which Greenmood product, material, setting)
2. CHECK dimensions/ratio suitability for the target platform
3. VERIFY product accuracy (correct product name, correct materials shown, correct finishes)
4. ASSESS image quality (lighting, composition, resolution, professional feel)
5. CHECK brand alignment (premium, calm, architectural — not stock-photo or cheap)
6. FLAG any issues (wrong product identification, misleading presentation, poor quality)

Platform size guidelines:
- Instagram feed: 1080×1080 (square) or 1080×1350 (portrait 4:5) preferred
- Instagram Stories/Reels: 1080×1920 (9:16)
- LinkedIn: 1200×627 (landscape) or 1080×1080 (square)
- Carousel slides: 1080×1350 each`

    const userMessage = `Analyze this image for Greenmood social media use.
${postContext}

Check:
1. What Greenmood product/material is shown? Is the identification correct?
2. Is the image ratio suitable for the intended platform?
3. Does the quality match Greenmood's premium brand standards?
4. Any factual concerns (wrong product, wrong material, misleading)?
5. Overall recommendation: APPROVED / NEEDS ADJUSTMENT / REJECTED

Respond with JSON:
{
  "status": "approved" | "needs_adjustment" | "rejected",
  "product_identified": "what product/material is shown",
  "product_correct": true/false,
  "dimensions_check": { "suitable": true/false, "current_ratio": "W:H", "recommendation": "" },
  "quality_score": 1-10,
  "brand_alignment": 1-10,
  "issues": [{ "type": "product|quality|dimensions|brand", "severity": "critical|warning|suggestion", "detail": "" }],
  "suggestions": ["improvement suggestions"],
  "summary": "one-line verdict"
}`

    const response = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: userMessage },
        ],
      }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ success: false, error: 'No response from AI' }, { status: 500 })
    }

    let result
    try {
      result = JSON.parse(textBlock.text)
    } catch {
      const match = textBlock.text.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
      else result = { status: 'error', summary: textBlock.text }
    }

    // Log agent run
    await prisma.agentRun.create({
      data: {
        workspaceId,
        agentType: 'FACT_CHECKER',
        status: 'COMPLETED',
        input: { fileName: file.name, fileSize: file.size, mimeType, postId } as any,
        output: result as any,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
