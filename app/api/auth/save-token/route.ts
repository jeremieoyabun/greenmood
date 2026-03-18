import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
    }

    // Verify the token by calling the Instagram API
    const profileRes = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username,account_type,name&access_token=${token}`
    )
    const profile = await profileRes.json()

    if (profile.error) {
      return NextResponse.json({
        success: false,
        error: profile.error.message || 'Invalid token',
      }, { status: 400 })
    }

    // Token is valid - return success with username
    return NextResponse.json({
      success: true,
      username: profile.username || profile.name,
      accountType: profile.account_type,
      userId: profile.user_id,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify token',
    }, { status: 500 })
  }
}
