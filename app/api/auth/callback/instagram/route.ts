import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const reqUrl = new URL(req.url)
  // Hardcode the production domain — dynamic detection fails on Vercel edge
  const APP_URL = 'https://app.greenmood.be'
  const REDIRECT_URI = `${APP_URL}/api/auth/callback/instagram`

  const { searchParams } = reqUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Instagram OAuth denied:', error)
    return NextResponse.redirect(`${APP_URL}/settings?error=instagram_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?error=no_code`)
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.INSTAGRAM_APP_SECRET

    if (!appId || !appSecret) {
      return NextResponse.redirect(`${APP_URL}/settings?error=instagram_not_configured`)
    }

    // Debug: log all headers to understand Vercel's request
    const debugHeaders: Record<string, string> = {}
    req.headers.forEach((v, k) => { debugHeaders[k] = v })
    console.log('Instagram callback debug:', {
      reqUrl: req.url,
      REDIRECT_URI,
      headers: debugHeaders,
    })

    // Step 1: Exchange code for short-lived token
    const body = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
    })
    console.log('Token exchange body:', body.toString())

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const tokenText = await tokenRes.text()
    console.log('Instagram token response raw:', tokenText)

    let tokenData: Record<string, unknown>
    try { tokenData = JSON.parse(tokenText) } catch { tokenData = { error_message: tokenText } }

    if (!tokenData.access_token) {
      console.error('Instagram token exchange failed:', tokenText)
      const errorDetail = String(tokenData.error_message || tokenData.error || 'token_exchange_failed')
      return NextResponse.redirect(`${APP_URL}/settings?error=${encodeURIComponent(errorDetail)}`)
    }

    const shortToken = tokenData.access_token
    const userId = tokenData.user_id

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json()
    const longToken = longTokenData.access_token || shortToken

    // Step 3: Get user profile
    const profileRes = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${longToken}`
    )
    const profile = await profileRes.json()

    console.log('Instagram OAuth success:', {
      state, userId,
      username: profile.username,
      accountType: profile.account_type,
      tokenExpires: longTokenData.expires_in ? `${Math.round(longTokenData.expires_in / 86400)} days` : 'unknown',
    })

    return NextResponse.redirect(
      `${APP_URL}/settings?connected=instagram&username=${encodeURIComponent(profile.username || '')}`
    )
  } catch (error) {
    console.error('Instagram OAuth error:', error)
    return NextResponse.redirect(`${APP_URL}/settings?error=instagram_error`)
  }
}
