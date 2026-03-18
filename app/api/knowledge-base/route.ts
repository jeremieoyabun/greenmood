import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { createKBEntrySchema } from '@/lib/schemas/validation'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const workspaceId = await getWorkspaceId()

    const entries = await prisma.knowledgeBaseEntry.findMany({
      where: {
        workspaceId,
        ...(category ? { category: category as any } : {}),
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    return NextResponse.json({ success: true, data: entries })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createKBEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      )
    }

    const workspaceId = await getWorkspaceId()
    const { metadata, ...rest } = parsed.data
    const entry = await prisma.knowledgeBaseEntry.create({
      data: {
        workspaceId,
        ...rest,
        ...(metadata ? { metadata: metadata as any } : {}),
      },
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    )
  }
}
