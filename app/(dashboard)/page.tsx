import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'

async function getDashboardData() {
  const workspaceId = await getWorkspaceId()

  const [kbCount, postCount, agentRunCount, competitorCount, pillarCount] = await Promise.all([
    prisma.knowledgeBaseEntry.count({ where: { workspaceId, isActive: true } }),
    prisma.post.count({ where: { workspaceId } }),
    prisma.agentRun.count({ where: { workspaceId } }),
    prisma.competitorEntity.count({ where: { isActive: true } }),
    prisma.contentPillar.count({ where: { workspaceId } }),
  ])

  const recentRuns = await prisma.agentRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, agentType: true, status: true, createdAt: true, durationMs: true },
  })

  return { kbCount, postCount, agentRunCount, competitorCount, pillarCount, recentRuns }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Greenmood Marketing Operating System"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Knowledge Base', value: data.kbCount, sub: 'entries' },
          { label: 'Content Pillars', value: data.pillarCount, sub: 'active' },
          { label: 'Competitors Tracked', value: data.competitorCount, sub: 'monitored' },
          { label: 'Agent Runs', value: data.agentRunCount, sub: 'total' },
        ].map((stat) => (
          <Card key={stat.label}>
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{stat.label}</span>
            <p className="text-2xl font-semibold text-gm-cream mt-1">{stat.value}</p>
            <p className="text-[10px] text-gm-cream/25 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent Agent Runs */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Agent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentRuns.length === 0 ? (
              <p className="text-xs text-gm-cream/40 py-4 text-center">
                No agent runs yet. Use the Composer to generate your first content.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
                    <StatusDot status={run.status} />
                    <span className="text-xs text-gm-cream/70 flex-1">
                      {run.agentType.replace(/_/g, ' ')}
                    </span>
                    <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'} size="sm">
                      {run.status}
                    </Badge>
                    {run.durationMs && (
                      <span className="text-[10px] text-gm-cream/25">{(run.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Create New Post', href: '/composer', icon: '✏️' },
                { label: 'View Calendar', href: '/calendar', icon: '📅' },
                { label: 'Review Approvals', href: '/approvals', icon: '✅' },
                { label: 'Browse Knowledge Base', href: '/knowledge-base', icon: '📚' },
                { label: 'Intelligence Hub', href: '/intelligence', icon: '📡' },
                { label: 'Agent Runs', href: '/agent-runs', icon: '🤖' },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gm-cream/60 hover:text-gm-cream hover:bg-white/[0.03] transition-colors"
                >
                  <span>{action.icon}</span>
                  {action.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
