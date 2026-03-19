'use client'

import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div
        className={cn(
          'relative bg-[#0f1a0f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-xl': size === 'md',
            'w-full max-w-3xl': size === 'lg',
            'w-full max-w-5xl': size === 'xl',
            'w-full max-w-[90vw]': size === 'full',
          }
        )}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.08] bg-[#0f1a0f]/95 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-gm-cream tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-gm-cream/50 hover:text-gm-cream transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}
