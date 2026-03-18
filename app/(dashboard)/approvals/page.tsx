import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { EmptyState } from '@/components/ui/EmptyState'
import { MARKETS, POST_STATUS_CONFIG } from '@/lib/constants'

async function getApprovalData() {
  const workspaceId = await getWorkspaceId()

  const posts = await prisma.post.findMany({
    where: {
      workspaceId,
      status: { in: ['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED', 'READY_TO_SCHEDULE'] },
    },
    include: {
      campaign: { select: { title: true } },
      variants: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
      approvalSteps: { orderBy: { createdAt: 'desc' }, take: 1 },
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

  return { posts, recentApprovals }
}

export default async function ApprovalsPage() {
  const { posts, recentApprovals } = await getApprovalData()

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description={`${posts.length} items awaiting review`}
      />

      {/* Status Pipeline */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED', 'READY_TO_SCHEDULE'] as const).map((status) => {
          const config = POST_STATUS_CONFIG[status]
          const count = posts.filter(p => p.status === status).length
          return (
            <Card key={status}>
              <div className="flex items-center gap-2 mb-1">
                <StatusDot status={status} />
                <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{config.label}</span>
              </div>
              <p className="text-2xl font-semibold text-gm-cream">{count}</p>
            </Card>
          )
        })}
      </div>

      {/* Pending Posts */}
      {posts.length === 0 ? (
        <Card>
          <EmptyState
            title="No pending approvals"
            description="Generate content in the Composer to start the approval workflow. Posts move through: Draft → AI Generated → Fact Checked → Brand Approved → Ready to Schedule."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const config = POST_STATUS_CONFIG[post.status as keyof typeof POST_STATUS_CONFIG]
            const variant = post.variants[0]
            return (
              <Card key={post.id}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={config ? 'info' : 'default'} size="sm">
                        {config?.label || post.status}
                      </Badge>
                      <span className="text-xs text-gm-cream/50">
                        {MARKETS[post.market]?.emoji} {MARKETS[post.market]?.name} — {post.platform}
                      </span>
                      {post.campaign && (
                        <span className="text-[10px] text-gm-cream/30">{post.campaign.title}</span>
                      )}
                    </div>
                    {variant && (
                      <p className="text-xs text-gm-cream/60 line-clamp-2">{variant.text}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Approval Activity */}
      {recentApprovals.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Recent Approval Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentApprovals.map((step) => (
                <div key={step.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <StatusDot status={step.toStatus} />
                  <span className="text-[10px] text-gm-cream/50 flex-1">
                    {step.fromStatus} → {step.toStatus}
                    {step.post && ` — ${MARKETS[step.post.market]?.emoji || ''} ${step.post.platform}`}
                  </span>
                  <Badge variant={step.action === 'APPROVE' ? 'success' : step.action === 'REJECT' ? 'danger' : 'warning'} size="sm">
                    {step.action}
                  </Badge>
                  <span className="text-[9px] text-gm-cream/20">{new Date(step.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
