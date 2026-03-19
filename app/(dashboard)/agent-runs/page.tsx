import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { AgentPanel } from './AgentPanel'

async function getAgentRuns() {
  const workspaceId = await getWorkspaceId()
  return prisma.agentRun.findMany({
    where: { workspaceId },
    include: {
      campaign: { select: { title: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

const AGENT_LABELS: Record<string, { label: string; color: string }> = {
  ORCHESTRATOR: { label: 'Orchestrator', color: 'info' },
  EDITORIAL_STRATEGIST: { label: 'Editorial', color: 'purple' },
  CONTENT_GENERATOR: { label: 'Content Gen', color: 'success' },
  FACT_CHECKER: { label: 'Fact Check', color: 'warning' },
  BRAND_GUARDIAN: { label: 'Brand Guard', color: 'info' },
  CHANNEL_ADAPTER: { label: 'Channel Adapt', color: 'purple' },
  VISUAL_BUILDER: { label: 'Visual', color: 'default' },
  SCHEDULER: { label: 'Scheduler', color: 'info' },
  PERFORMANCE_ANALYST: { label: 'Performance', color: 'success' },
  MARKET_INTELLIGENCE: { label: 'Intelligence', color: 'warning' },
}

export default async function AgentRunsPage() {
  const runs = await getAgentRuns()

  // Stats
  const totalRuns = runs.length
  const completedRuns = runs.filter(r => r.status === 'COMPLETED').length
  const failedRuns = runs.filter(r => r.status === 'FAILED').length
  const totalTokens = runs.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)

  return (
    <>
      <PageHeader
        title="Agent Control Center"
        description="Manage autonomous agents and on-demand AI tools"
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Runs', value: totalRuns, color: 'text-gm-cream' },
          { label: 'Completed', value: completedRuns, color: 'text-emerald-400' },
          { label: 'Failed', value: failedRuns, color: 'text-red-400' },
          { label: 'Tokens Used', value: totalTokens.toLocaleString(), color: 'text-amber-400' },
        ].map(s => (
          <Card key={s.label}>
            <span className="text-xs uppercase tracking-wider text-gm-cream/40">{s.label}</span>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Agent Panel — control all agents */}
      <AgentPanel />

      {/* Run History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Run History</CardTitle>
          <Badge variant="default">{runs.length} runs</Badge>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-gm-cream/40 text-center py-8">
              No agent runs yet. Trigger an agent above or wait for the daily crons.
            </p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => {
                const agentConfig = AGENT_LABELS[run.agentType] || { label: run.agentType, color: 'default' }
                return (
                  <div key={run.id} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
                    <StatusDot status={run.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={agentConfig.color as any} size="sm">{agentConfig.label}</Badge>
                        <Badge
                          variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gm-cream/30">
                        <span>{new Date(run.createdAt).toLocaleString()}</span>
                        {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                        {run.tokensUsed && <span>{run.tokensUsed.toLocaleString()} tokens</span>}
                        {run.error && <span className="text-red-400/50 truncate max-w-xs">{run.error}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
