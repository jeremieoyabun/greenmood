import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(req: NextRequest) {
  try {
    const token = process.env.META_ADS_TOKEN
    const accountId = process.env.META_AD_ACCOUNT_ID

    if (!token || !accountId) {
      return NextResponse.json(
        { success: false, error: 'Meta Ads credentials not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const datePreset = searchParams.get('datePreset') || 'last_30d'

    const fields = [
      'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time',
      `insights{spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type}`,
    ].join(',')

    const url = `https://graph.facebook.com/v21.0/act_${accountId}/campaigns?fields=${fields}&date_preset=${datePreset}&access_token=${token}&limit=100`

    const response = await fetch(url, { next: { revalidate: 0 } })
    const json = await response.json()

    if (json.error) {
      return NextResponse.json(
        { success: false, error: json.error.message || 'Meta API error' },
        { status: 502 }
      )
    }

    const campaigns = (json.data || []).map((c: MetaCampaign) => {
      const ins = c.insights?.data?.[0]
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime: c.start_time || null,
        stopTime: c.stop_time || null,
        spend: ins ? parseFloat(ins.spend) : 0,
        impressions: ins ? parseInt(ins.impressions) : 0,
        clicks: ins ? parseInt(ins.clicks) : 0,
        cpc: ins ? parseFloat(ins.cpc) : 0,
        cpm: ins ? parseFloat(ins.cpm) : 0,
        ctr: ins ? parseFloat(ins.ctr) : 0,
        actions: ins?.actions || [],
        costPerAction: ins?.cost_per_action_type || [],
      }
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
