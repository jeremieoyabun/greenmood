import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const { date, time } = await req.json()

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 })
    }

    // Find or create calendar slot for this post
    const existing = await prisma.calendarSlot.findFirst({
      where: { postId },
    })

    if (existing) {
      await prisma.calendarSlot.update({
        where: { id: existing.id },
        data: {
          date: new Date(date),
          time: time || '12:00',
          status: 'SCHEDULED',
        },
      })
    } else {
      const post = await prisma.post.findUnique({ where: { id: postId } })
      if (!post) {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
      }
      await prisma.calendarSlot.create({
        data: {
          workspaceId: post.workspaceId,
          date: new Date(date),
          time: time || '12:00',
          market: post.market,
          platform: post.platform,
          status: 'SCHEDULED',
          postId: post.id,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to schedule' },
      { status: 500 }
    )
  }
}
