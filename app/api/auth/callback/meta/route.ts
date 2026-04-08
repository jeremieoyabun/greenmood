import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'

/**
 * Meta OAuth Callback
 *
 * Flow:
 * 1. User clicks Connect in Settings → redirects to Meta OAuth
 * 2. User authorizes → Meta redirects here with ?code=xxx&state=accountId
 * 3. We exchange code for access token
 * 4. We get long-lived token + IG user ID
 * 5. Store in DB and redirect back to settings
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // accountId
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings?error=meta_denied', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url))
  }

  try {
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenmood-one.vercel.app'}/api/auth/callback/meta`

    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL('/settings?error=meta_not_configured', req.url))
    }

    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Meta token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/settings?error=token_failed', req.url))
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longTokenData = await longTokenRes.json()
    const longToken = longTokenData.access_token || tokenData.access_token

    // Step 3: Get user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()

    // Step 4: Get Instagram Business Account ID for each page
    const igAccounts = []
    for (const page of pagesData.data || []) {
      const igRes = await fetch(
        `https://graph.facebook.com/v25.0/${page.id}?fields=instagram_business_account,name&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      if (igData.instagram_business_account) {
        igAccounts.push({
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
          igUserId: igData.instagram_business_account.id,
        })
      }
    }

    // Step 5: Save tokens to DB
    const workspaceId = await getWorkspaceId()
    const market = state || 'hq' // state param carries the market code

    // Save Facebook Page tokens (non-expiring when derived from long-lived user token)
    for (const page of pagesData.data || []) {
      await prisma.$executeRaw`
        INSERT INTO social_tokens (id, workspace_id, market, platform, account_handle, access_token, updated_at)
        VALUES (gen_random_uuid()::text, ${workspaceId}, ${market}, 'facebook', ${page.name || 'Facebook Page'}, ${page.access_token}, NOW())
        ON CONFLICT (workspace_id, market, platform)
        DO UPDATE SET access_token = ${page.access_token}, account_handle = ${page.name || 'Facebook Page'}, updated_at = NOW()
      `
    }

    // Save Instagram tokens (linked to pages)
    for (const ig of igAccounts) {
      await prisma.$executeRaw`
        INSERT INTO social_tokens (id, workspace_id, market, platform, account_handle, access_token, updated_at)
        VALUES (gen_random_uuid()::text, ${workspaceId}, ${market}, 'instagram', ${ig.pageName || 'Instagram'}, ${ig.pageToken}, NOW())
        ON CONFLICT (workspace_id, market, platform)
        DO UPDATE SET access_token = ${ig.pageToken}, account_handle = ${ig.pageName || 'Instagram'}, updated_at = NOW()
      `
    }

    console.log('Meta OAuth success: saved tokens for', market, '— pages:', pagesData.data?.length || 0, 'ig:', igAccounts.length)

    const successUrl = new URL('/settings', req.url)
    successUrl.searchParams.set('connected', 'meta')
    successUrl.searchParams.set('accounts', String((pagesData.data?.length || 0) + igAccounts.length))
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('Meta OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?error=meta_error', req.url))
  }
}
