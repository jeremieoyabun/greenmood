import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
