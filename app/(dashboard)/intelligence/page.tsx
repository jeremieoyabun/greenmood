import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

async function getIntelData() {
  const [competitors, signals, sources] = await Promise.all([
    prisma.competitorEntity.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.intelligenceSignal.findMany({
      where: { isDuplicate: false },
      include: { competitor: { select: { name: true } }, source: { select: { name: true } } },
      orderBy: { detectedAt: 'desc' },
      take: 20,
    }),
    prisma.intelligenceSource.findMany({ where: { isActive: true } }),
  ])
  return { competitors, signals, sources }
}

export default async function IntelligencePage() {
  const { competitors, signals, sources } = await getIntelData()

  return (
    <>
      <PageHeader
        title="Intelligence Hub"
        description="Biophilic market intelligence, competitor monitoring, and trend analysis"
        actions={<Button size="sm">Generate Digest</Button>}
      />

      {/* Competitor Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {competitors.map((comp) => (
          <Card key={comp.id} hover>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gm-cream">{comp.name}</h3>
              <Badge variant="default" size="sm">{comp.country}</Badge>
            </div>
            <p className="text-[10px] text-gm-cream/40 mb-2 line-clamp-2">{comp.positioning}</p>
            <div className="flex flex-wrap gap-1">
              {comp.products.slice(0, 3).map((p) => (
                <span key={p} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] rounded text-gm-cream/30">{p}</span>
              ))}
            </div>
            <a
              href={comp.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-gm-sage/50 hover:text-gm-sage mt-2 block"
            >
              {comp.website.replace('https://', '')}
            </a>
          </Card>
        ))}
      </div>

      {/* Signal Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Signal Feed</CardTitle>
          <Badge variant="info">{signals.length} signals</Badge>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <EmptyState
              title="No signals yet"
              description="Generate an intelligence digest to populate the signal feed with competitor insights, market trends, and content opportunities."
            />
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => (
                <div key={signal.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      signal.urgency === 'act_now' ? 'danger' :
                      signal.urgency === 'this_week' ? 'warning' :
                      signal.urgency === 'this_month' ? 'info' : 'default'
                    } size="sm">
                      {signal.urgency}
                    </Badge>
                    <Badge variant="default" size="sm">{signal.category}</Badge>
                    {signal.competitor && (
                      <span className="text-[10px] text-gm-cream/40">{signal.competitor.name}</span>
                    )}
                    {signal.country && (
                      <span className="text-[10px] text-gm-cream/30">{signal.country}</span>
                    )}
                  </div>
                  <h4 className="text-xs font-medium text-gm-cream/80 mb-1">{signal.title}</h4>
                  <p className="text-[10px] text-gm-cream/50">{signal.summary}</p>
                  <p className="text-[10px] text-gm-sage/50 mt-1">{signal.recommendedAction}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
