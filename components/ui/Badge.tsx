import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const variantClasses = {
  default: 'bg-white/[0.08] text-gm-cream/70 border border-white/[0.06]',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/20',
  info: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/20',
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg font-semibold uppercase tracking-wider',
        variantClasses[variant],
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
