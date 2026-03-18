/**
 * Publishing Layer — Central Registration
 *
 * Registers all platform adapters and exports the publishing interface.
 */

export { registerAdapter, getAdapter, listAdapters } from './adapter'
export type { PublishAdapter, PublishPayload, PlatformCredentials } from './adapter'

import { registerAdapter } from './adapter'
import { LinkedInAdapter } from './linkedin-adapter'
import { InstagramAdapter } from './instagram-adapter'
import { FacebookAdapter } from './facebook-adapter'

// Register all adapters
registerAdapter(new LinkedInAdapter())
registerAdapter(new InstagramAdapter())
registerAdapter(new FacebookAdapter())
