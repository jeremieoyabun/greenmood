import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.META_ADS_TOKEN
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || 'act_246058550869032'

export async function POST(req: NextRequest) {
  if (!TOKEN) return NextResponse.json({ success: false, error: 'Meta Ads token not configured' }, { status: 400 })

  const { name, objective, dailyBudget, startDate, endDate, targeting, adCopy } = await req.json()

  if (!name || !objective) return NextResponse.json({ success: false, error: 'Name and objective required' }, { status: 400 })

  try {
    // Step 1: Create Campaign
    const campaignRes = await fetch(`https://graph.facebook.com/v25.0/${AD_ACCOUNT}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        objective: objective.toUpperCase(),
        status: 'PAUSED',
        special_ad_categories: [],
        access_token: TOKEN,
      }),
    })
    const campaign = await campaignRes.json()
    if (campaign.error) return NextResponse.json({ success: false, error: campaign.error.message }, { status: 400 })

    // Step 2: Create Ad Set
    const adSetBody: any = {
      name: `${name} - Ad Set`,
      campaign_id: campaign.id,
      daily_budget: (dailyBudget || 25) * 100, // cents
      billing_event: 'IMPRESSIONS',
      optimization_goal: objective === 'LEAD_GENERATION' ? 'LEAD_GENERATION' : 'LINK_CLICKS',
      start_time: startDate || new Date().toISOString(),
      status: 'PAUSED',
      targeting: {
        geo_locations: {
          countries: targeting?.countries || ['US'],
        },
        age_min: targeting?.ageMin || 28,
        age_max: targeting?.ageMax || 55,
      },
      access_token: TOKEN,
    }
    if (endDate) adSetBody.end_time = endDate

    // Add interests if provided
    if (targeting?.interests?.length) {
      // Search for interest IDs
      const interestIds = []
      for (const interest of targeting.interests.slice(0, 5)) {
        const searchRes = await fetch(
          `https://graph.facebook.com/v25.0/search?type=adinterest&q=${encodeURIComponent(interest)}&access_token=${TOKEN}`
        )
        const searchData = await searchRes.json()
        if (searchData.data?.[0]) {
          interestIds.push({ id: searchData.data[0].id, name: searchData.data[0].name })
        }
      }
      if (interestIds.length) {
        adSetBody.targeting.flexible_spec = [{ interests: interestIds }]
      }
    }

    const adSetRes = await fetch(`https://graph.facebook.com/v25.0/${AD_ACCOUNT}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adSetBody),
    })
    const adSet = await adSetRes.json()
    if (adSet.error) {
      return NextResponse.json({
        success: false,
        error: adSet.error.message,
        campaignId: campaign.id,
        note: 'Campaign created but ad set failed',
      }, { status: 400 })
    }

    // Step 3: Create Ad Creative (if copy provided)
    let creativeId = null
    if (adCopy?.headline && adCopy?.body) {
      const creativeRes = await fetch(`https://graph.facebook.com/v25.0/${AD_ACCOUNT}/adcreatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${name} - Creative`,
          object_story_spec: {
            link_data: {
              message: adCopy.body,
              name: adCopy.headline,
              link: adCopy.linkUrl || 'https://greenmood.be',
              call_to_action: { type: 'LEARN_MORE' },
            },
          },
          access_token: TOKEN,
        }),
      })
      const creative = await creativeRes.json()
      if (!creative.error) creativeId = creative.id
    }

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        adSetId: adSet.id,
        creativeId,
        status: 'PAUSED',
        note: 'Campaign created in PAUSED state. Activate it when ready.',
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
