import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'No token configured' })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'exchange') {
      // Exchange short-lived token for long-lived (60 days)
      const secret = process.env.INSTAGRAM_APP_SECRET
      if (!secret) return NextResponse.json({ error: 'No app secret' })

      const res = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${secret}&access_token=${token}`
      )
      const data = await res.json()
      return NextResponse.json({ success: true, data, note: 'Save this long-lived token in Vercel env vars' })
    }

    // Default: test current token
    const res = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${token}`
    )
    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
