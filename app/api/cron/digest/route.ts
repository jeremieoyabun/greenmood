import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

/**
 * Daily Digest — sends morning email via Brevo
 * Runs at 7h15 UTC (8h15 Brussels) after all agents have run
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 })
  }

  try {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // ─── Gather data ───

    // Today's posts
    const todaySlots = await prisma.calendarSlot.findMany({
      where: { workspaceId: WORKSPACE_ID, date: { gte: today, lt: tomorrow } },
      include: {
        post: {
          select: { id: true, status: true, market: true, platform: true,
            variants: { where: { isActive: true }, take: 1, select: { text: true } } },
        },
      },
      orderBy: { time: 'asc' },
    })

    // Pending approvals
    const pendingCount = await prisma.post.count({
      where: { workspaceId: WORKSPACE_ID, status: { in: ['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED'] } },
    })

    // Scheduled posts
    const scheduledCount = await prisma.post.count({
      where: { workspaceId: WORKSPACE_ID, status: { in: ['SCHEDULED', 'READY_TO_SCHEDULE'] } },
    })

    // Top intelligence signals (last 24h)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const newSignals = await prisma.intelligenceSignal.findMany({
      where: { detectedAt: { gte: yesterday }, isDuplicate: false, category: { not: 'social_comment' } },
      orderBy: { score: 'desc' },
      take: 5,
      select: { title: true, category: true, score: true, urgency: true, summary: true },
    })

    // New comments flagged
    const newComments = await prisma.intelligenceSignal.findMany({
      where: { detectedAt: { gte: yesterday }, category: 'social_comment', urgency: 'act_now' },
      take: 5,
      select: { title: true, summary: true, recommendedAction: true },
    })

    // Recent agent runs (last 24h)
    const recentRuns = await prisma.agentRun.findMany({
      where: { detectedAt: { gte: yesterday } },
      select: { agentType: true, status: true },
    })
    const completedRuns = recentRuns.filter(r => r.status === 'COMPLETED').length
    const failedRuns = recentRuns.filter(r => r.status === 'FAILED').length

    // ─── Build email HTML ───

    const MARKET_FLAGS: Record<string, string> = {
      hq: '🇧🇪', us: '🇺🇸', uk: '🇬🇧', ae: '🇦🇪', fr: '🇫🇷', pl: '🇵🇱',
    }
    const PLATFORM_ICONS: Record<string, string> = {
      instagram: '📸', linkedin: '💼', stories: '📱', tiktok: '🎵', facebook: '📘',
    }

    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    const todayPostsHtml = todaySlots.length === 0
      ? '<p style="color: #888;">No posts scheduled for today.</p>'
      : todaySlots.map(slot => {
          const p = slot.post
          if (!p) return ''
          const flag = MARKET_FLAGS[p.market] || '🌐'
          const icon = PLATFORM_ICONS[p.platform] || '📝'
          const caption = p.variants?.[0]?.text?.substring(0, 80) || 'No caption'
          const statusColor = p.status === 'SCHEDULED' ? '#4ade80' : p.status === 'PUBLISHED' ? '#22d3ee' : '#fbbf24'
          return `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #1a2a1a;">${flag} ${icon}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #1a2a1a; color: #e0e0d0;">${caption}...</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #1a2a1a;"><span style="color: ${statusColor}; font-weight: 600;">${p.status.replace(/_/g, ' ')}</span></td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #1a2a1a; color: #888;">${slot.time || ''}</td>
          </tr>`
        }).join('')

    const signalsHtml = newSignals.length === 0
      ? '<p style="color: #888;">No new signals.</p>'
      : newSignals.map(s => {
          const urgencyColor = s.urgency === 'act_now' ? '#ef4444' : s.urgency === 'this_week' ? '#f59e0b' : '#6b7280'
          return `<div style="padding: 10px; margin-bottom: 8px; background: #1a2a1a; border-radius: 8px; border-left: 3px solid ${urgencyColor};">
            <div style="font-size: 13px; color: #e0e0d0; font-weight: 600;">${s.title}</div>
            <div style="font-size: 12px; color: #888; margin-top: 4px;">${s.summary?.substring(0, 120) || ''}</div>
          </div>`
        }).join('')

    const commentsHtml = newComments.length === 0
      ? ''
      : `<h3 style="color: #a8c49a; margin-top: 24px;">💬 Priority Comments</h3>
         ${newComments.map(c => `<div style="padding: 10px; margin-bottom: 8px; background: #1a2a1a; border-radius: 8px;">
           <div style="font-size: 13px; color: #e0e0d0;">${c.title}</div>
           <div style="font-size: 12px; color: #888; margin-top: 4px;">"${c.summary?.substring(0, 100)}"</div>
           <div style="font-size: 12px; color: #a8c49a; margin-top: 4px;">→ ${c.recommendedAction?.substring(0, 100)}</div>
         </div>`).join('')}`

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0d180d; color: #e0e0d0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 24px; font-weight: 700; color: #a8c49a;">Greenmood</div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">Daily Marketing Digest</div>
      </div>

      <div style="font-size: 14px; color: #888; margin-bottom: 24px; text-align: center;">${dateStr}</div>

      <!-- Stats -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: #1a2a1a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #fbbf24;">${pendingCount}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">PENDING REVIEW</div>
        </div>
        <div style="flex: 1; background: #1a2a1a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #4ade80;">${scheduledCount}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">READY TO PUBLISH</div>
        </div>
        <div style="flex: 1; background: #1a2a1a; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #22d3ee;">${todaySlots.length}</div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">TODAY'S POSTS</div>
        </div>
      </div>

      <!-- Today's Posts -->
      <h3 style="color: #a8c49a; margin-bottom: 12px;">📅 Today's Content</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${todayPostsHtml}
      </table>

      <!-- Signals -->
      <h3 style="color: #a8c49a; margin-bottom: 12px;">📡 Intelligence Signals</h3>
      ${signalsHtml}

      ${commentsHtml}

      <!-- Agent Status -->
      <h3 style="color: #a8c49a; margin-top: 24px; margin-bottom: 12px;">🤖 Agent Activity (24h)</h3>
      <div style="background: #1a2a1a; border-radius: 8px; padding: 12px; font-size: 13px;">
        <span style="color: #4ade80;">✓ ${completedRuns} completed</span>
        ${failedRuns > 0 ? `<span style="color: #ef4444; margin-left: 16px;">✕ ${failedRuns} failed</span>` : ''}
        <span style="color: #888; margin-left: 16px;">${recentRuns.length} total runs</span>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://app.greenmood.be" style="display: inline-block; background: #a8c49a; color: #0d180d; padding: 12px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">Open Dashboard</a>
      </div>

      <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #444;">
        Greenmood Marketing OS — Autonomous AI Marketing Machine
      </div>
    </div>`

    // ─── Send via Brevo ───

    const recipients = [
      { email: 'jeremie@greenmood.be', name: 'Jeremie Kuntzinger' },
      { email: 'marketing@greenmood.ae', name: 'Heide Malaluan' },
    ]

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Greenmood Marketing OS', email: 'noreply@greenmood.be' },
        to: recipients,
        subject: `📊 Daily Digest — ${pendingCount} pending, ${todaySlots.length} posts today`,
        htmlContent: html,
      }),
    })

    const brevoData = await brevoRes.json()

    return NextResponse.json({
      success: true,
      emailSent: brevoRes.ok,
      brevoResponse: brevoData,
      stats: { pendingCount, scheduledCount, todayPosts: todaySlots.length, newSignals: newSignals.length, newComments: newComments.length },
    })
  } catch (error) {
    console.error('Digest error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Digest failed' },
      { status: 500 }
    )
  }
}
