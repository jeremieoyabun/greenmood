import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ApprovalQueue } from '@/components/approvals/ApprovalQueue'
import { getServerTranslations } from '@/lib/i18n/server'
import { Eye, CalendarCheck, CheckCircle2, LayoutGrid } from 'lucide-react'

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
  const [{ posts, history }, t] = await Promise.all([getApprovalData(), getServerTranslations()])

  const statusCounts = {
    'To Review': posts.filter(p => ['DRAFT', 'AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED'].includes(p.status)).length,
    'Scheduled': posts.filter(p => ['READY_TO_SCHEDULE', 'SCHEDULED'].includes(p.status)).length,
    'Published': posts.filter(p => p.status === 'PUBLISHED').length,
    'Total': posts.length,
  }

  return (
    <>
      <PageHeader
        title={t.approvals.title}
        description={`${posts.length} ${t.approvals.itemsInPipeline}`}
      />

      {/* Status Pipeline */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {([
          { label: t.approvals.toReview, count: statusCounts['To Review'], color: 'text-amber-400', barColor: 'bg-amber-400', icon: Eye },
          { label: t.approvals.scheduled, count: statusCounts['Scheduled'], color: 'text-indigo-400', barColor: 'bg-indigo-400', icon: CalendarCheck },
          { label: t.approvals.published, count: statusCounts['Published'], color: 'text-emerald-400', barColor: 'bg-emerald-400', icon: CheckCircle2 },
          { label: t.approvals.total, count: statusCounts['Total'], color: 'text-gm-sage', barColor: 'bg-gm-sage', icon: LayoutGrid },
        ]).map((item) => (
          <Card key={item.label}>
            <div className="flex items-center justify-between mb-3">
              <item.icon className={`w-5 h-5 ${item.color} opacity-70`} />
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">{item.label}</span>
            </div>
            <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
            <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full ${item.barColor} opacity-60`} style={{ width: `${Math.min((item.count / Math.max(statusCounts['Total'], 1)) * 100, 100)}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <ApprovalQueue posts={posts} history={history} />
    </>
  )
}
