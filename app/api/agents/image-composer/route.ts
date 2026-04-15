import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { composeOverlayImage, type OverlayData } from '@/lib/image-compose'

const ALLOWED_EMAIL = 'jeremie.kuntzinger@gmail.com'

/**
 * Image Composer Agent
 *
 * POST /api/agents/image-composer
 * Body: { baseImageUrl, overlayData, width?, height? }
 *
 * Composes a text overlay on a base image using Juana Alt + Poppins,
 * uploads the result to Cloudinary, returns the new URL.
 *
 * Restricted to Jeremie's account (email check).
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  const user = await getCurrentUser()
  if (user?.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'Not authorized for image composition' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { baseImageUrl, overlayData, width, height } = body as {
      baseImageUrl: string
      overlayData: OverlayData
      width?: number
      height?: number
    }

    if (!baseImageUrl || !overlayData?.template) {
      return NextResponse.json(
        { error: 'Provide baseImageUrl and overlayData with template' },
        { status: 400 }
      )
    }

    const result = await composeOverlayImage({
      baseImageUrl,
      overlayData,
      width,
      height,
    })

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('Image composer error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Image composer failed',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
