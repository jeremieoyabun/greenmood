import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddCompetitorButton } from '@/components/intelligence/AddCompetitorButton'

async function getIntelData() {
  const [competitors, signals, sources] = await Promise.all([
    prisma.competitorEntity.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.intelligenceSignal.findMany({
      where: { isDuplicate: false },
      include: { competitor: { select: { name: true } }, source: { select: { name: true } } },
      orderBy: [{ score: 'desc' }, { detectedAt: 'desc' }],
      take: 30,
    }),
    prisma.intelligenceSource.findMany({ where: { isActive: true } }),
  ])
  return { competitors, signals, sources }
}

const CATEGORY_STYLES: Record<string, { label: string; color: 'danger' | 'warning' | 'info' | 'success' | 'default' | 'purple' }> = {
  competitor_move: { label: 'Competitor', color: 'danger' },
  trend: { label: 'Trend', color: 'purple' },
  event: { label: 'Event', color: 'warning' },
  insight: { label: 'Insight', color: 'success' },
  market_shift: { label: 'Market', color: 'info' },
}

const URGENCY_STYLES: Record<string, { label: string; color: 'danger' | 'warning' | 'info' | 'default' }> = {
  HIGH: { label: 'High Priority', color: 'danger' },
  MEDIUM: { label: 'Medium', color: 'warning' },
  LOW: { label: 'Low', color: 'default' },
}

export default async function IntelligencePage() {
  const { competitors, signals, sources } = await getIntelData()

  const highPriority = signals.filter(s => s.urgency === 'HIGH')
  const topSignals = signals.slice(0, 3)

  return (
    <>
      <PageHeader
        title="Intelligence Hub"
        description={`${signals.length} signals from ${sources.length} sources — ${competitors.length} competitors tracked`}
        actions={<AddCompetitorButton />}
      />

      {/* Top Insights Summary */}
      {topSignals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {topSignals.map((signal, i) => {
            const cat = CATEGORY_STYLES[signal.category] || { label: signal.category, color: 'default' as const }
            return (
              <Card key={signal.id} className={i === 0 ? 'ring-1 ring-gm-sage/20' : ''}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={cat.color} size="sm">{cat.label}</Badge>
                  <span className="text-[10px] text-gm-cream/30 ml-auto">Score: {signal.score}</span>
                </div>
                <h3 className="text-xs font-semibold text-gm-cream mb-1 line-clamp-2">{signal.title}</h3>
                <p className="text-[10px] text-gm-cream/40 line-clamp-2 mb-2">{signal.whyItMatters}</p>
                <div className="flex items-center gap-1">
                  {signal.recommendedFormat && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-gm-sage/10 rounded text-gm-sage/60">{signal.recommendedFormat}</span>
                  )}
                  {signal.recommendedChannel && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] rounded text-gm-cream/30">{signal.recommendedChannel}</span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Competitors */}
      <div className="mb-6">
        <h2 className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold mb-3">Competitor Watchlist</h2>
        <div className="grid grid-cols-5 gap-2">
          {competitors.map((comp) => {
            const signalCount = signals.filter(s => s.competitorId === comp.id).length
            return (
              <Card key={comp.id} hover>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[11px] font-semibold text-gm-cream truncate">{comp.name}</h3>
                  {signalCount > 0 && <Badge variant="info" size="sm">{signalCount}</Badge>}
                </div>
                <p className="text-[9px] text-gm-cream/30 mb-1">{comp.country}</p>
                <p className="text-[9px] text-gm-cream/25 line-clamp-1">{comp.positioning}</p>
                <a
                  href={comp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-gm-sage/40 hover:text-gm-sage mt-1 block truncate"
                >
                  {comp.website?.replace('https://', '')}
                </a>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Signal Feed */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Signal Feed</h2>
          <span className="text-[10px] text-gm-cream/25">{signals.length} signals — {highPriority.length} high priority</span>
        </div>

        {signals.length === 0 ? (
          <Card>
            <EmptyState
              title="No signals yet"
              description="Generate an intelligence digest to populate the signal feed."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {signals.map((signal) => {
              const cat = CATEGORY_STYLES[signal.category] || { label: signal.category, color: 'default' as const }
              const urg = URGENCY_STYLES[signal.urgency || ''] || { label: signal.urgency, color: 'default' as const }

              return (
                <Card key={signal.id}>
                  <div className="flex gap-4">
                    {/* Score */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center">
                      <span className={`text-sm font-bold ${
                        (signal.score || 0) >= 90 ? 'text-emerald-400' :
                        (signal.score || 0) >= 80 ? 'text-sky-400' :
                        (signal.score || 0) >= 70 ? 'text-amber-400' : 'text-gm-cream/30'
                      }`}>{signal.score}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={cat.color} size="sm">{cat.label}</Badge>
                        <Badge variant={urg.color} size="sm">{urg.label}</Badge>
                        {signal.competitor && (
                          <span className="text-[10px] text-gm-cream/40">{signal.competitor.name}</span>
                        )}
                        {signal.source && (
                          <span className="text-[9px] text-gm-cream/20">via {signal.source.name}</span>
                        )}
                        {signal.country && signal.country !== 'global' && (
                          <span className="text-[9px] text-gm-cream/20">{signal.country.toUpperCase()}</span>
                        )}
                      </div>

                      <h3 className="text-xs font-semibold text-gm-cream/90 mb-1">{signal.title}</h3>
                      <p className="text-[10px] text-gm-cream/50 mb-2 leading-relaxed">{signal.summary}</p>

                      {/* Why it matters */}
                      <div className="bg-gm-sage/5 rounded p-2 mb-2 border border-gm-sage/10">
                        <p className="text-[10px] text-gm-sage/70 leading-relaxed">
                          <span className="font-semibold text-gm-sage/90">Why it matters: </span>
                          {signal.whyItMatters}
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="bg-white/[0.02] rounded p-2 border border-white/[0.04]">
                        <p className="text-[10px] text-gm-cream/40 leading-relaxed">
                          <span className="font-semibold text-gm-cream/60">Action: </span>
                          {signal.recommendedAction}
                        </p>
                      </div>

                      {/* Tags */}
                      <div className="flex items-center gap-2 mt-2">
                        {signal.recommendedFormat && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gm-sage/10 rounded text-gm-sage/60">{signal.recommendedFormat}</span>
                        )}
                        {signal.recommendedChannel && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/10 rounded text-sky-400/60">{signal.recommendedChannel}</span>
                        )}
                        <span className="text-[9px] text-gm-cream/15 ml-auto">
                          {signal.detectedAt ? new Date(signal.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Sources */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold mb-3">Active Sources ({sources.length})</h2>
        <div className="grid grid-cols-3 gap-2">
          {sources.map((source) => (
            <Card key={source.id}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[11px] font-medium text-gm-cream/70">{source.name}</h3>
                <Badge variant="default" size="sm">{source.type}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {source.topics?.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[8px] px-1 py-0.5 bg-white/[0.03] rounded text-gm-cream/20">{t}</span>
                ))}
              </div>
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-gm-sage/30 hover:text-gm-sage mt-1 block truncate">
                  {source.url.replace('https://', '').replace('www.', '')}
                </a>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
