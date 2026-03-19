import { Instagram, Linkedin, Facebook } from 'lucide-react'
import { cn } from '@/lib/utils'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.79a4.83 4.83 0 01-1-.1z"/>
  </svg>
)

const StoriesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
    <circle cx="12" cy="12" r="6" />
  </svg>
)

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: TikTokIcon,
  stories: StoriesIcon,
}

const COLORS: Record<string, string> = {
  instagram: 'text-pink-400',
  linkedin: 'text-sky-400',
  facebook: 'text-blue-400',
  tiktok: 'text-white',
  stories: 'text-purple-400',
}

interface SocialIconProps {
  platform: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  withLabel?: boolean
}

export function SocialIcon({ platform, className, size = 'sm', withLabel = false }: SocialIconProps) {
  const Icon = ICONS[platform] || Instagram
  const color = COLORS[platform] || 'text-gm-cream/50'
  const sizeClass = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  if (withLabel) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <Icon className={cn(sizeClass, color)} />
        <span className={cn('capitalize', color, size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]')}>
          {platform}
        </span>
      </span>
    )
  }

  return <Icon className={cn(sizeClass, color, className)} />
}

interface MarketBadgeProps {
  market: string
  platform: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const MARKET_FLAGS: Record<string, string> = {
  hq: '🇧🇪',
  us: '🇺🇸',
  uk: '🇬🇧',
  ae: '🇦🇪',
  fr: '🇫🇷',
  pl: '🇵🇱',
  kr: '🇰🇷',
  de: '🇩🇪',
}

export function MarketBadge({ market, platform, className, size = 'sm' }: MarketBadgeProps) {
  const flag = MARKET_FLAGS[market] || '🌐'
  const textSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]'
  const flagSize = size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={flagSize}>{flag}</span>
      <SocialIcon platform={platform} size={size} />
    </span>
  )
}
