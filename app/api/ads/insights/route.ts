import { NextRequest, NextResponse } from 'next/server'

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
    const breakdown = searchParams.get('breakdown') || ''

    const fields = 'spend,impressions,clicks,reach,cpc,cpm,ctr,actions,cost_per_action_type'

    let url = `https://graph.facebook.com/v21.0/act_${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`
    if (breakdown) {
      url += `&breakdowns=${breakdown}`
    }

    const response = await fetch(url, { next: { revalidate: 0 } })
    const json = await response.json()

    if (json.error) {
      return NextResponse.json(
        { success: false, error: json.error.message || 'Meta API error' },
        { status: 502 }
      )
    }

    const data = (json.data || []).map((row: Record<string, unknown>) => ({
      spend: row.spend ? parseFloat(row.spend as string) : 0,
      impressions: row.impressions ? parseInt(row.impressions as string) : 0,
      clicks: row.clicks ? parseInt(row.clicks as string) : 0,
      reach: row.reach ? parseInt(row.reach as string) : 0,
      cpc: row.cpc ? parseFloat(row.cpc as string) : 0,
      cpm: row.cpm ? parseFloat(row.cpm as string) : 0,
      ctr: row.ctr ? parseFloat(row.ctr as string) : 0,
      actions: row.actions || [],
      costPerAction: row.cost_per_action_type || [],
      ...(breakdown === 'country' && row.country ? { country: row.country } : {}),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
