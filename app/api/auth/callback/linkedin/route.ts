import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = 'https://app.greenmood.be'
const REDIRECT_URI = 'https://app.greenmood.be/api/auth/callback/linkedin'
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDesc = url.searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=${encodeURIComponent('LinkedIn: ' + (errorDesc || error))}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?error=linkedin_no_code`)
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}/settings?error=linkedin_not_configured`)
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: [
        `grant_type=authorization_code`,
        `code=${encodeURIComponent(code)}`,
        `client_id=${clientId}`,
        `client_secret=${encodeURIComponent(clientSecret)}`,
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
      ].join('&'),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${APP_URL}/settings?error=${encodeURIComponent('LinkedIn token: ' + JSON.stringify(tokenData).substring(0, 200))}`
      )
    }

    // Get profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    // Save token to DB (upsert — one LinkedIn account for all markets)
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    await prisma.$executeRaw`
      INSERT INTO social_tokens (id, workspace_id, market, platform, account_handle, access_token, token_expires_at, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${WORKSPACE_ID}, 'hq', 'linkedin', ${profile.name || 'Greenmood'}, ${tokenData.access_token}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (workspace_id, market, platform)
      DO UPDATE SET access_token = ${tokenData.access_token}, token_expires_at = ${expiresAt}, account_handle = ${profile.name || 'Greenmood'}, updated_at = NOW()
    `

    return NextResponse.redirect(
      `${APP_URL}/settings?connected=linkedin&username=${encodeURIComponent(profile.name || profile.sub || 'connected')}`
    )
  } catch (err) {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`
    )
  }
}
