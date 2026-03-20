/**
 * Brand Configuration
 *
 * Change this file to rebrand the entire app.
 * Colors, logo, fonts, company info — everything in one place.
 */

export const brand = {
  // ─── Company Info ───
  name: 'Greenmood',
  tagline: 'Biophilic Design',
  domain: 'greenmood.be',
  appDomain: 'app.greenmood.be',
  supportEmail: 'jeremie@greenmood.be',

  // ─── Visual Identity ───
  logo: '/logo.svg',
  favicon: '/favicon.ico',

  // ─── Colors (Tailwind CSS values) ───
  colors: {
    // Primary brand color
    primary: '#4a7c59',        // Forest green
    primaryLight: '#A8C49A',   // Sage
    primaryDark: '#2d4a35',

    // Background
    bgDark: '#0d180d',         // Deepest background
    bgCard: '#1a2a1a',         // Card background
    bgHover: 'rgba(255,255,255,0.03)',

    // Text
    textPrimary: '#f0ead6',    // Cream
    textSecondary: 'rgba(240,234,214,0.6)',
    textMuted: 'rgba(240,234,214,0.3)',

    // Accent
    accent: '#A8C49A',         // Sage green
    accentHover: '#8fb382',

    // Status
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
  },

  // ─── Typography ───
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Poppins', sans-serif",
    editorial: "'Spectral', serif",
  },

  // ─── Industry Context (for AI agents) ───
  industry: 'biophilic design',
  productTypes: ['acoustic green walls', 'cork tiles', 'design collection', 'semi-natural trees', 'planter fillings'],
  targetAudience: 'architects, interior designers, facility managers, workplace strategists',
  competitors: ['MOSS UK', 'Nordgröna', 'Quiet Earth Moss', 'GrowUp Greenwalls'],
  certifications: ['WELL v2', 'LEED v5', 'ISO 11654', 'EN 13501-1'],

  // ─── Social Accounts Structure ───
  markets: {
    hq: { name: 'HQ Global', lang: 'en', flag: '🇧🇪', ig: '@greenmood.be', timezone: 'Europe/Brussels' },
    us: { name: 'USA', lang: 'en-US', flag: '🇺🇸', ig: '@greenmood.usa', timezone: 'America/New_York' },
    uk: { name: 'UK', lang: 'en-GB', flag: '🇬🇧', ig: '@greenmood.co.uk', timezone: 'Europe/London' },
    fr: { name: 'France', lang: 'fr', flag: '🇫🇷', ig: '@greenmood.fr', timezone: 'Europe/Paris' },
    ae: { name: 'UAE', lang: 'en', flag: '🇦🇪', ig: '@greenmood.uae', timezone: 'Asia/Dubai' },
    pl: { name: 'Poland', lang: 'pl', flag: '🇵🇱', ig: '@greenmood.pl', timezone: 'Europe/Warsaw' },
    kr: { name: 'South Korea', lang: 'ko', flag: '🇰🇷', ig: '@greenmood.kr', timezone: 'Asia/Seoul' },
    de: { name: 'Germany', lang: 'de', flag: '🇩🇪', ig: '@greenmood.de', timezone: 'Europe/Berlin' },
  },

  // ─── Posting Rules ───
  posting: {
    noPostDays: [0, 6],  // Sunday, Saturday
    instagramDays: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
    linkedinDays: [2, 4],         // Tue, Thu
    maxPostsPerDay: 3,
    defaultTimes: {
      instagram: '12:00',
      linkedin: '09:00',
      stories: '08:00',
      tiktok: '18:00',
    },
  },

  // ─── Module Toggles ───
  modules: {
    calendar: true,
    composer: true,
    approvals: true,
    assets: true,
    knowledgeBase: true,
    intelligence: true,
    analytics: true,
    ads: true,
    agentRuns: true,
    settings: true,
  },
}

export type BrandConfig = typeof brand
