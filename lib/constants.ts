// ─── Markets ───

export interface MarketConfig {
  id: string
  name: string
  lang: string
  emoji: string
  ig: string
  li: string
  color: string
  timezone: string
}

export const MARKETS: Record<string, MarketConfig> = {
  hq: {
    id: 'hq',
    name: 'HQ Global',
    lang: 'en',
    emoji: '🇧🇪',
    ig: '@greenmood.be',
    li: 'Greenmood HQ',
    color: '#A8C49A',
    timezone: 'Europe/Brussels',
  },
  us: {
    id: 'us',
    name: 'USA',
    lang: 'en-US',
    emoji: '🇺🇸',
    ig: '@greenmood.usa',
    li: 'Greenmood USA',
    color: '#5B8DB8',
    timezone: 'America/New_York',
  },
  uk: {
    id: 'uk',
    name: 'UK',
    lang: 'en-GB',
    emoji: '🇬🇧',
    ig: '@greenmood.co.uk',
    li: 'Greenmood UK',
    color: '#B85B5B',
    timezone: 'Europe/London',
  },
  fr: {
    id: 'fr',
    name: 'France',
    lang: 'fr',
    emoji: '🇫🇷',
    ig: '@greenmood.fr',
    li: 'Greenmood France',
    color: '#5B6FB8',
    timezone: 'Europe/Paris',
  },
  ae: {
    id: 'ae',
    name: 'UAE',
    lang: 'en',
    emoji: '🇦🇪',
    ig: '@greenmood.uae',
    li: 'Greenmood UAE',
    color: '#C4A46C',
    timezone: 'Asia/Dubai',
  },
  pl: {
    id: 'pl',
    name: 'Poland',
    lang: 'pl',
    emoji: '🇵🇱',
    ig: '@greenmood.pl',
    li: 'Greenmood Poland',
    color: '#B85B8D',
    timezone: 'Europe/Warsaw',
  },
  kr: {
    id: 'kr',
    name: 'South Korea',
    lang: 'ko',
    emoji: '🇰🇷',
    ig: '@greenmood.kr',
    li: 'Greenmood Korea',
    color: '#8DB85B',
    timezone: 'Asia/Seoul',
  },
  de: {
    id: 'de',
    name: 'Germany',
    lang: 'de',
    emoji: '🇩🇪',
    ig: '@greenmood.de',
    li: 'Greenmood Germany',
    color: '#B8A05B',
    timezone: 'Europe/Berlin',
  },
}

// ─── Platforms ───

export interface PlatformConfig {
  id: string
  name: string
  icon: string
  color: string
  maxLength?: number
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'Linkedin',
    color: '#0A66C2',
    maxLength: 3000,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'Instagram',
    color: '#E4405F',
    maxLength: 2200,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'Facebook',
    color: '#1877F2',
    maxLength: 63206,
  },
  stories: {
    id: 'stories',
    name: 'Stories',
    icon: 'Smartphone',
    color: '#FF6B6B',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'Pin',
    color: '#BD081C',
    maxLength: 500,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'Video',
    color: '#000000',
    maxLength: 2200,
  },
}

// ─── Content Types ───

export interface ContentTypeConfig {
  id: string
  label: string
  icon: string
  description: string
}

export const CONTENT_TYPES: ContentTypeConfig[] = [
  { id: 'article', label: 'Article / Blog Post', icon: 'FileText', description: 'Long-form content piece' },
  { id: 'project', label: 'Project Showcase', icon: 'Building2', description: 'Completed installation or case study' },
  { id: 'product', label: 'Product Highlight', icon: 'Leaf', description: 'Product feature or launch' },
  { id: 'event', label: 'Event / Tradeshow', icon: 'MapPin', description: 'Trade show, event, or exhibition' },
  { id: 'education', label: 'Educational Carousel', icon: 'GraduationCap', description: 'Technical or educational content' },
  { id: 'behind', label: 'Behind the Scenes', icon: 'Wrench', description: 'Factory, process, or team content' },
]

// ─── Content Pillars ───

export const CONTENT_PILLARS = [
  { id: 'innovation', name: 'Product Innovation & Design', color: '#A8C49A' },
  { id: 'projects', name: 'Project Showcase', color: '#5B8DB8' },
  { id: 'sustainability', name: 'Sustainability & Wellness', color: '#8DB85B' },
  { id: 'education', name: 'Education & Specifications', color: '#C4A46C' },
  { id: 'behind', name: 'Behind the Scenes', color: '#B85B8D' },
  { id: 'trends', name: 'Industry & Trends', color: '#5B6FB8' },
]

// ─── Post Statuses ───

export const POST_STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: '#6B7280', bgColor: 'bg-gray-500/20' },
  AI_GENERATED: { label: 'AI Generated', color: '#8B5CF6', bgColor: 'bg-purple-500/20' },
  FACT_CHECKED: { label: 'Fact Checked', color: '#3B82F6', bgColor: 'bg-blue-500/20' },
  BRAND_APPROVED: { label: 'Brand Approved', color: '#10B981', bgColor: 'bg-emerald-500/20' },
  READY_TO_SCHEDULE: { label: 'Ready', color: '#F59E0B', bgColor: 'bg-amber-500/20' },
  SCHEDULED: { label: 'Scheduled', color: '#6366F1', bgColor: 'bg-indigo-500/20' },
  PUBLISHED: { label: 'Published', color: '#22C55E', bgColor: 'bg-green-500/20' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bgColor: 'bg-red-500/20' },
} as const

// ─── Brand Colors ───

export const BRAND_COLORS = {
  forest: '#1B3A2D',
  copper: '#8B3E23',
  cream: '#F4F2EE',
  sage: '#A8C49A',
  dark: '#0F1A12',
  gold: '#C4A46C',
  light: '#E8E4DE',
} as const

// ─── Navigation ───

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/calendar', label: 'Calendar', icon: 'Calendar' },
  { href: '/composer', label: 'Composer', icon: 'PenTool' },
  { href: '/assets', label: 'Assets', icon: 'Image' },
  { href: '/approvals', label: 'Approvals', icon: 'CheckCircle' },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: 'Database' },
  { href: '/intelligence', label: 'Intelligence', icon: 'Radar' },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { href: '/agent-runs', label: 'Agent Runs', icon: 'Bot' },
  { href: '/settings', label: 'Settings', icon: 'Settings' },
] as const
