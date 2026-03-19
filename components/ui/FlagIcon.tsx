import { cn } from '@/lib/utils'

const FLAGS: Record<string, { colors: string[]; label: string }> = {
  hq: { colors: ['#000', '#FFD700', '#FF0000'], label: 'BE' },  // Belgium
  us: { colors: ['#B22234', '#FFF', '#3C3B6E'], label: 'US' },  // USA
  uk: { colors: ['#012169', '#FFF', '#C8102E'], label: 'UK' },  // UK
  ae: { colors: ['#00732F', '#FFF', '#FF0000', '#000'], label: 'AE' }, // UAE
  fr: { colors: ['#002395', '#FFF', '#ED2939'], label: 'FR' },  // France
  pl: { colors: ['#FFF', '#DC143C'], label: 'PL' },             // Poland
  kr: { colors: ['#FFF', '#CD2E3A', '#0047A0'], label: 'KR' },  // South Korea
  de: { colors: ['#000', '#DD0000', '#FFCC00'], label: 'DE' },  // Germany
}

function BelgiumFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect x="0" y="0" width="6" height="12" fill="#000" />
      <rect x="6" y="0" width="6" height="12" fill="#FFD700" />
      <rect x="12" y="0" width="6" height="12" fill="#FF0000" />
    </svg>
  )
}

function USAFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect width="18" height="12" fill="#FFF" />
      <rect y="0" width="18" height="0.923" fill="#B22234" />
      <rect y="1.846" width="18" height="0.923" fill="#B22234" />
      <rect y="3.692" width="18" height="0.923" fill="#B22234" />
      <rect y="5.538" width="18" height="0.923" fill="#B22234" />
      <rect y="7.384" width="18" height="0.923" fill="#B22234" />
      <rect y="9.230" width="18" height="0.923" fill="#B22234" />
      <rect y="11.076" width="18" height="0.924" fill="#B22234" />
      <rect width="7.2" height="6.462" fill="#3C3B6E" />
    </svg>
  )
}

function UKFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect width="18" height="12" fill="#012169" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#FFF" strokeWidth="2" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#C8102E" strokeWidth="1" />
      <path d="M9,0 V12 M0,6 H18" stroke="#FFF" strokeWidth="3" />
      <path d="M9,0 V12 M0,6 H18" stroke="#C8102E" strokeWidth="1.8" />
    </svg>
  )
}

function UAEFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect y="0" width="18" height="4" fill="#00732F" />
      <rect y="4" width="18" height="4" fill="#FFF" />
      <rect y="8" width="18" height="4" fill="#000" />
      <rect x="0" y="0" width="4.5" height="12" fill="#FF0000" />
    </svg>
  )
}

function FranceFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect x="0" y="0" width="6" height="12" fill="#002395" />
      <rect x="6" y="0" width="6" height="12" fill="#FFF" />
      <rect x="12" y="0" width="6" height="12" fill="#ED2939" />
    </svg>
  )
}

function PolandFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect y="0" width="18" height="6" fill="#FFF" />
      <rect y="6" width="18" height="6" fill="#DC143C" />
    </svg>
  )
}

function KoreaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect width="18" height="12" fill="#FFF" />
      <circle cx="9" cy="6" r="3" fill="#CD2E3A" />
      <path d="M9,3 A3,3 0 0,1 9,6 A1.5,1.5 0 0,0 9,3" fill="#0047A0" />
      <path d="M9,6 A3,3 0 0,1 9,9 A1.5,1.5 0 0,1 9,6" fill="#0047A0" />
    </svg>
  )
}

function GermanyFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className}>
      <rect y="0" width="18" height="4" fill="#000" />
      <rect y="4" width="18" height="4" fill="#DD0000" />
      <rect y="8" width="18" height="4" fill="#FFCC00" />
    </svg>
  )
}

function GlobalFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className} fill="none" stroke="currentColor" strokeWidth="0.8">
      <rect x="0.5" y="0.5" width="17" height="11" rx="1" className="text-gm-cream/30" />
      <circle cx="9" cy="6" r="4" />
      <ellipse cx="9" cy="6" rx="2" ry="4" />
      <line x1="5" y1="6" x2="13" y2="6" />
    </svg>
  )
}

const FLAG_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  hq: BelgiumFlag,
  us: USAFlag,
  uk: UKFlag,
  ae: UAEFlag,
  fr: FranceFlag,
  pl: PolandFlag,
  kr: KoreaFlag,
  de: GermanyFlag,
}

interface FlagIconProps {
  market: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  withLabel?: boolean
}

export function FlagIcon({ market, size = 'sm', className, withLabel = false }: FlagIconProps) {
  const FlagComponent = FLAG_COMPONENTS[market] || GlobalFlag
  const info = FLAGS[market]
  const sizeClass = size === 'lg' ? 'w-6 h-4' : size === 'md' ? 'w-5 h-3.5' : 'w-4 h-3'

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn(sizeClass, 'inline-block rounded-[2px] overflow-hidden shadow-sm border border-white/10')}>
        <FlagComponent className="w-full h-full" />
      </span>
      {withLabel && (
        <span className={cn(
          'font-medium text-gm-cream/60',
          size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]'
        )}>
          {info?.label || market.toUpperCase()}
        </span>
      )}
    </span>
  )
}
