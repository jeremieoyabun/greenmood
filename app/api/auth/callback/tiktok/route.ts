import { NextRequest, NextResponse } from 'next/server'

/**
 * TikTok OAuth Callback
 *
 * Flow:
 * 1. User clicks Connect in Settings → redirects to TikTok OAuth
 * 2. User authorizes → TikTok redirects here with ?code=xxx&state=accountId
 * 3. We exchange code for access token
 * 4. Store in DB and redirect back to settings
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings?error=tiktok_denied', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url))
  }

  try {
    const clientKey = process.env.TIKTOK_CLIENT_KEY
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenmood-one.vercel.app'}/api/auth/callback/tiktok`

    if (!clientKey || !clientSecret) {
      return NextResponse.redirect(new URL('/settings?error=tiktok_not_configured', req.url))
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.data?.access_token) {
      console.error('TikTok token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/settings?error=tiktok_token_failed', req.url))
    }

    const { access_token, refresh_token, open_id, expires_in } = tokenData.data

    console.log('TikTok OAuth success:', {
      state,
      openId: open_id,
      expiresIn: expires_in,
      token: access_token.substring(0, 20) + '...',
    })

    // TODO: Save to social_accounts table
    const successUrl = new URL('/settings', req.url)
    successUrl.searchParams.set('connected', 'tiktok')
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('TikTok OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?error=tiktok_error', req.url))
  }
}
