import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        campaign: true,
        variants: { orderBy: { version: 'desc' } },
        approvalSteps: { orderBy: { createdAt: 'desc' }, include: { reviewer: true } },
        assets: { include: { asset: true }, orderBy: { sortOrder: 'asc' } },
        calendarSlot: true,
      },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: post })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const post = await prisma.post.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({ success: true, data: post })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Delete in order: approval steps, variants, calendar slot, post
    await prisma.approvalStep.deleteMany({ where: { postId: id } })
    await prisma.postVariant.deleteMany({ where: { postId: id } })
    await prisma.calendarSlot.deleteMany({ where: { postId: id } })
    await prisma.post.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
