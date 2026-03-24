import { NextResponse } from 'next/server'
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
