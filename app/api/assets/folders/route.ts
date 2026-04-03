import { NextResponse } from 'next/server'
import { cloudinary } from '@/lib/cloudinary'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    const result = await cloudinary.api.sub_folders('greenmood', { max_results: 500 })
    const topFolders = result.folders || []

    // Build tree by fetching subfolders for each top-level folder
    const tree: Array<{ id: string; label: string; children?: Array<{ id: string; label: string; children?: Array<{ id: string; label: string }> }> }> = [
      { id: 'greenmood', label: 'All Assets' },
    ]

    for (const folder of topFolders) {
      const path = folder.path
      const name = folder.name

      // Pretty label
      const label = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')

      try {
        const subResult = await cloudinary.api.sub_folders(path, { max_results: 100 })
        const subFolders = (subResult.folders || []).map((sf: any) => {
          const subLabel = sf.name.charAt(0).toUpperCase() + sf.name.slice(1).replace(/-/g, ' ')
          return { id: sf.path, label: subLabel }
        })

        // For products, also fetch sub-subfolders (like cork-tiles/parenthese)
        if (name === 'products' && subFolders.length > 0) {
          const enriched = []
          for (const sf of subFolders) {
            try {
              const subSubResult = await cloudinary.api.sub_folders(sf.id, { max_results: 50 })
              const subSubFolders = (subSubResult.folders || []).map((ssf: any) => ({
                id: ssf.path,
                label: ssf.name.charAt(0).toUpperCase() + ssf.name.slice(1).replace(/-/g, ' '),
              }))
              enriched.push(subSubFolders.length > 0 ? { ...sf, children: subSubFolders } : sf)
            } catch {
              enriched.push(sf)
            }
          }
          tree.push({ id: path, label: 'Design Collection', children: enriched })
        } else if (subFolders.length > 0) {
          tree.push({ id: path, label, children: subFolders })
        } else {
          tree.push({ id: path, label })
        }
      } catch {
        tree.push({ id: path, label })
      }
    }

    return NextResponse.json({ success: true, data: tree })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}
