/**
 * Facebook Publishing Adapter
 *
 * Handles publishing to Facebook Pages via the Meta Graph API.
 * Phase 3 implementation — structure ready.
 */

import type { PublishResult } from '@/lib/types'
import type { PublishAdapter, PublishPayload, PlatformCredentials } from './adapter'

export class FacebookAdapter implements PublishAdapter {
  readonly platform = 'facebook'
  readonly name = 'Facebook'

  validate(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!payload.text || payload.text.trim().length === 0) {
      errors.push('Post text is required')
    }

    return { valid: errors.length === 0, errors }
  }

  async publish(payload: PublishPayload, credentials: PlatformCredentials): Promise<PublishResult> {
    // Phase 3: Implement Meta Graph API publishing
    // POST https://graph.facebook.com/v18.0/{page-id}/feed
    //
    // Required:
    // - credentials.accessToken (page access token)
    // - credentials.pageId (Facebook Page ID)
    //
    // For posts with images:
    // POST /{page-id}/photos with url + message
    //
    // For scheduled posts:
    // Add published=false + scheduled_publish_time to the request

    void payload
    void credentials

    return {
      success: false,
      error: 'Facebook publishing not yet implemented (Phase 3)',
    }
  }
}
