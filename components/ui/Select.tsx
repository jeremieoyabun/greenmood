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
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm bg-white border border-white/20 rounded-xl shadow-sm',
            'text-gray-900 appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60',
            'transition-all duration-150',
            error && 'border-red-400 focus:ring-red-400/50',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 font-medium mt-1">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
