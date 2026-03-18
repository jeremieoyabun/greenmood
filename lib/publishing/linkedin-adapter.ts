/**
 * LinkedIn Publishing Adapter
 *
 * Handles publishing to LinkedIn organization pages.
 * Phase 3 implementation — structure ready.
 */

import type { PublishResult } from '@/lib/types'
import type { PublishAdapter, PublishPayload, PlatformCredentials } from './adapter'

export class LinkedInAdapter implements PublishAdapter {
  readonly platform = 'linkedin'
  readonly name = 'LinkedIn'

  validate(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!payload.text || payload.text.trim().length === 0) {
      errors.push('Post text is required')
    }

    if (payload.text && payload.text.length > 3000) {
      errors.push('Post text exceeds LinkedIn 3000 character limit')
    }

    // Check for links in body (should go in first comment)
    const urlRegex = /https?:\/\/[^\s]+/
    if (payload.text && urlRegex.test(payload.text)) {
      errors.push('LinkedIn posts should not contain links in the body — use firstComment instead')
    }

    return { valid: errors.length === 0, errors }
  }

  async publish(payload: PublishPayload, credentials: PlatformCredentials): Promise<PublishResult> {
    // Phase 3: Implement LinkedIn API v2 publishing
    // POST https://api.linkedin.com/v2/ugcPosts
    //
    // Required:
    // - credentials.accessToken (OAuth 2.0)
    // - credentials.organizationId (urn:li:organization:xxxxx)
    //
    // Flow:
    // 1. Create UGC post with text
    // 2. If mediaUrls, register upload, upload media, then create post with media
    // 3. If firstComment, post comment on the created post
    // 4. Return platform post ID and URL

    void payload
    void credentials

    return {
      success: false,
      error: 'LinkedIn publishing not yet implemented (Phase 3)',
    }
  }
}
