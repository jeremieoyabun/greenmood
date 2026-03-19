import { NextRequest, NextResponse } from 'next/server'
import { cloudinary } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const folder = searchParams.get('folder') || 'greenmood'
    const limit = parseInt(searchParams.get('limit') || '30')
    const q = searchParams.get('q') || ''

    let result: any

    if (q) {
      // Use search API for text queries
      result = await cloudinary.search
        .expression(`folder:greenmood/* AND (tags:${q} OR filename:${q})`)
        .sort_by('created_at', 'desc')
        .max_results(Math.min(limit, 50))
        .with_field('tags')
        .with_field('context')
        .execute()
    } else {
      // Browse by folder
      result = await cloudinary.search
        .expression(`folder:${folder}/*`)
        .sort_by('created_at', 'desc')
        .max_results(Math.min(limit, 50))
        .with_field('tags')
        .with_field('context')
        .execute()
    }

    const assets = (result.resources || []).map((r: any) => ({
      url: r.secure_url,
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
      tags: r.tags || [],
      context: r.context?.custom || {},
      createdAt: r.created_at,
      resourceType: r.resource_type,
    }))

    return NextResponse.json({ success: true, data: assets, total: result.total_count || assets.length })
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
    const { publicId, tags, resourceType } = await req.json()
    if (!publicId) {
      return NextResponse.json({ success: false, error: 'publicId required' }, { status: 400 })
    }

    if (tags) {
      await cloudinary.uploader.replace_tag(tags.join(','), [publicId], { resource_type: resourceType || 'image' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}
