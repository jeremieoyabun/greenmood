import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Phase 2: Upload to Vercel Blob
    // For now, return a placeholder response
    const asset = await prisma.asset.create({
      data: {
        workspaceId: 'default',
        filename: file.name,
        url: `/uploads/${file.name}`, // Placeholder — Phase 2 will use Vercel Blob
        mimeType: file.type,
        size: file.size,
        tags: [],
      },
    })

    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload error' },
      { status: 500 }
    )
  }
}
