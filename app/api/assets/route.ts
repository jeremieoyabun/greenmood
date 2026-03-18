import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const collection = searchParams.get('collection')
    const tag = searchParams.get('tag')

    const assets = await prisma.asset.findMany({
      where: {
        ...(collection ? { collection } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: assets })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
