import { NextResponse } from 'next/server'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, currentPassword, newPassword } = body

  const updateData: Record<string, string> = {}

  if (name && name !== user.name) {
    updateData.name = name
  }

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 })
    }
    updateData.email = email
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password required' }, { status: 400 })
    }

    const currentHash = hashPassword(currentPassword)
    if (currentHash !== user.passwordHash) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 })
    }

    updateData.passwordHash = hashPassword(newPassword)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: true, message: 'No changes' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  })

  return NextResponse.json({ success: true })
}
