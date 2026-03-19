import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-8 pb-6 border-b border-white/[0.06]', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gm-cream tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-gm-cream/40 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
