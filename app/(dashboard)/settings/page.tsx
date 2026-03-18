import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace configuration, accounts, and integrations"
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 mb-1">Name</p>
                <p className="text-sm text-gm-cream">Greenmood</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 mb-1">Version</p>
                <p className="text-sm text-gm-cream">2.0.0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Anthropic Claude API', status: 'configured', variant: 'success' as const },
                { name: 'Neon PostgreSQL', status: 'pending setup', variant: 'warning' as const },
                { name: 'Vercel Blob Storage', status: 'pending setup', variant: 'warning' as const },
                { name: 'LinkedIn API', status: 'Phase 3', variant: 'info' as const },
                { name: 'Meta Graph API', status: 'Phase 3', variant: 'info' as const },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-xs text-gm-cream/70">{service.name}</span>
                  <Badge variant={service.variant}>{service.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                'Orchestrator', 'Editorial Strategist', 'Content Generator',
                'Fact Checker', 'Brand Guardian', 'Channel Adapter',
                'Visual Builder', 'Scheduler', 'Performance Analyst', 'Market Intelligence'
              ].map((agent) => (
                <div key={agent} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gm-cream/70">{agent}</span>
                  <Badge variant="success" size="sm">Ready</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
