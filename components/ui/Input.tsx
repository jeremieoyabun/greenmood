'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-gm-cream/60">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg',
            'text-gm-cream placeholder:text-gm-cream/30',
            'focus:outline-none focus:ring-1 focus:ring-gm-sage/50 focus:border-gm-sage/50',
            'transition-colors duration-150',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-gm-cream/60">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg',
            'text-gm-cream placeholder:text-gm-cream/30',
            'focus:outline-none focus:ring-1 focus:ring-gm-sage/50 focus:border-gm-sage/50',
            'transition-colors duration-150 resize-y min-h-[80px]',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
