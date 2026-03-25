export const dynamic = 'force-dynamic'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { AdsFilters } from '@/components/ads/AdsFilters'
import { AdsCreateButton } from '@/components/ads/AdsCreateButton'
import { Wallet, Eye, MousePointerClick, TrendingUp, Target, Users } from 'lucide-react'

interface MetaCampaignInsights {
  spend: string
  impressions: string
  clicks: string
  cpc: string
  cpm: string
  ctr: string
  actions?: Array<{ action_type: string; value: string }>
  cost_per_action_type?: Array<{ action_type: string; value: string }>
}

interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  insights?: { data: MetaCampaignInsights[] }
}

interface ParsedCampaign {
  id: string
  name: string
  status: string
  objective: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  leads: number
}

async function fetchCampaigns(datePreset: string): Promise<ParsedCampaign[]> {
  const token = process.env.META_ADS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID

  if (!token || !accountId) return []

  try {
    const fields = [
      'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time',
      `insights{spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type}`,
    ].join(',')

    const url = `https://graph.facebook.com/v21.0/act_${accountId}/campaigns?fields=${fields}&date_preset=${datePreset}&access_token=${token}&limit=100`

    const response = await fetch(url, { cache: 'no-store' })
    const json = await response.json()

    if (json.error) return []

    return (json.data || []).map((c: MetaCampaign) => {
      const ins = c.insights?.data?.[0]
      const actions = ins?.actions || []
      const leads = actions
        .filter((a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((sum, a) => sum + parseInt(a.value), 0)

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective?.replace(/_/g, ' ') || '-',
        spend: ins ? parseFloat(ins.spend) : 0,
        impressions: ins ? parseInt(ins.impressions) : 0,
        clicks: ins ? parseInt(ins.clicks) : 0,
        ctr: ins ? parseFloat(ins.ctr) : 0,
        cpc: ins ? parseFloat(ins.cpc) : 0,
        leads,
      }
    })
  } catch {
    return []
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
    case 'PAUSED': return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
    default: return 'bg-red-500/15 text-red-300 border border-red-500/20'
  }
}

interface PageProps {
  searchParams: Promise<{ status?: string; datePreset?: string }>
}

export default async function AdsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statusFilter = params.status || 'ALL'
  const datePreset = params.datePreset || 'last_30d'

  const allCampaigns = await fetchCampaigns(datePreset)

  const campaigns = statusFilter === 'ALL'
    ? allCampaigns
    : allCampaigns.filter((c) => c.status === statusFilter)

  // Aggregate metrics across all campaigns (unfiltered for top-level stats)
  const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = allCampaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = allCampaigns.reduce((s, c) => s + c.clicks, 0)
  const totalLeads = allCampaigns.reduce((s, c) => s + c.leads, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0

  const dateLabel = datePreset === 'last_7d'
    ? 'Last 7 days'
    : datePreset === 'this_month'
      ? 'This month'
      : 'Last 30 days'

  const noCredentials = !process.env.META_ADS_TOKEN || !process.env.META_AD_ACCOUNT_ID

  return (
    <>
      <PageHeader
        title="Ads Control Center"
        description={`Meta Ads performance overview. ${dateLabel}`}
        actions={<AdsCreateButton />}
      />

      {noCredentials && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          Meta Ads credentials not configured. Set <code className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">META_ADS_TOKEN</code> and <code className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">META_AD_ACCOUNT_ID</code> in your environment variables.
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Spend', value: `\u20AC${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-sky-400', icon: Wallet },
          { label: 'Impressions', value: totalImpressions.toLocaleString(), color: 'text-purple-400', icon: Eye },
          { label: 'Clicks', value: totalClicks.toLocaleString(), color: 'text-pink-400', icon: MousePointerClick },
          { label: 'CTR', value: `${avgCtr.toFixed(2)}%`, color: 'text-emerald-400', icon: TrendingUp },
          { label: 'Avg CPC', value: `\u20AC${avgCpc.toFixed(2)}`, color: 'text-amber-400', icon: Target },
          { label: 'Leads', value: totalLeads.toLocaleString(), color: 'text-gm-cream', icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <s.icon className={`w-4 h-4 ${s.color} opacity-60 mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <span className="text-xs uppercase tracking-wider text-gm-cream/40 mt-1 block">{s.label}</span>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <AdsFilters currentStatus={statusFilter} currentDatePreset={datePreset} />

      {/* Campaigns Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.10]">
                <th className="text-left py-3 px-3 text-gm-cream/40 font-medium">Campaign</th>
                <th className="text-left py-3 px-3 text-gm-cream/40 font-medium">Status</th>
                <th className="text-left py-3 px-3 text-gm-cream/40 font-medium">Objective</th>
                <th className="text-right py-3 px-3 text-gm-cream/40 font-medium">Spend</th>
                <th className="text-right py-3 px-3 text-gm-cream/40 font-medium">Impressions</th>
                <th className="text-right py-3 px-3 text-gm-cream/40 font-medium">Clicks</th>
                <th className="text-right py-3 px-3 text-gm-cream/40 font-medium">CTR</th>
                <th className="text-right py-3 px-3 text-gm-cream/40 font-medium">CPC</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-gm-cream/80 font-medium max-w-[280px] truncate">{c.name}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gm-cream/50 capitalize text-xs">{c.objective}</td>
                  <td className="py-3 px-3 text-right text-sky-400">{'\u20AC'}{c.spend.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-purple-400">{c.impressions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-pink-400">{c.clicks.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{c.ctr.toFixed(2)}%</td>
                  <td className="py-3 px-3 text-right text-amber-400">{'\u20AC'}{c.cpc.toFixed(2)}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gm-cream/30">
                    {noCredentials ? 'Configure Meta Ads credentials to see campaigns' : 'No campaigns found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
