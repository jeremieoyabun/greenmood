import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const postId = formData.get('postId') as string | null
    const folder = formData.get('folder') as string | null
    const tagsStr = formData.get('tags') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine resource type
    const isVideo = file.type.startsWith('video/')
    const resourceType = isVideo ? 'video' as const : 'image' as const

    // Build tags from filename + folder + manual tags
    const tags: string[] = []
    if (tagsStr) tags.push(...tagsStr.split(',').map(t => t.trim()))
    if (postId) tags.push(`post:${postId}`)
    // Auto-tag from filename (e.g., "Hoverlight-03.png" → "hoverlight")
    const nameTag = file.name.replace(/\.[^.]+$/, '').replace(/[-_\d]+/g, ' ').trim().toLowerCase()
    if (nameTag && nameTag.length > 2) tags.push(nameTag)
    // Auto-tag from folder (e.g., "greenmood/products/ball-moss" → "ball-moss")
    const folderTag = (folder || '').split('/').pop()
    if (folderTag && folderTag !== 'unlinked' && folderTag !== 'posts') tags.push(folderTag)

    // Upload to Cloudinary with auto-tagging
    const result = await uploadToCloudinary(buffer, {
      folder: folder || `greenmood/posts/${postId || 'unlinked'}`,
      tags,
      resourceType,
      context: {
        postId: postId || '',
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        tags: result.tags,
        aiTags: result.aiTags,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
