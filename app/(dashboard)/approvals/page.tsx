import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue'

async function getApprovalData() {
  const workspaceId = await getWorkspaceId()

  const posts = await prisma.post.findMany({
    where: {
      workspaceId,
      status: { in: ['DRAFT', 'AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED', 'READY_TO_SCHEDULE', 'SCHEDULED', 'REJECTED'] },
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
    'To Review': posts.filter(p => ['DRAFT', 'AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED'].includes(p.status)).length,
    'Scheduled': posts.filter(p => ['READY_TO_SCHEDULE', 'SCHEDULED'].includes(p.status)).length,
    'Published': posts.filter(p => p.status === 'PUBLISHED').length,
    'Total': posts.length,
  }

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description={`${posts.length} items in pipeline`}
      />

      {/* Status Pipeline */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {([
          { label: 'To Review', count: statusCounts['To Review'], color: 'bg-amber-400', accent: 'border-amber-400/40' },
          { label: 'Scheduled', count: statusCounts['Scheduled'], color: 'bg-indigo-400', accent: 'border-indigo-400/40' },
          { label: 'Published', count: statusCounts['Published'], color: 'bg-emerald-400', accent: 'border-emerald-400/40' },
          { label: 'Total', count: statusCounts['Total'], color: 'bg-gm-sage', accent: 'border-gm-sage/40' },
        ]).map((item) => (
          <Card key={item.label} className={`border-l-[3px] ${item.accent}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/50 font-semibold">{item.label}</span>
            </div>
            <p className="text-2xl font-semibold text-gm-cream">{item.count}</p>
          </Card>
        ))}
      </div>

      <ApprovalQueue posts={posts} history={history} />
    </>
  )
}
