import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { createCalendarSlotSchema } from '@/lib/schemas/validation'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const market = searchParams.get('market')
    const platform = searchParams.get('platform')

    const workspaceId = await getWorkspaceId()
    const slots = await prisma.calendarSlot.findMany({
      where: {
        workspaceId,
        ...(startDate && endDate
          ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
        ...(market ? { market } : {}),
        ...(platform ? { platform } : {}),
      },
      include: {
        campaign: { select: { title: true, contentType: true } },
        post: {
          select: {
            id: true,
            status: true,
            market: true,
            platform: true,
            variants: {
              where: { isActive: true },
              orderBy: { version: 'desc' as const },
              take: 1,
              // Don't load full imageUrl in list — can be MB of base64
              select: { id: true, text: true, notes: true, timing: true },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })

    // Check which variants have images (without loading the actual data)
    const variantIds = slots.flatMap(s => s.post?.variants?.map(v => v.id) || []).filter(Boolean)
    const variantsWithImage = variantIds.length > 0
      ? await prisma.postVariant.findMany({
          where: { id: { in: variantIds }, imageUrl: { not: null } },
          select: { id: true },
        })
      : []
    const imageSet = new Set(variantsWithImage.map(v => v.id))

    const slotsWithImageFlag = slots.map(slot => ({
      ...slot,
      post: slot.post ? {
        ...slot.post,
        variants: slot.post.variants.map(v => ({
          ...v,
          imageUrl: imageSet.has(v.id) ? 'HAS_IMAGE' : null,
        })),
      } : slot.post,
    }))

    return NextResponse.json({ success: true, data: slotsWithImageFlag })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createCalendarSlotSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const workspaceId = await getWorkspaceId()
    const slot = await prisma.calendarSlot.create({
      data: {
        workspaceId,
        ...parsed.data,
        date: new Date(parsed.data.date),
      },
    })

    return NextResponse.json({ success: true, data: slot }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
