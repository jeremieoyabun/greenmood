import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('gm-session')?.value

    if (token) {
      await prisma.session.deleteMany({ where: { token } })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('gm-session')
    return response
  } catch {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('gm-session')
    return response
  }
}
