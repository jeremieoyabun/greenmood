'use client'

import { cn } from '@/lib/utils'

interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  color?: string
  emoji?: string
  size?: 'sm' | 'md'
}

export function Chip({ label, selected, onClick, color, emoji, size = 'md' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-all duration-150',
        selected
          ? 'bg-gm-sage/20 border-gm-sage/40 text-gm-sage'
          : 'bg-white/[0.03] border-white/[0.08] text-gm-cream/60 hover:border-white/20 hover:text-gm-cream/80',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      )}
      style={selected && color ? { borderColor: `${color}60`, backgroundColor: `${color}15`, color } : undefined}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  )
}
