import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ success: false, error: 'No token' }, { status: 500 })
    }

    const res = await fetch(
      `https://graph.instagram.com/v25.0/me/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=20&access_token=${token}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ success: false, error: data.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data.data || [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
