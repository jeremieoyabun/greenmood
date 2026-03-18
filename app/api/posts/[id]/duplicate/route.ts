import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { findNextAvailableSlotDate } from '@/lib/calendar-utils'
import { z } from 'zod'

const duplicatePostSchema = z.object({
  targetMarket: z.string().min(1, 'Target market is required'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = duplicatePostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const { targetMarket } = parsed.data
    const workspaceId = await getWorkspaceId()

    // Fetch source post with active variant
    const sourcePost = await prisma.post.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
        campaign: true,
      },
    })

    if (!sourcePost) {
      return NextResponse.json(
        { success: false, error: 'Source post not found' },
        { status: 404 }
      )
    }

    if (sourcePost.workspaceId !== workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Post does not belong to this workspace' },
        { status: 403 }
      )
    }

    const activeVariant = sourcePost.variants[0]
    if (!activeVariant) {
      return NextResponse.json(
        { success: false, error: 'Source post has no active variant' },
        { status: 400 }
      )
    }

    // Create duplicated post with variant
    const newPost = await prisma.post.create({
      data: {
        workspaceId,
        campaignId: sourcePost.campaignId,
        market: targetMarket,
        platform: sourcePost.platform,
        status: 'DRAFT',
        variants: {
          create: {
            version: 1,
            text: activeVariant.text,
            hashtags: activeVariant.hashtags,
            firstComment: activeVariant.firstComment,
            timing: activeVariant.timing,
            notes: `Duplicated from ${sourcePost.market}/${sourcePost.platform} post (${sourcePost.id}). Needs adaptation for ${targetMarket} market.`,
            source: 'MANUAL',
          },
        },
      },
      include: {
        variants: true,
        campaign: { select: { id: true, title: true } },
      },
    })

    // Create calendar slot for the duplicated post
    const timeByPlatform: Record<string, string> = {
      instagram: '12:00',
      linkedin: '09:00',
      stories: '08:00',
    }
    const time = timeByPlatform[newPost.platform] || '10:00'
    const slotDate = await findNextAvailableSlotDate(workspaceId)

    const calendarSlot = await prisma.calendarSlot.create({
      data: {
        workspaceId,
        campaignId: newPost.campaignId,
        postId: newPost.id,
        date: slotDate,
        time,
        market: targetMarket,
        platform: newPost.platform,
        status: 'PLANNED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...newPost,
        calendarSlot,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Duplicate post error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
