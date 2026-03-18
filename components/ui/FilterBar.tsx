'use client'

import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  filters: Array<{
    id: string
    label: string
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
  }>
  className?: string
}

export function FilterBar({ filters, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">
            {filter.label}
          </span>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-2 py-1 text-xs bg-white/[0.05] border border-white/[0.08] rounded-md text-gm-cream appearance-none focus:outline-none focus:ring-1 focus:ring-gm-sage/30"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gm-dark">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
