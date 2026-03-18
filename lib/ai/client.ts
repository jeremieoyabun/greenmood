import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY is not set. AI features will not work.')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Model constants
export const MODELS = {
  /** Primary model for content generation, strategy, intelligence */
  SONNET: 'claude-sonnet-4-20250514',
  /** Fast model for validation, fact-checking, formatting */
  HAIKU: 'claude-haiku-4-5-20251001',
} as const

export type ModelId = (typeof MODELS)[keyof typeof MODELS]
