import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import sharp from 'sharp'

/**
 * Serves a post variant image as a public JPEG URL.
 * Instagram API needs a publicly accessible image URL.
 * Converts PNG/base64 to optimized JPEG for fast delivery.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const variant = await prisma.postVariant.findUnique({
    where: { id },
    select: { imageUrl: true },
  })

  if (!variant?.imageUrl) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const imageUrl = variant.imageUrl

  // If it's a base64 data URL, decode and serve
  if (imageUrl.startsWith('data:')) {
    const [header, base64Data] = imageUrl.split(',')
    const mimeMatch = header.match(/data:(.*?);/)
    const mime = mimeMatch?.[1] || 'image/png'
    const rawBuffer = Buffer.from(base64Data, 'base64')

    // Videos: serve as-is
    if (mime.startsWith('video/')) {
      return new NextResponse(new Uint8Array(rawBuffer), {
        headers: {
          'Content-Type': mime,
          'Content-Length': rawBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // Images: convert to optimized JPEG
    const jpegBuffer = await sharp(rawBuffer)
      .resize(1080, 1350, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    return new NextResponse(new Uint8Array(jpegBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': jpegBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // If it's already a URL, redirect to it
  return NextResponse.redirect(imageUrl)
}
