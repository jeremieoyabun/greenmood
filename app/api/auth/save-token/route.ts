import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'

export async function POST(req: NextRequest) {
  try {
    const { token, market, platform } = await req.json()

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
    }

    const workspaceId = await getWorkspaceId()
    const mkt = market || 'hq'
    const plat = platform || 'instagram'

    let handle = ''
    let userId = ''

    if (plat === 'facebook') {
      // Verify Facebook Page token
      const pageRes = await fetch(
        `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${token}`
      )
      const page = await pageRes.json()

      if (page.error) {
        return NextResponse.json({
          success: false,
          error: page.error.message || 'Invalid Facebook token',
        }, { status: 400 })
      }

      handle = page.name || 'Facebook Page'
      userId = page.id
    } else {
      // Verify Instagram token
      const profileRes = await fetch(
        `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${token}`
      )
      const profile = await profileRes.json()

      if (profile.error) {
        return NextResponse.json({
          success: false,
          error: profile.error.message || 'Invalid token',
        }, { status: 400 })
      }

      handle = `@${profile.username}`
      userId = profile.user_id
    }

    await prisma.$executeRaw`
      INSERT INTO social_tokens (id, workspace_id, market, platform, account_handle, access_token, updated_at)
      VALUES (gen_random_uuid()::text, ${workspaceId}, ${mkt}, ${plat}, ${handle}, ${token}, NOW())
      ON CONFLICT (workspace_id, market, platform)
      DO UPDATE SET access_token = ${token}, account_handle = ${handle}, updated_at = NOW()
    `

    return NextResponse.json({
      success: true,
      username: handle,
      userId,
      saved: true,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify token',
    }, { status: 500 })
  }
}
