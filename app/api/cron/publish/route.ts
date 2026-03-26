import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MARKETS } from '@/lib/constants'

/**
 * Cron job: Auto-publish scheduled posts at their scheduled time.
 * Runs every 5 minutes via Vercel Cron.
 *
 * IMPORTANT: Only publishes posts where:
 * 1. Status is SCHEDULED (not READY_TO_SCHEDULE — must be explicitly scheduled)
 * 2. The calendar slot date+time has passed (in the market's local timezone)
 * 3. Uses the correct Instagram token per market
 */

function getNowInTimezone(tz: string): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '00'
  return {
    date: `${getVal('year')}-${getVal('month')}-${getVal('day')}`,
    time: `${getVal('hour')}:${getVal('minute')}`,
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()

  try {
    // Only SCHEDULED posts (not READY_TO_SCHEDULE)
    const readySlots = await prisma.calendarSlot.findMany({
      where: {
        date: { lte: now },
        post: {
          status: 'SCHEDULED',
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

    // Filter: only publish if the scheduled time has passed in the market's timezone
    const dueSlots = readySlots.filter(slot => {
      const market = slot.post?.market || 'hq'
      const tz = MARKETS[market]?.timezone || 'Europe/Brussels'
      const { date: nowDate, time: nowTime } = getNowInTimezone(tz)

      const slotDate = new Date(slot.date).toISOString().split('T')[0]
      const slotTime = slot.time || '00:00'

      // Past days = overdue, publish immediately
      if (slotDate < nowDate) return true

      // Today = check if time has passed in market's timezone
      if (slotDate === nowDate && slotTime <= nowTime) return true

      return false
    })

    const results: any[] = []

    for (const slot of dueSlots) {
      const post = slot.post
      if (!post) continue
      const variant = post.variants[0]
      if (!variant) continue

      try {
        const res = await fetch('https://app.greenmood.be/api/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id }),
        })
        const data = await res.json()

        results.push({
          postId: post.id,
          platform: post.platform,
          market: post.market,
          scheduledTime: slot.time,
          success: data.success,
          error: data.error,
        })
      } catch (err) {
        results.push({
          postId: post.id,
          platform: post.platform,
          market: post.market,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      serverTime: now.toISOString(),
      checked: readySlots.length,
      due: dueSlots.length,
      published: results.filter(r => r.success).length,
      skipped: readySlots.length - dueSlots.length,
      results,
    })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    )
  }
}
