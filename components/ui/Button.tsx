'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-gm-sage/50 focus:ring-offset-2 focus:ring-offset-gm-dark',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          {
            'bg-gm-sage text-gm-dark hover:bg-gm-sage/85 shadow-md shadow-gm-sage/15 hover:shadow-lg hover:shadow-gm-sage/25': variant === 'primary',
            'bg-white/[0.08] text-gm-cream hover:bg-white/[0.14] border border-white/[0.1]': variant === 'secondary',
            'text-gm-cream/60 hover:text-gm-cream hover:bg-white/[0.06]': variant === 'ghost',
            'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20': variant === 'danger',
            'border border-white/[0.12] text-gm-cream/80 hover:text-gm-cream hover:bg-white/[0.06] hover:border-white/[0.2]': variant === 'outline',
          },
          {
            'px-3.5 py-1.5 text-xs': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-7 py-3 text-base': size === 'lg',
          },
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
