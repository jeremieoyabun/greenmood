import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from './db'
import { createHash, randomBytes } from 'crypto'

const SESSION_COOKIE = 'gm-session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// Simple password hashing (for internal tool — not bcrypt overhead)
export function hashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || 'greenmood-v2'
  return createHash('sha256').update(password + salt).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  })
  return token
}

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionToken) return null

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          include: {
            marketAccess: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } })
      return null
    }

    return session.user
  } catch {
    return null
  }
})

export type UserWithAccess = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

// Role checks
export function isOperator(user: UserWithAccess | null): boolean {
  return user?.role === 'OPERATOR'
}

export function isCoordinator(user: UserWithAccess | null): boolean {
  return user?.role === 'COORDINATOR'
}

export function canAccessMarket(user: UserWithAccess | null, market: string): boolean {
  if (!user) return false
  if (user.role === 'OPERATOR') return true // Operators see everything
  return user.marketAccess.some((ma) => ma.market === market)
}

export function getUserMarkets(user: UserWithAccess): string[] {
  if (user.role === 'OPERATOR') return [] // empty = all markets
  return user.marketAccess.map((ma) => ma.market)
}

// Navigation items filtered by role
export function getNavItemsForRole(role: string) {
  const allItems = [
    { href: '/', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
    { href: '/calendar', label: 'Calendar', icon: 'Calendar', roles: ['OPERATOR', 'COORDINATOR'] },
    { href: '/composer', label: 'Composer', icon: 'PenTool', roles: ['OPERATOR'] },
    { href: '/assets', label: 'Assets', icon: 'Image', roles: ['OPERATOR', 'COORDINATOR'] },
    { href: '/approvals', label: 'Approvals', icon: 'CheckCircle', roles: ['OPERATOR', 'COORDINATOR'] },
    { href: '/knowledge-base', label: 'Knowledge Base', icon: 'Database', roles: ['OPERATOR'] },
    { href: '/intelligence', label: 'Intelligence', icon: 'Radar', roles: ['OPERATOR'] },
    { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
    { href: '/agent-runs', label: 'Agent Runs', icon: 'Bot', roles: ['OPERATOR'] },
    { href: '/settings', label: 'Settings', icon: 'Settings', roles: ['OPERATOR'] },
  ]
  return allItems.filter((item) => item.roles.includes(role))
}
