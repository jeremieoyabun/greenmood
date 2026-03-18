import { cn } from '@/lib/utils'

interface StatusDotProps {
  status: string
  className?: string
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-400',
  AI_GENERATED: 'bg-purple-400',
  FACT_CHECKED: 'bg-blue-400',
  BRAND_APPROVED: 'bg-emerald-400',
  READY_TO_SCHEDULE: 'bg-amber-400',
  SCHEDULED: 'bg-indigo-400',
  PUBLISHED: 'bg-green-400',
  REJECTED: 'bg-red-400',
  PLANNED: 'bg-gray-400',
  CONTENT_READY: 'bg-blue-400',
  SKIPPED: 'bg-gray-500',
  RUNNING: 'bg-yellow-400 animate-pulse',
  COMPLETED: 'bg-green-400',
  FAILED: 'bg-red-400',
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full', statusColors[status] || 'bg-gray-400', className)}
    />
  )
}
