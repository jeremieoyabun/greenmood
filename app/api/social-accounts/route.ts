import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function GET() {
  try {
    const tokens = await prisma.$queryRaw<Array<{
      platform: string
      market: string
      account_handle: string
    }>>`
      SELECT platform, market, account_handle
      FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
    `

    return NextResponse.json({ success: true, data: tokens })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const market = searchParams.get('market')

    if (!platform) {
      return NextResponse.json({ success: false, error: 'platform required' }, { status: 400 })
    }

    await prisma.$executeRaw`
      DELETE FROM social_tokens
      WHERE workspace_id = ${WORKSPACE_ID}
        AND platform = ${platform}
        AND (${market}::text IS NULL OR market = ${market})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
