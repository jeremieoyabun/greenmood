import { prisma } from '@/lib/db'

const MAX_POSTS_PER_DAY = 3

/**
 * Find the next available weekday for scheduling a calendar slot.
 * Skips weekends and days that already have 3+ posts.
 * Starts from tomorrow.
 */
export async function findNextAvailableSlotDate(workspaceId: string): Promise<Date> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start from tomorrow
  const candidate = new Date(today)
  candidate.setDate(candidate.getDate() + 1)

  // Look ahead up to 60 days to find an open slot
  for (let i = 0; i < 60; i++) {
    const dayOfWeek = candidate.getDay()

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayStart = new Date(candidate)
      const dayEnd = new Date(candidate)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const existingCount = await prisma.calendarSlot.count({
        where: {
          workspaceId,
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })

      if (existingCount < MAX_POSTS_PER_DAY) {
        return new Date(candidate)
      }
    }

    candidate.setDate(candidate.getDate() + 1)
  }

  // Fallback: return tomorrow if nothing found within 60 days
  const fallback = new Date(today)
  fallback.setDate(fallback.getDate() + 1)
  return fallback
}
