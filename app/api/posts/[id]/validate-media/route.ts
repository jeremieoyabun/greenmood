import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  validateImageDimensions,
  getImageDimensionsFromUrl,
  DimensionValidation,
} from '@/lib/image-validation'

/**
 * GET /api/posts/[id]/validate-media
 * Validates all media dimensions against the post's target platform.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get post platform
    const post = await prisma.$queryRaw<Array<{ platform: string }>>`
      SELECT platform FROM posts WHERE id = ${id} LIMIT 1
    `
    if (!post[0]) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }
    const platform = post[0].platform

    // Get all media for this post
    const media = await prisma.$queryRaw<Array<{ id: string; url: string; media_type: string }>>`
      SELECT id, url, media_type FROM post_media
      WHERE post_id = ${id} ORDER BY sort_order ASC
    `

    // Also check variant imageUrl as fallback
    const variant = await prisma.postVariant.findFirst({
      where: { postId: id, isActive: true },
      select: { imageUrl: true },
    })

    const urls: Array<{ id: string; url: string; source: string }> = []

    for (const m of media) {
      if (m.media_type !== 'video') {
        urls.push({ id: m.id, url: m.url, source: 'post_media' })
      }
    }

    if (!urls.length && variant?.imageUrl) {
      urls.push({ id: 'variant', url: variant.imageUrl, source: 'variant' })
    }

    if (!urls.length) {
      return NextResponse.json({
        success: true,
        data: {
          validations: [],
          overallValid: true,
          hasCritical: false,
          noMedia: true,
        },
      })
    }

    // Validate each image
    const validations: Array<DimensionValidation & { mediaId: string }> = []

    for (const item of urls) {
      const dims = await getImageDimensionsFromUrl(item.url)
      if (dims) {
        const result = validateImageDimensions(platform, dims.width, dims.height)
        validations.push({ ...result, mediaId: item.id })
      } else {
        validations.push({
          valid: true,
          severity: 'warning',
          currentRatio: 'unknown',
          expectedRatios: [],
          message: 'Could not determine image dimensions',
          mediaId: item.id,
        })
      }
    }

    const hasCritical = validations.some((v) => v.severity === 'critical')
    const hasWarning = validations.some((v) => v.severity === 'warning')
    const overallValid = !hasCritical

    return NextResponse.json({
      success: true,
      data: { validations, overallValid, hasCritical, hasWarning },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    )
  }
}
