import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic } from '@/lib/ai/client'

const TOKEN = process.env.META_ADS_TOKEN
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || 'act_246058550869032'
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!TOKEN) return NextResponse.json({ success: false, error: 'No Meta Ads token' })

  try {
    // Fetch all active campaigns with insights
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v25.0/${AD_ACCOUNT}/campaigns?fields=name,status,daily_budget,insights.date_preset(last_7d){spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type}&filtering=[{"field":"status","operator":"IN","value":["ACTIVE"]}]&access_token=${TOKEN}`
    )
    const campaignsData = await campaignsRes.json()
    const campaigns = campaignsData.data || []

    if (campaigns.length === 0) {
      return NextResponse.json({ success: true, message: 'No active campaigns to optimize', recommendations: [] })
    }

    // Fetch ad set level data for more granular analysis
    const adSetsRes = await fetch(
      `https://graph.facebook.com/v25.0/${AD_ACCOUNT}/adsets?fields=name,status,campaign_id,daily_budget,insights.date_preset(last_7d){spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type}&filtering=[{"field":"status","operator":"IN","value":["ACTIVE"]}]&access_token=${TOKEN}`
    )
    const adSetsData = await adSetsRes.json()
    const adSets = adSetsData.data || []

    // Build performance summary for AI analysis
    const performanceSummary = campaigns.map((c: any) => {
      const insights = c.insights?.data?.[0] || {}
      const leads = insights.actions?.find((a: any) => a.action_type === 'lead')?.value || 0
      const cpl = insights.cost_per_action_type?.find((a: any) => a.action_type === 'lead')?.value || 'N/A'
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : 0,
        spend: Number(insights.spend || 0),
        impressions: Number(insights.impressions || 0),
        clicks: Number(insights.clicks || 0),
        cpc: Number(insights.cpc || 0),
        ctr: Number(insights.ctr || 0),
        leads: Number(leads),
        cpl: cpl === 'N/A' ? cpl : Number(cpl),
      }
    })

    const adSetSummary = adSets.map((as: any) => {
      const insights = as.insights?.data?.[0] || {}
      return {
        id: as.id,
        name: as.name,
        campaignId: as.campaign_id,
        dailyBudget: as.daily_budget ? Number(as.daily_budget) / 100 : 0,
        spend: Number(insights.spend || 0),
        clicks: Number(insights.clicks || 0),
        ctr: Number(insights.ctr || 0),
        cpc: Number(insights.cpc || 0),
      }
    })

    // AI analysis
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a Meta Ads performance analyst for Greenmood, a premium biophilic design brand.

Analyze these campaign stats from the last 7 days and provide optimization recommendations.

CAMPAIGNS:
${JSON.stringify(performanceSummary, null, 2)}

AD SETS:
${JSON.stringify(adSetSummary, null, 2)}

Industry benchmarks for biophilic/interior design B2B:
- Good CPC: under 3 EUR
- Good CTR: above 1.5%
- Good CPL: under 50 EUR
- Cork Tiles historically performs best (CPL 17 EUR in Jan 2026)
- "living wall" and "cork wall" are top converting keywords

Return JSON:
{
  "overallHealth": "good" | "warning" | "critical",
  "totalSpend7d": number,
  "recommendations": [
    {
      "type": "pause" | "increase_budget" | "decrease_budget" | "adjust_targeting" | "new_creative" | "keep",
      "campaignId": "string",
      "campaignName": "string",
      "reason": "string",
      "suggestedAction": "string",
      "priority": "high" | "medium" | "low",
      "estimatedImpact": "string"
    }
  ],
  "budgetReallocation": {
    "suggestion": "string",
    "details": "string"
  },
  "summary": "2-3 sentence executive summary"
}

Be specific and actionable. Reference real numbers.`,
      }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let analysis = null
    try { analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null } catch { /* */ }

    // Store recommendations as intelligence signals
    if (analysis?.recommendations) {
      for (const rec of analysis.recommendations.filter((r: any) => r.priority === 'high')) {
        await prisma.$executeRaw`
          INSERT INTO notifications (id, user_id, type, title, message, link)
          VALUES (
            gen_random_uuid()::text,
            'user-jeremie',
            'system',
            ${'Ads: ' + rec.suggestedAction},
            ${rec.reason + ' (' + rec.campaignName + ')'},
            '/ads'
          )
        `
      }
    }

    // Auto-actions for critical issues
    const autoActions: string[] = []
    if (analysis?.recommendations) {
      for (const rec of analysis.recommendations) {
        // Auto-pause campaigns with very high CPC (> 10 EUR) or 0 conversions after significant spend
        const campaign = performanceSummary.find((c: any) => c.id === rec.campaignId)
        if (rec.type === 'pause' && rec.priority === 'high' && campaign) {
          if (campaign.cpc > 10 || (campaign.spend > 100 && campaign.leads === 0)) {
            // Auto-pause
            await fetch(`https://graph.facebook.com/v25.0/${rec.campaignId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PAUSED', access_token: TOKEN }),
            })
            autoActions.push(`Auto-paused "${campaign.name}" (CPC: ${campaign.cpc} EUR, Leads: ${campaign.leads})`)
          }
        }
      }
    }

    // Log agent run
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    await prisma.agentRun.create({
      data: {
        workspaceId: WORKSPACE_ID,
        agentType: 'PERFORMANCE_ANALYST',
        status: 'COMPLETED',
        input: `Ads optimization: ${campaigns.length} campaigns, ${adSets.length} ad sets`,
        output: JSON.stringify({ analysis: analysis?.summary, autoActions }).substring(0, 2000),
        tokensUsed,
        durationMs: 0,
      },
    })

    // Store analysis in KB for other agents
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: WORKSPACE_ID, category: 'PRODUCT_FACT', key: 'ads_weekly_analysis' } },
      update: { value: analysis?.summary || 'No analysis', updatedAt: new Date() },
      create: {
        workspaceId: WORKSPACE_ID,
        category: 'PRODUCT_FACT',
        key: 'ads_weekly_analysis',
        value: analysis?.summary || 'No analysis',
        isActive: true,
        source: 'ads_optimizer_agent',
      },
    })

    return NextResponse.json({
      success: true,
      campaigns: performanceSummary.length,
      analysis,
      autoActions,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
