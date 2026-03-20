import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const notifications = await prisma.$queryRaw`
    SELECT id, type, title, message, link, is_read, created_at
    FROM notifications
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 20
  `
  const unreadCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ${user.id} AND is_read = false
  `

  return NextResponse.json({
    success: true,
    data: notifications,
    unreadCount: Number(unreadCount[0]?.count || 0),
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  const { ids, markAllRead } = await req.json()

  if (markAllRead) {
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true WHERE user_id = ${user.id} AND is_read = false
    `
  } else if (ids?.length) {
    for (const id of ids) {
      await prisma.$executeRaw`
        UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${user.id}
      `
    }
  }

  return NextResponse.json({ success: true })
}
