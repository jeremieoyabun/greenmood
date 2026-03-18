/**
 * Instagram Publishing Adapter
 *
 * Handles publishing to Instagram Business/Professional accounts
 * via the Meta Graph API.
 * Phase 3 implementation — structure ready.
 */

import type { PublishResult } from '@/lib/types'
import type { PublishAdapter, PublishPayload, PlatformCredentials } from './adapter'

export class InstagramAdapter implements PublishAdapter {
  readonly platform = 'instagram'
  readonly name = 'Instagram'

  validate(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!payload.text || payload.text.trim().length === 0) {
      errors.push('Caption is required')
    }

    if (payload.text && payload.text.length > 2200) {
      errors.push('Caption exceeds Instagram 2200 character limit')
    }

    if (!payload.mediaUrls || payload.mediaUrls.length === 0) {
      errors.push('Instagram requires at least one media file')
    }

    if (payload.mediaUrls && payload.mediaUrls.length > 10) {
      errors.push('Instagram carousel supports max 10 items')
    }

    return { valid: errors.length === 0, errors }
  }

  async publish(payload: PublishPayload, credentials: PlatformCredentials): Promise<PublishResult> {
    // Phase 3: Implement Meta Graph API publishing
    // POST https://graph.instagram.com/v18.0/{ig-user-id}/media
    //
    // Flow for single image:
    // 1. Create media container: POST /media with image_url + caption
    // 2. Publish: POST /media_publish with creation_id
    //
    // Flow for carousel:
    // 1. Create container per slide: POST /media with image_url, is_carousel_item=true
    // 2. Create carousel container: POST /media with children=[ids], caption
    // 3. Publish: POST /media_publish with creation_id
    //
    // Required:
    // - credentials.accessToken (long-lived page token)
    // - credentials.igUserId (Instagram Business Account ID)

    void payload
    void credentials

    return {
      success: false,
      error: 'Instagram publishing not yet implemented (Phase 3)',
    }
  }
}
