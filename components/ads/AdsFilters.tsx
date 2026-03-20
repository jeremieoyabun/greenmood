'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AdsFiltersProps {
  currentStatus: string
  currentDatePreset: string
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
]

const DATE_OPTIONS = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
]

export function AdsFilters({ currentStatus, currentDatePreset }: AdsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL' && key === 'status') {
      params.delete('status')
    } else if (value === 'last_30d' && key === 'datePreset') {
      params.delete('datePreset')
    } else {
      params.set(key, value)
    }
    router.push(`/ads?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Status filter */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam('status', opt.value)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              currentStatus === opt.value
                ? 'bg-gm-sage/15 text-gm-sage shadow-sm'
                : 'text-gm-cream/45 hover:text-gm-cream/70'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam('datePreset', opt.value)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              currentDatePreset === opt.value
                ? 'bg-gm-sage/15 text-gm-sage shadow-sm'
                : 'text-gm-cream/45 hover:text-gm-cream/70'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
