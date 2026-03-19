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

    // Route to platform adapter
    let result: any

    if (post.platform === 'instagram' || post.platform === 'stories') {
      result = await publishToInstagram(variant, post.platform)
    } else if (post.platform === 'linkedin') {
      result = await publishToLinkedIn(variant)
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

// ─── INSTAGRAM ADAPTER ───

async function publishToInstagram(variant: any, type: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return { success: false, error: 'No Instagram access token configured' }

  let imageUrl = variant.imageUrl
  if (!imageUrl) return { success: false, error: 'No image URL — Instagram requires an image to publish' }

  try {
    // If image is base64, serve it via our public API endpoint so Instagram can fetch it
    if (imageUrl.startsWith('data:')) {
      // Use our own image proxy endpoint that serves the base64 from DB
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.greenmood.be'
      imageUrl = `${appUrl}/api/image/${variant.id}`
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
      // Create story container
      const params = new URLSearchParams({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: token,
      })
      const containerRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message }

      // Publish
      const pubParams = new URLSearchParams({ creation_id: container.id, access_token: token })
      const publishRes = await fetch(
        `https://graph.instagram.com/v25.0/${userId}/media_publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: pubParams }
      )
      const published = await publishRes.json()
      if (published.error) return { success: false, error: published.error.message }

      return { success: true, platformId: published.id, message: 'Story published' }
    } else {
      // Create feed post container
      const params = new URLSearchParams({
        image_url: imageUrl,
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

async function publishToLinkedIn(variant: any) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  if (!accessToken) return { success: false, error: 'No LinkedIn access token configured' }

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
