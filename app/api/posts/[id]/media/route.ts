import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET — list media for a post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const media = await prisma.$queryRaw<Array<any>>`
    SELECT id, url, media_type, sort_order FROM post_media
    WHERE post_id = ${id} ORDER BY sort_order ASC
  `
  return NextResponse.json({ success: true, data: media })
}

// POST — add media to a post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { url, mediaType } = await req.json()

  if (!url) {
    return NextResponse.json({ success: false, error: 'url required' }, { status: 400 })
  }

  // Get next sort order
  const existing = await prisma.$queryRaw<Array<{ max: number }>>`
    SELECT COALESCE(MAX(sort_order), -1) as max FROM post_media WHERE post_id = ${id}
  `
  const nextOrder = (existing[0]?.max ?? -1) + 1
  const type = mediaType || (url.match(/\.(mp4|mov|webm)/i) ? 'video' : 'image')

  await prisma.$executeRaw`
    INSERT INTO post_media (id, post_id, url, media_type, sort_order)
    VALUES (gen_random_uuid()::text, ${id}, ${url}, ${type}, ${nextOrder})
  `

  return NextResponse.json({ success: true, sortOrder: nextOrder })
}

// DELETE — remove a media item
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { mediaId } = await req.json()

  if (!mediaId) {
    return NextResponse.json({ success: false, error: 'mediaId required' }, { status: 400 })
  }

  await prisma.$executeRaw`DELETE FROM post_media WHERE id = ${mediaId} AND post_id = ${id}`

  return NextResponse.json({ success: true })
}
