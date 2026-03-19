import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const { searchParams } = new URL(req.url)
    const variantId = searchParams.get('variantId')

    const where: any = { postId, isActive: true }
    if (variantId) where.id = variantId

    const variant = await prisma.postVariant.findFirst({
      where,
      orderBy: { version: 'desc' },
      select: { id: true, text: true, hashtags: true, firstComment: true, imageUrl: true, notes: true, timing: true },
    })

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: variant })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const body = await req.json()
    const { variantId, text, hashtags, firstComment, imageUrl } = body

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
        ...(imageUrl !== undefined && { imageUrl }),
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
