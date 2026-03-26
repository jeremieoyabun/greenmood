import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, time, market, platform, text, hashtags, firstComment, imageUrl, notes, isCarousel } = body

    if (!date || !text) {
      return NextResponse.json({ success: false, error: 'date and text are required' }, { status: 400 })
    }

    const post = await prisma.post.create({
      data: {
        workspace: { connect: { id: WORKSPACE_ID } },
        market: market || 'hq',
        platform: platform || 'instagram',
        status: 'DRAFT',
        isCarousel: isCarousel || false,
        variants: {
          create: {
            version: 1,
            text,
            hashtags: hashtags || null,
            firstComment: firstComment || null,
            imageUrl: imageUrl || null,
            timing: date,
            notes: notes || null,
            isActive: true,
            source: 'MANUAL',
          },
        },
        calendarSlot: {
          create: {
            workspaceId: WORKSPACE_ID,
            date: new Date(date),
            time: time || '12:00',
            market: market || 'hq',
            platform: platform || 'instagram',
            status: 'PLANNED',
          },
        },
      },
      include: {
        variants: true,
        calendarSlot: true,
      },
    })

    return NextResponse.json({ success: true, data: post }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Create failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaignId')
    const market = searchParams.get('market')
    const platform = searchParams.get('platform')

    const posts = await prisma.post.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(market ? { market } : {}),
        ...(platform ? { platform } : {}),
      },
      include: {
        campaign: { select: { title: true } },
        variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
        approvalSteps: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { assets: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: posts })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
