import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCampaignSchema } from '@/lib/schemas/validation'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        contentPillar: true,
        _count: { select: { posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: campaigns })
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
    const parsed = createCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: 'default',
        ...parsed.data,
      },
    })

    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
