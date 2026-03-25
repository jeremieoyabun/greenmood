import { getCurrentUser } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SocialAccountsPanel } from '@/components/settings/SocialAccountsPanel'
import { ProfileEditor } from '@/components/settings/ProfileEditor'
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
        {/* User Profile — editable */}
        <ProfileEditor user={{
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || '',
          role: user?.role || 'VIEWER',
        }} />

        {/* Social Accounts */}
        <SocialAccountsPanel />

        {/* Connected Services */}
        <Card>
          <CardHeader><CardTitle>{t.settings.platformServices}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Anthropic Claude API', status: t.settings.connected, variant: 'success' as const },
                { name: 'Neon PostgreSQL', status: t.settings.connected, variant: 'success' as const },
                { name: 'Vercel Hosting', status: t.settings.connected, variant: 'success' as const },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
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
