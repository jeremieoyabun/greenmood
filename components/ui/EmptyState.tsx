import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && <div className="mb-4 text-gm-cream/20">{icon}</div>}
      <h3 className="text-sm font-medium text-gm-cream/60 mb-1">{title}</h3>
      {description && <p className="text-xs text-gm-cream/40 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
