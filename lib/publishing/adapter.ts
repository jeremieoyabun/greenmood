/**
 * Publishing Adapter Interface
 *
 * Adapter-based architecture for social media publishing.
 * Each platform implements this interface.
 */

import type { PublishResult } from '@/lib/types'

export interface PublishPayload {
  text: string
  hashtags?: string
  firstComment?: string
  mediaUrls?: string[]
  scheduledAt?: Date
}

export interface PublishAdapter {
  readonly platform: string
  readonly name: string

  /**
   * Validate that the payload meets platform requirements.
   */
  validate(payload: PublishPayload): { valid: boolean; errors: string[] }

  /**
   * Publish content to the platform.
   */
  publish(payload: PublishPayload, credentials: PlatformCredentials): Promise<PublishResult>

  /**
   * Check the status of a published post.
   */
  getStatus?(platformPostId: string, credentials: PlatformCredentials): Promise<{ exists: boolean; url?: string }>
}

export interface PlatformCredentials {
  accessToken: string
  accountId?: string
  pageId?: string
  [key: string]: string | undefined
}

// ─── Registry ───

const adapters: Map<string, PublishAdapter> = new Map()

export function registerAdapter(adapter: PublishAdapter): void {
  adapters.set(adapter.platform, adapter)
}

export function getAdapter(platform: string): PublishAdapter | undefined {
  return adapters.get(platform)
}

export function listAdapters(): string[] {
  return Array.from(adapters.keys())
}
