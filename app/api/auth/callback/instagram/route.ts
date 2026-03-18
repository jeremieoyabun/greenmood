import { NextRequest, NextResponse } from 'next/server'

const APP_URL = 'https://app.greenmood.be'
const REDIRECT_URI = `${APP_URL}/api/auth/callback/instagram`

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?error=instagram_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?error=no_code`)
  }

  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${APP_URL}/settings?error=not_configured`)
  }

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    })

    const tokenText = await tokenRes.text()
    let tokenData: any
    try { tokenData = JSON.parse(tokenText) } catch { tokenData = {} }

    if (!tokenData.access_token) {
      // Show the EXACT error from Instagram in the URL for debugging
      const igError = tokenData.error_message || tokenData.error_type || tokenText.substring(0, 200)
      return NextResponse.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent('IG: ' + igError)}&debug_client_id=${appId}&debug_redirect=${encodeURIComponent(REDIRECT_URI)}`
      )
    }

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const finalToken = longData.access_token || tokenData.access_token

    // Get profile
    const profileRes = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${finalToken}`
    )
    const profile = await profileRes.json()

    return NextResponse.redirect(
      `${APP_URL}/settings?connected=instagram&username=${encodeURIComponent(profile.username || 'unknown')}`
    )
  } catch (err) {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=${encodeURIComponent('Exception: ' + (err instanceof Error ? err.message : String(err)))}`
    )
  }
}
