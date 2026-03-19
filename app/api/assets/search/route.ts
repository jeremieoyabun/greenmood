import { NextRequest, NextResponse } from 'next/server'
import { cloudinary } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const folder = searchParams.get('folder') || 'greenmood'
    const limit = parseInt(searchParams.get('limit') || '30')
    const q = searchParams.get('q') || ''

    let resources: any[] = []

    if (q) {
      // Search by tag
      try {
        const result = await cloudinary.api.resources_by_tag(q, {
          max_results: Math.min(limit, 50),
          tags: true,
          context: true,
        })
        resources = result.resources || []
      } catch {
        // Tag not found, try prefix search
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'greenmood/',
          max_results: Math.min(limit, 50),
          tags: true,
          context: true,
        })
        resources = (result.resources || []).filter((r: any) =>
          r.public_id.toLowerCase().includes(q.toLowerCase()) ||
          (r.context?.custom?.originalName || '').toLowerCase().includes(q.toLowerCase()) ||
          (r.tags || []).some((t: string) => t.toLowerCase().includes(q.toLowerCase()))
        )
      }
    } else {
      // Browse by folder prefix
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder.endsWith('/') ? folder : `${folder}/`,
        max_results: Math.min(limit, 50),
        tags: true,
        context: true,
      })
      resources = result.resources || []
    }

    const assets = resources.map((r: any) => ({
      url: r.secure_url,
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
      tags: r.tags || [],
      context: r.context?.custom || {},
      displayName: r.context?.custom?.originalName || r.display_name || r.public_id.split('/').pop()?.replace(/[_]/g, ' '),
      folder: r.public_id.split('/').slice(0, -1).join('/'),
      createdAt: r.created_at,
      resourceType: r.resource_type,
    }))

    return NextResponse.json({ success: true, data: assets, total: assets.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

// DELETE an asset
export async function DELETE(req: NextRequest) {
  try {
    const { publicId, resourceType } = await req.json()
    if (!publicId) {
      return NextResponse.json({ success: false, error: 'publicId required' }, { status: 400 })
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

// PATCH — update tags
export async function PATCH(req: NextRequest) {
  try {
    const { publicId, tags } = await req.json()
    if (!publicId || !tags) {
      return NextResponse.json({ success: false, error: 'publicId and tags required' }, { status: 400 })
    }
    await cloudinary.uploader.replace_tag(tags.join(','), [publicId])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}
