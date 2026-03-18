import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'

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
  EDITORIAL_STRATEGIST: { label: 'Editorial Strategist', color: 'purple' },
  CONTENT_GENERATOR: { label: 'Content Generator', color: 'success' },
  FACT_CHECKER: { label: 'Fact Checker', color: 'warning' },
  BRAND_GUARDIAN: { label: 'Brand Guardian', color: 'info' },
  CHANNEL_ADAPTER: { label: 'Channel Adapter', color: 'purple' },
  VISUAL_BUILDER: { label: 'Visual Builder', color: 'default' },
  SCHEDULER: { label: 'Scheduler', color: 'info' },
  PERFORMANCE_ANALYST: { label: 'Performance Analyst', color: 'success' },
  MARKET_INTELLIGENCE: { label: 'Market Intelligence', color: 'warning' },
}

export default async function AgentRunsPage() {
  const runs = await getAgentRuns()

  return (
    <>
      <PageHeader
        title="Agent Runs"
        description={`Audit trail — ${runs.length} agent executions logged`}
      />

      {runs.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-xs text-gm-cream/40 text-center py-12">
              No agent runs yet. Use the Composer to generate content and trigger your first agent run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const agentConfig = AGENT_LABELS[run.agentType] || { label: run.agentType, color: 'default' }
            return (
              <Card key={run.id}>
                <div className="flex items-center gap-4">
                  <StatusDot status={run.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={agentConfig.color as any} size="sm">{agentConfig.label}</Badge>
                      <Badge
                        variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {run.status}
                      </Badge>
                      {run.campaign && (
                        <span className="text-[10px] text-gm-cream/30">Campaign: {run.campaign.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gm-cream/25">
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                      {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                      {run.tokensUsed && <span>{run.tokensUsed.toLocaleString()} tokens</span>}
                      {run.error && <span className="text-red-400/60 truncate max-w-xs">{run.error}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
