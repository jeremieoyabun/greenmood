import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const runs = await prisma.agentRun.findMany({
      where: {
        ...(agentType ? { agentType: agentType as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        campaign: { select: { title: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: runs })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
