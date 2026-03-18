import { NextRequest, NextResponse } from 'next/server'

/**
 * Publishing API — Phase 3
 *
 * This endpoint will handle:
 * - POST /api/publish — trigger publication of a post
 * - Validates readiness via the Scheduler agent
 * - Routes to the appropriate platform adapter
 * - Creates publication jobs with retry logic
 */
export async function POST(req: NextRequest) {
  void req
  return NextResponse.json(
    {
      success: false,
      error: 'Publishing is not yet implemented. This is a Phase 3 feature.',
      info: {
        supportedPlatforms: ['linkedin', 'instagram', 'facebook'],
        requiredSetup: [
          'Configure Meta Graph API credentials',
          'Configure LinkedIn API credentials',
          'Connect social accounts in Settings',
        ],
      },
    },
    { status: 501 }
  )
}
