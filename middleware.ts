import { NextRequest, NextResponse } from 'next/server'

/**
 * Security middleware: protects all API mutation routes (POST/PATCH/DELETE).
 *
 * - Public routes (login, cron with bearer token) are exempt
 * - All other API mutations require a valid session cookie
 * - GET requests pass through (read-only)
 */

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/callback',
  '/api/cron/',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Allow GET requests (read-only)
  if (req.method === 'GET') return NextResponse.next()

  // Allow public paths (login, cron)
  if (isPublicPath(pathname)) return NextResponse.next()

  // Check session cookie
  const session = req.cookies.get('gm-session')?.value
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Session exists — let the route handler validate it further
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
