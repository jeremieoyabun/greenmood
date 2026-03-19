import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Serves a post variant image as a public URL.
 * Instagram API needs a publicly accessible image URL to publish.
 * This endpoint reads base64 image data from DB and serves it as binary.
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

  // If it's a base64 data URL, decode and serve as binary
  if (imageUrl.startsWith('data:')) {
    const [header, base64Data] = imageUrl.split(',')
    const mimeMatch = header.match(/data:(.*?);/)
    const mime = mimeMatch?.[1] || 'image/png'
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // If it's already a URL, redirect to it
  return NextResponse.redirect(imageUrl)
}
