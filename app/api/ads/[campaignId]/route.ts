import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.META_ADS_TOKEN

export async function GET(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  if (!TOKEN) return NextResponse.json({ success: false, error: 'Not configured' }, { status: 400 })

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${campaignId}?fields=name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{spend,impressions,clicks,cpc,ctr,actions}&date_preset=last_30d&access_token=${TOKEN}`
  )
  const data = await res.json()
  if (data.error) return NextResponse.json({ success: false, error: data.error.message }, { status: 400 })

  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  if (!TOKEN) return NextResponse.json({ success: false, error: 'Not configured' }, { status: 400 })

  const updates = await req.json()
  const body: any = { access_token: TOKEN }

  if (updates.status) body.status = updates.status
  if (updates.dailyBudget) body.daily_budget = updates.dailyBudget * 100
  if (updates.name) body.name = updates.name

  const res = await fetch(`https://graph.facebook.com/v25.0/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) return NextResponse.json({ success: false, error: data.error.message }, { status: 400 })

  return NextResponse.json({ success: true, data: { updated: true } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  if (!TOKEN) return NextResponse.json({ success: false, error: 'Not configured' }, { status: 400 })

  const res = await fetch(`https://graph.facebook.com/v25.0/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ARCHIVED', access_token: TOKEN }),
  })
  const data = await res.json()

  return NextResponse.json({ success: true, data: { archived: true } })
}
