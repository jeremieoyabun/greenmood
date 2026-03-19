import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cron job: Auto-publish scheduled posts at their scheduled time.
 * Runs every 5 minutes via Vercel Cron.
 *
 * IMPORTANT: Only publishes posts where:
 * 1. Status is SCHEDULED (not READY_TO_SCHEDULE — must be explicitly scheduled)
 * 2. The calendar slot date+time has passed (in Brussels timezone CET/CEST)
 * 3. Uses the correct Instagram token per market
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Current time in Brussels timezone
  const now = new Date()
  const brusselsFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = brusselsFormatter.formatToParts(now)
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '00'
  const brusselsDate = `${getVal('year')}-${getVal('month')}-${getVal('day')}`
  const brusselsTime = `${getVal('hour')}:${getVal('minute')}`

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

    // Filter: only publish if the scheduled time has passed in Brussels timezone
    const dueSlots = readySlots.filter(slot => {
      const slotDate = new Date(slot.date).toISOString().split('T')[0]
      const slotTime = slot.time || '00:00'

      // Past days = overdue, publish immediately
      if (slotDate < brusselsDate) return true

      // Today = check if time has passed
      if (slotDate === brusselsDate && slotTime <= brusselsTime) return true

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
      brusselsTime: `${brusselsDate} ${brusselsTime}`,
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
