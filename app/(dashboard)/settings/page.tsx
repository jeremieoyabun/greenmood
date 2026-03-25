import { getCurrentUser } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SocialAccountsPanel } from '@/components/settings/SocialAccountsPanel'
import { getServerTranslations } from '@/lib/i18n/server'

export default async function SettingsPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getServerTranslations()])

  return (
    <>
      <PageHeader
        title={t.settings.title}
        description="Workspace configuration, accounts, and integrations"
      />

      <div className="space-y-4">
        {/* User Profile */}
        <Card>
          <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 mb-1">Name</p>
                <p className="text-sm text-gm-cream">{user?.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 mb-1">Email</p>
                <p className="text-sm text-gm-cream">{user?.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 mb-1">Role</p>
                <Badge variant={user?.role === 'OPERATOR' ? 'success' : 'info'}>{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Accounts */}
        <SocialAccountsPanel />

        {/* Connected Services */}
        <Card>
          <CardHeader><CardTitle>Platform Services</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Anthropic Claude API', status: 'connected', variant: 'success' as const },
                { name: 'Neon PostgreSQL', status: 'connected', variant: 'success' as const },
                { name: 'Vercel Hosting', status: 'connected', variant: 'success' as const },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <span className="text-xs text-gm-cream/70">{service.name}</span>
                  <Badge variant={service.variant}>{service.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
