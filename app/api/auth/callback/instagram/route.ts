import { NextRequest, NextResponse } from 'next/server'

/**
 * Instagram OAuth Callback (New Instagram API)
 *
 * Flow:
 * 1. User clicks Connect → redirects to instagram.com/oauth/authorize
 * 2. User authorizes → Instagram redirects here with ?code=xxx
 * 3. We exchange code for short-lived token
 * 4. Exchange short-lived for long-lived token (60 days)
 * 5. Get user profile info
 * 6. Store and redirect back to settings
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Instagram OAuth denied:', error, searchParams.get('error_description'))
    return NextResponse.redirect(new URL('/settings?error=instagram_denied', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url))
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.INSTAGRAM_APP_SECRET
    // Use the same origin that received this callback — must match what was sent to Instagram
    const origin = `https://${req.headers.get('host') || 'app.greenmood.be'}`
    const redirectUri = `${origin}/api/auth/callback/instagram`

    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL('/settings?error=instagram_not_configured', req.url))
    }

    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Instagram token exchange failed:', tokenData, 'redirectUri used:', redirectUri)
      const errorDetail = tokenData.error_message || tokenData.error?.message || 'token_exchange_failed'
      return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(errorDetail)}`, req.url))
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
      state,
      userId,
      username: profile.username,
      accountType: profile.account_type,
      tokenExpires: longTokenData.expires_in ? `${Math.round(longTokenData.expires_in / 86400)} days` : 'unknown',
    })

    // TODO: Save token + profile to social_accounts table in DB
    // For now, redirect with success info
    const successUrl = new URL('/settings', req.url)
    successUrl.searchParams.set('connected', 'instagram')
    successUrl.searchParams.set('username', profile.username || '')
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('Instagram OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?error=instagram_error', req.url))
  }
}
