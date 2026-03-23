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
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm bg-white border border-white/20 rounded-xl shadow-sm',
            'text-gray-900 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60',
            'transition-all duration-150',
            error && 'border-red-400 focus:ring-red-400/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium mt-1">{error}</p>}
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
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm bg-white border border-white/20 rounded-xl shadow-sm',
            'text-gray-900 placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60',
            'transition-all duration-150 resize-y min-h-[80px]',
            error && 'border-red-400 focus:ring-red-400/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium mt-1">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
