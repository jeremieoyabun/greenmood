import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

// Cost per 1M tokens (EUR approx)
const COSTS = {
  'claude-sonnet-4-20250514': { input: 2.7, output: 13.5 },
  'claude-haiku-4-5-20251001': { input: 0.7, output: 3.5 },
  default: { input: 2.7, output: 13.5 },
}

export async function GET() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    publishedCount,
    publishedByPlatform,
    publishedByMarket,
    agentRuns,
    totalTokens,
    signalCount,
    kbCount,
    topPosts,
  ] = await Promise.all([
    prisma.post.count({
      where: { workspaceId: WORKSPACE_ID, status: 'PUBLISHED', updatedAt: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.$queryRaw<Array<{ platform: string; count: bigint }>>`
      SELECT platform, COUNT(*) as count FROM posts
      WHERE workspace_id = ${WORKSPACE_ID} AND status = 'PUBLISHED'
        AND updated_at >= ${monthStart} AND updated_at < ${monthEnd}
      GROUP BY platform ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ market: string; count: bigint }>>`
      SELECT market, COUNT(*) as count FROM posts
      WHERE workspace_id = ${WORKSPACE_ID} AND status = 'PUBLISHED'
        AND updated_at >= ${monthStart} AND updated_at < ${monthEnd}
      GROUP BY market ORDER BY count DESC
    `,
    prisma.agentRun.count({
      where: { workspaceId: WORKSPACE_ID, createdAt: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(tokens_used), 0) as total FROM agent_runs
      WHERE workspace_id = ${WORKSPACE_ID}
        AND created_at >= ${monthStart} AND created_at < ${monthEnd}
    `,
    prisma.intelligenceSignal.count({
      where: { detectedAt: { gte: monthStart, lt: monthEnd }, isDuplicate: false },
    }),
    prisma.knowledgeBaseEntry.count({
      where: { workspaceId: WORKSPACE_ID, isActive: true },
    }),
    prisma.$queryRaw<Array<{ post_id: string; likes: bigint; comments: bigint; text: string }>>`
      SELECT a.post_id,
        COALESCE(MAX((a.data->>'like_count')::int), 0) as likes,
        COALESCE(MAX((a.data->>'comments_count')::int), 0) as comments,
        COALESCE((SELECT pv.text FROM post_variants pv WHERE pv.post_id = a.post_id AND pv.is_active = true LIMIT 1), '') as text
      FROM analytics_snapshots a
      WHERE a.date >= ${monthStart} AND a.date < ${monthEnd}
      GROUP BY a.post_id
      ORDER BY (COALESCE(MAX((a.data->>'like_count')::int), 0) + COALESCE(MAX((a.data->>'comments_count')::int), 0)) DESC
      LIMIT 3
    `,
  ])

  const tokens = Number(totalTokens[0]?.total || 0)
  // Estimate cost (assume 70% haiku, 30% sonnet, 60% input / 40% output)
  const estimatedCostEur = (
    tokens * 0.7 * 0.6 * COSTS['claude-haiku-4-5-20251001'].input / 1_000_000 +
    tokens * 0.7 * 0.4 * COSTS['claude-haiku-4-5-20251001'].output / 1_000_000 +
    tokens * 0.3 * 0.6 * COSTS['claude-sonnet-4-20250514'].input / 1_000_000 +
    tokens * 0.3 * 0.4 * COSTS['claude-sonnet-4-20250514'].output / 1_000_000
  )

  return NextResponse.json({
    success: true,
    data: {
      month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      postsPublished: publishedCount,
      byPlatform: publishedByPlatform.map(p => ({ platform: p.platform, count: Number(p.count) })),
      byMarket: publishedByMarket.map(m => ({ market: m.market, count: Number(m.count) })),
      agentRuns,
      totalTokens: tokens,
      estimatedCostEur: Math.round(estimatedCostEur * 100) / 100,
      signalsGenerated: signalCount,
      kbEntries: kbCount,
      topPosts: topPosts.map(p => ({
        postId: p.post_id,
        likes: Number(p.likes),
        comments: Number(p.comments),
        preview: (p.text || '').substring(0, 60),
      })),
    },
  })
}
