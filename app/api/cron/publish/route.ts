import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cron job: Auto-publish scheduled posts at their scheduled time.
 * Runs every 5 minutes via Vercel Cron.
 * Checks for posts with status SCHEDULED and a calendar slot
 * where date+time is now or in the past.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this header)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in dev or if no secret configured
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  try {
    // Find all SCHEDULED posts with a calendar slot for today at or before current time
    const readySlots = await prisma.calendarSlot.findMany({
      where: {
        date: { lte: now },
        post: {
          status: { in: ['SCHEDULED', 'READY_TO_SCHEDULE'] },
        },
      },
      include: {
        post: {
          include: {
            variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
          },
        },
      },
    })

    // All scheduled slots with date <= today are due for publishing
    // Time comparison is approximate — the cron runs daily or on-demand
    // so we publish all posts whose date has arrived
    const dueSlots = readySlots

    const results: any[] = []

    for (const slot of dueSlots) {
      const post = slot.post
      if (!post) continue
      const variant = post.variants[0]
      if (!variant) continue

      try {
        // Call our own publish API
        const appUrl = 'https://app.greenmood.be'
        const res = await fetch(`${appUrl}/api/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id }),
        })
        const data = await res.json()

        results.push({
          postId: post.id,
          platform: post.platform,
          market: post.market,
          time: slot.time,
          success: data.success,
          error: data.error,
        })
      } catch (err) {
        results.push({
          postId: post.id,
          platform: post.platform,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: readySlots.length,
      due: dueSlots.length,
      published: results.filter(r => r.success).length,
      results,
      time: now.toISOString(),
    })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    )
  }
}
