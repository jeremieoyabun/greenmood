import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'No token configured' })
  }

  try {
    const res = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${token}`
    )
    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
