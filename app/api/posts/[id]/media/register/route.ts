import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Register a Cloudinary URL as post media (after client-side upload)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { url, mediaType, sortOrder } = await req.json()

  if (!url) {
    return NextResponse.json({ success: false, error: 'url required' }, { status: 400 })
  }

  try {
    const maxOrder = await prisma.$queryRaw<Array<{ max: number }>>`
      SELECT COALESCE(MAX(sort_order), -1) as max FROM post_media WHERE post_id = ${id}
    `
    const nextOrder = sortOrder ?? ((maxOrder[0]?.max ?? -1) + 1)
    const type = mediaType || 'image'

    const mediaId = crypto.randomUUID()
    await prisma.$executeRaw`
      INSERT INTO post_media (id, post_id, url, media_type, sort_order)
      VALUES (${mediaId}, ${id}, ${url}, ${type}, ${nextOrder})
    `

    // Auto-mark as carousel if 2+ media
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM post_media WHERE post_id = ${id}
    `
    if (Number(count[0]?.count) >= 2) {
      await prisma.$executeRaw`UPDATE posts SET is_carousel = true WHERE id = ${id}`
    }

    return NextResponse.json({ success: true, data: { id: mediaId, url, mediaType: type, sortOrder: nextOrder } })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
