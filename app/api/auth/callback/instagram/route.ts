import { NextRequest, NextResponse } from 'next/server'

// Force Node.js runtime (not Edge) to avoid fetch encoding issues
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = 'https://app.greenmood.be'
const REDIRECT_URI = 'https://app.greenmood.be/api/auth/callback/instagram'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?error=ig_denied`)
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
    // Build form body as a raw string to avoid any encoding issues
    const formBody = [
      `client_id=${appId}`,
      `client_secret=${appSecret}`,
      `grant_type=authorization_code`,
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      `code=${encodeURIComponent(code)}`,
    ].join('&')

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    })

    const tokenText = await tokenRes.text()

    let tokenData: any
    try {
      tokenData = JSON.parse(tokenText)
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent('Parse error: ' + tokenText.substring(0, 150))}`
      )
    }

    if (tokenData.error_type || tokenData.error_message) {
      // Show debug info: what client_id and redirect_uri we sent
      return NextResponse.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent(tokenData.error_message || tokenData.error_type)}&sent_id=${appId}&sent_uri=${encodeURIComponent(REDIRECT_URI)}`
      )
    }

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent('No token: ' + tokenText.substring(0, 150))}`
      )
    }

    // Exchange for long-lived token
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
      `${APP_URL}/settings?connected=instagram&username=${encodeURIComponent(profile.username || 'connected')}`
    )
  } catch (err) {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`
    )
  }
}
