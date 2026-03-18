import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { EmptyState } from '@/components/ui/EmptyState'
import { MARKETS, POST_STATUS_CONFIG } from '@/lib/constants'
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue'

async function getApprovalData() {
  const workspaceId = await getWorkspaceId()

  const posts = await prisma.post.findMany({
    where: {
      workspaceId,
      status: { in: ['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED', 'READY_TO_SCHEDULE', 'SCHEDULED', 'REJECTED'] },
    },
    include: {
      campaign: { select: { title: true } },
      variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
      approvalSteps: { orderBy: { createdAt: 'desc' }, take: 1 },
      calendarSlot: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const recentApprovals = await prisma.approvalStep.findMany({
    include: {
      post: { select: { market: true, platform: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Serialize for client component
  const serializedPosts = posts.map(p => ({
    id: p.id,
    status: p.status,
    market: p.market,
    platform: p.platform,
    campaign: p.campaign,
    variant: p.variants[0] ? {
      id: p.variants[0].id,
      text: p.variants[0].text,
      hashtags: p.variants[0].hashtags,
      firstComment: p.variants[0].firstComment,
      notes: p.variants[0].notes,
      timing: p.variants[0].timing,
      imageUrl: (p.variants[0] as any).imageUrl || null,
    } : null,
    lastStep: p.approvalSteps[0] ? {
      comment: p.approvalSteps[0].comment,
      action: p.approvalSteps[0].action,
    } : null,
    date: p.calendarSlot?.date?.toISOString() || null,
    time: p.calendarSlot?.time || null,
  }))

  const serializedHistory = recentApprovals.map(s => ({
    id: s.id,
    fromStatus: s.fromStatus,
    toStatus: s.toStatus,
    action: s.action,
    comment: s.comment,
    createdAt: s.createdAt.toISOString(),
    post: s.post ? { market: s.post.market, platform: s.post.platform } : null,
    reviewer: s.reviewer ? { name: s.reviewer.name } : null,
  }))

  return { posts: serializedPosts, history: serializedHistory }
}

export default async function ApprovalsPage() {
  const { posts, history } = await getApprovalData()

  const statusCounts = {
    AI_GENERATED: posts.filter(p => p.status === 'AI_GENERATED').length,
    FACT_CHECKED: posts.filter(p => p.status === 'FACT_CHECKED').length,
    BRAND_APPROVED: posts.filter(p => p.status === 'BRAND_APPROVED').length,
    READY_TO_SCHEDULE: posts.filter(p => p.status === 'READY_TO_SCHEDULE').length,
  }

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description={`${posts.length} items in pipeline`}
      />

      {/* Status Pipeline */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
          const config = POST_STATUS_CONFIG[status as keyof typeof POST_STATUS_CONFIG]
          return (
            <Card key={status}>
              <div className="flex items-center gap-2 mb-1">
                <StatusDot status={status} />
                <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{config?.label || status}</span>
              </div>
              <p className="text-2xl font-semibold text-gm-cream">{count}</p>
            </Card>
          )
        })}
      </div>

      <ApprovalQueue posts={posts} history={history} />
    </>
  )
}
