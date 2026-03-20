import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'

// Allow large uploads (videos up to 100MB)
export const maxDuration = 120

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// GET — list media for a post
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const media = await prisma.$queryRaw<Array<any>>`
    SELECT id, url, media_type, sort_order FROM post_media
    WHERE post_id = ${id} ORDER BY sort_order ASC
  `
  return NextResponse.json({ success: true, data: media })
}

// POST — upload file to Cloudinary + create post_media record
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
  }

  try {
    // Get post info for proper folder organization
    const post = await prisma.$queryRaw<Array<{ platform: string; market: string }>>`
      SELECT platform, market FROM posts WHERE id = ${id} LIMIT 1
    `
    const platform = post[0]?.platform || 'other'
    const market = post[0]?.market || 'hq'

    // Upload to organized folder: greenmood/social/{platform}/{market}/
    const folder = platform === 'stories'
      ? `greenmood/social/stories/${market}`
      : `greenmood/social/${platform}/${market}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Clean filename for display
    const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-')
    const isVideo = file.type.startsWith('video/')

    // Upload to Cloudinary — use upload_stream for reliability with large files
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'image',
          public_id: `${cleanName}-${Date.now()}`,
          display_name: file.name.replace(/\.[^.]+$/, ''),
          context: `originalName=${file.name}|postId=${id}|market=${market}|platform=${platform}`,
          tags: [platform, market, `post:${id}`],
          chunk_size: 6_000_000, // 6MB chunks for large videos
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      stream.end(buffer)
    })

    // Get next sort order
    const maxOrder = await prisma.$queryRaw<Array<{ max: number }>>`
      SELECT COALESCE(MAX(sort_order), -1) as max FROM post_media WHERE post_id = ${id}
    `
    const nextOrder = (maxOrder[0]?.max ?? -1) + 1

    const mediaId = crypto.randomUUID()
    await prisma.$executeRaw`
      INSERT INTO post_media (id, post_id, url, media_type, sort_order)
      VALUES (${mediaId}, ${id}, ${result.secure_url}, ${result.resource_type}, ${nextOrder})
    `

    // Auto-mark as carousel if 2+ media
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM post_media WHERE post_id = ${id}
    `
    if (Number(count[0]?.count) >= 2) {
      await prisma.$executeRaw`UPDATE posts SET is_carousel = true WHERE id = ${id}`
    }

    return NextResponse.json({
      success: true,
      data: { id: mediaId, url: result.secure_url, mediaType: result.resource_type, sortOrder: nextOrder }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// DELETE — remove a media item + cleanup Cloudinary
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const mediaId = searchParams.get('mediaId')
  if (!mediaId) return NextResponse.json({ success: false, error: 'mediaId required' }, { status: 400 })

  const media = await prisma.$queryRaw<Array<{ url: string }>>`
    SELECT url FROM post_media WHERE id = ${mediaId} AND post_id = ${id}
  `
  if (media[0]?.url?.includes('cloudinary')) {
    const match = media[0].url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)
    if (match) { try { await cloudinary.uploader.destroy(match[1]) } catch {} }
  }

  await prisma.$executeRaw`DELETE FROM post_media WHERE id = ${mediaId} AND post_id = ${id}`

  const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM post_media WHERE post_id = ${id}
  `
  if (Number(count[0]?.count) < 2) {
    await prisma.$executeRaw`UPDATE posts SET is_carousel = false WHERE id = ${id}`
  }

  return NextResponse.json({ success: true })
}

// PATCH — reorder media
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { mediaIds } = await req.json()
  if (!Array.isArray(mediaIds)) return NextResponse.json({ success: false, error: 'mediaIds array required' }, { status: 400 })

  for (let i = 0; i < mediaIds.length; i++) {
    await prisma.$executeRaw`
      UPDATE post_media SET sort_order = ${i} WHERE id = ${mediaIds[i]} AND post_id = ${id}
    `
  }

  return NextResponse.json({ success: true })
}
