import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const body = await req.json()
    const { variantId, text, hashtags, firstComment } = body

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'variantId is required' },
        { status: 400 }
      )
    }

    // Verify variant belongs to this post
    const variant = await prisma.postVariant.findFirst({
      where: { id: variantId, postId },
    })

    if (!variant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found for this post' },
        { status: 404 }
      )
    }

    // Update variant
    const updated = await prisma.postVariant.update({
      where: { id: variantId },
      data: {
        ...(text !== undefined && { text }),
        ...(hashtags !== undefined && { hashtags }),
        ...(firstComment !== undefined && { firstComment }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
