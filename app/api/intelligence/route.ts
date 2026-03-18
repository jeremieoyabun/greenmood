import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const country = searchParams.get('country')
    const competitorId = searchParams.get('competitorId')
    const urgency = searchParams.get('urgency')
    const limit = parseInt(searchParams.get('limit') || '50')

    const signals = await prisma.intelligenceSignal.findMany({
      where: {
        isDuplicate: false,
        ...(category ? { category } : {}),
        ...(country ? { country } : {}),
        ...(competitorId ? { competitorId } : {}),
        ...(urgency ? { urgency } : {}),
      },
      include: {
        source: { select: { name: true, type: true } },
        competitor: { select: { name: true } },
      },
      orderBy: [{ score: 'desc' }, { detectedAt: 'desc' }],
      take: limit,
    })

    return NextResponse.json({ success: true, data: signals })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
