/**
 * Market Intelligence Types
 *
 * Types for the intelligence engine: sources, signals, digests.
 */

export interface IntelligenceSource {
  id: string
  name: string
  type: 'publication' | 'competitor' | 'social' | 'newsletter' | 'event' | 'watchlist'
  url: string
  country?: string
  topics: string[]
  isActive: boolean
  lastFetchedAt?: Date
}

export interface CompetitorProfile {
  id: string
  name: string
  website: string
  socialHandles: Record<string, string>
  country: string
  products: string[]
  positioning: string
  lastUpdated: Date
}

export interface SignalScore {
  relevance: number    // 0-1, how relevant to Greenmood
  urgency: number      // 0-1, how time-sensitive
  confidence: number   // 0-1, how confident in the data
  actionability: number // 0-1, how actionable
  composite: number    // weighted average
}

export interface DigestConfig {
  type: 'daily' | 'weekly' | 'monthly'
  focusTopics?: string[]
  focusCompetitors?: string[]
  focusCountries?: string[]
  maxSignals?: number
  minConfidence?: number
}

export interface ProcessedSignal {
  id: string
  title: string
  source: IntelligenceSource
  country: string
  category: string
  competitor?: string
  summary: string
  whyItMatters: string
  score: SignalScore
  recommendedAction: string
  recommendedFormat: string
  recommendedChannel: string
  recommendedTiming: string
  detectedAt: Date
  expiresAt?: Date
  isDuplicate: boolean
  relatedSignals: string[]
}
