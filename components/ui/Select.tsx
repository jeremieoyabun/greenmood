'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-gm-cream/60">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg',
            'text-gm-cream appearance-none',
            'focus:outline-none focus:ring-1 focus:ring-gm-sage/50 focus:border-gm-sage/50',
            'transition-colors duration-150',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gm-dark">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
