import { NextRequest, NextResponse } from 'next/server'
import { searchAssets } from '@/lib/cloudinary'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const folder = searchParams.get('folder') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    const results = await searchAssets({
      query: query || undefined,
      tags: tags.length > 0 ? tags : undefined,
      folder: folder || undefined,
      maxResults: Math.min(limit, 50),
    })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
