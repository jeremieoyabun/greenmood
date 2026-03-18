import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const market = searchParams.get('market')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        ...(platform ? { platform } : {}),
        ...(market ? { market } : {}),
        ...(startDate && endDate
          ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, data: snapshots })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
