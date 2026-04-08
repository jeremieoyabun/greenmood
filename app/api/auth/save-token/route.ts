import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'

async function saveTokenToDB(workspaceId: string, market: string, platform: string, handle: string, token: string) {
  await prisma.$executeRaw`
    INSERT INTO social_tokens (id, workspace_id, market, platform, account_handle, access_token, updated_at)
    VALUES (gen_random_uuid()::text, ${workspaceId}, ${market}, ${platform}, ${handle}, ${token}, NOW())
    ON CONFLICT (workspace_id, market, platform)
    DO UPDATE SET access_token = ${token}, account_handle = ${handle}, updated_at = NOW()
  `
}

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
      // For Facebook, try to exchange for a long-lived token first
      // (short-lived tokens expire in ~1h, long-lived page tokens never expire)
      const appId = process.env.META_APP_ID
      const appSecret = process.env.META_APP_SECRET
      let finalToken = token

      if (appId && appSecret) {
        // Step 1: Try to exchange user token for long-lived user token
        const exchangeRes = await fetch(
          `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`
        )
        const exchangeData = await exchangeRes.json()

        if (exchangeData.access_token) {
          // Step 2: Get page tokens from long-lived user token (these never expire)
          const pagesRes = await fetch(
            `https://graph.facebook.com/v25.0/me/accounts?access_token=${exchangeData.access_token}`
          )
          const pagesData = await pagesRes.json()

          if (pagesData.data?.length > 0) {
            // Use the first page's token (non-expiring)
            finalToken = pagesData.data[0].access_token
            handle = pagesData.data[0].name || 'Facebook Page'
            userId = pagesData.data[0].id
          } else {
            // No pages found — use the long-lived user token
            finalToken = exchangeData.access_token
          }
        }
        // If exchange fails, the token might already be a page token — try as-is
      }

      // Verify the final token works
      if (!userId) {
        const pageRes = await fetch(
          `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${finalToken}`
        )
        const page = await pageRes.json()

        if (page.error) {
          return NextResponse.json({
            success: false,
            error: page.error.message || 'Invalid Facebook token. Try reconnecting via OAuth.',
          }, { status: 400 })
        }

        handle = page.name || 'Facebook Page'
        userId = page.id
      }

      await saveTokenToDB(workspaceId, mkt, plat, handle, finalToken)
      return NextResponse.json({ success: true, username: handle, userId, saved: true })

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

    await saveTokenToDB(workspaceId, mkt, plat, handle, token)
    return NextResponse.json({ success: true, username: handle, userId, saved: true })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify token',
    }, { status: 500 })
  }
}
