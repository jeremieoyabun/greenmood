import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Publishing API
 * POST /api/publish
 * Body: { postId: string }
 *
 * Publishes a post to Instagram, LinkedIn, or posts first comment
 */
export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId required' }, { status: 400 })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
        calendarSlot: true,
      },
    })

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    const variant = post.variants[0]
    if (!variant) {
      return NextResponse.json({ success: false, error: 'No active variant found' }, { status: 400 })
    }

    // Get the correct token for this market+platform
    const tokenRecord = await prisma.$queryRaw<Array<{ access_token: string }>>`
      SELECT access_token FROM social_tokens
      WHERE workspace_id = ${post.workspaceId}
        AND market = ${post.market}
        AND platform = ${post.platform === 'stories' ? 'instagram' : post.platform}
      LIMIT 1
    `
    const marketToken = tokenRecord?.[0]?.access_token

    // Route to platform adapter
    let result: any

    if (post.platform === 'instagram' || post.platform === 'stories') {
      const token = marketToken || process.env.INSTAGRAM_ACCESS_TOKEN
      if (!token) {
        return NextResponse.json({ success: false, error: `No Instagram token for market "${post.market}". Connect this account in Settings first.` }, { status: 400 })
      }
      result = await publishToInstagram(variant, post.platform, token)
    } else if (post.platform === 'linkedin') {
      const token = marketToken || process.env.LINKEDIN_ACCESS_TOKEN
      if (!token) {
        return NextResponse.json({ success: false, error: `No LinkedIn token for market "${post.market}". Connect this account in Settings first.` }, { status: 400 })
      }
      result = await publishToLinkedIn(variant, token)
    } else {
      return NextResponse.json({ success: false, error: `Platform "${post.platform}" not yet supported` }, { status: 400 })
    }

    if (result.success) {
      // Update post status
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' },
      })

      // Update calendar slot
      if (post.calendarSlot) {
        await prisma.calendarSlot.update({
          where: { id: post.calendarSlot.id },
          data: { status: 'PUBLISHED' },
        })
      }

      // Log approval step
      await prisma.approvalStep.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: 'PUBLISHED',
          action: 'APPROVE',
          comment: `Published to ${post.platform}. Platform ID: ${result.platformId || 'N/A'}`,
        },
      })

      // Post first comment if exists (important for LinkedIn links)
      if (variant.firstComment && result.platformId && post.platform === 'instagram') {
        await postInstagramComment(result.platformId, variant.firstComment)
      }
    }

    return NextResponse.json({
      success: result.success,
      data: {
        postId,
        platform: post.platform,
        platformId: result.platformId,
        message: result.message,
      },
      error: result.error,
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    )
  }
}

// ─── HELPERS ───

async function waitForMediaReady(containerId: string, token: string, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    const res = await fetch(
      `https://graph.instagram.com/v25.0/${containerId}?fields=status_code&access_token=${token}`
    )
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error('Video processing failed')
  }
  throw new Error('Video processing timeout')
}

// ─── INSTAGRAM ADAPTER ───

async function publishToInstagram(variant: any, type: string, token: string) {

  let mediaUrl = variant.imageUrl
  if (!mediaUrl) return { success: false, error: 'No media — Instagram requires an image or video to publish' }

  // Detect if media is a video
  const isVideo = mediaUrl.match(/\.(mp4|mov|webm|avi)/i) || mediaUrl.includes('video/') || mediaUrl.includes('video%2F')

  try {
    // If media is base64, serve it via our public API endpoint so Instagram can fetch it
    if (mediaUrl.startsWith('data:')) {
      mediaUrl = `https://app.greenmood.be/api/image/${variant.id}`
      console.log('Publish: converted base64 to proxy URL:', mediaUrl)
    }

    // Step 1: Get Instagram user ID
    const meRes = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id&access_token=${token}`
    )
    const me = await meRes.json()
    if (!me.user_id) return { success: false, error: 'Failed to get Instagram user ID: ' + JSON.stringify(me) }

    const userId = me.user_id

    // Build caption with hashtags
    let caption = variant.text || ''
    if (variant.hashtags) {
      caption += '\n.\n.\n.\n' + variant.hashtags
    }

    if (type === 'stories') {
      // Create story container (image or video)
      const params = new URLSearchParams({
        media_type: 'STORIES',
        access_token: token,
      })
      if (isVideo) {
        params.set('video_url', mediaUrl)
      } else {
        params.set('image_url', mediaUrl)
      }
      const containerRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message }

      // Wait for video processing if needed
      if (isVideo) {
        await waitForMediaReady(container.id, token)
      }

      // Publish
      const pubParams = new URLSearchParams({ creation_id: container.id, access_token: token })
      const publishRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media_publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: pubParams }
      )
      const published = await publishRes.json()
      if (published.error) return { success: false, error: published.error.message }

      return { success: true, platformId: published.id, message: 'Story published' }
    } else if (isVideo) {
      // Create REELS container for feed video
      const params = new URLSearchParams({
        video_url: mediaUrl,
        caption,
        media_type: 'REELS',
        access_token: token,
      })
      const containerRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message + (container.error.error_user_msg ? ' — ' + container.error.error_user_msg : '') }

      // Wait for video processing
      await waitForMediaReady(container.id, token)

      // Publish
      const pubParams = new URLSearchParams({ creation_id: container.id, access_token: token })
      const publishRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media_publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: pubParams }
      )
      const published = await publishRes.json()
      if (published.error) return { success: false, error: published.error.message }

      return { success: true, platformId: published.id, message: 'Reel published' }
    } else {
      // Create feed image post container
      const params = new URLSearchParams({
        image_url: mediaUrl,
        caption,
        access_token: token,
      })
      const containerRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message + (container.error.error_user_msg ? ' — ' + container.error.error_user_msg : '') }

      // Wait for container to process
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Publish
      const pubParams = new URLSearchParams({ creation_id: container.id, access_token: token })
      const publishRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media_publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: pubParams }
      )
      const published = await publishRes.json()
      if (published.error) return { success: false, error: published.error.message }

      return { success: true, platformId: published.id, message: 'Instagram post published' }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Instagram API error' }
  }
}

async function postInstagramComment(mediaId: string, comment: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return

  try {
    await fetch(`https://graph.instagram.com/v25.0/${mediaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: comment,
        access_token: token,
      }),
    })
  } catch (error) {
    console.error('Failed to post first comment:', error)
  }
}

// ─── LINKEDIN ADAPTER ───

async function publishToLinkedIn(variant: any, accessToken: string) {

  try {
    // Get LinkedIn profile URN
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json()
    if (!profile.sub) return { success: false, error: 'Failed to get LinkedIn profile: ' + JSON.stringify(profile) }

    const authorUrn = `urn:li:person:${profile.sub}`

    // Build post
    const postBody: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: variant.text || '' },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    })

    if (!res.ok) {
      const err = await res.json()
      return { success: false, error: err.message || JSON.stringify(err) }
    }

    const postId = res.headers.get('x-restli-id') || 'published'
    return { success: true, platformId: postId, message: 'LinkedIn post published' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'LinkedIn API error' }
  }
}
