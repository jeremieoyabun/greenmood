/**
 * Batch runner for S1-S4 (55 briefs across 4 weeks).
 * Creates each post in status DRAFT with proper weekday placement and market-specific timing.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { plan, type Brief } from './plan'

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const WORKSPACE_ID = 'cmmvt7qrr0000tcg4mgcwdxxg'

const MARKET_TONE: Record<string, string> = {
  hq: 'International authority voice. Confident, refined, architecturally credible. Not regional.',
  uk: 'Editorial, design-forward, British magazine tone. Think Dezeen, Wallpaper*, FT Weekend. Dry, no hype.',
  us: 'Data-driven, direct. Specific numbers (NRC, kg, EUR, %). WELL v2, LEED v5, ROI, workplace wellness. No fluff.',
}

const PLATFORM_RULES: Record<string, string> = {
  instagram: `INSTAGRAM RULES:
- Body: 3-5 short lines, punchy, NO link in body
- Hook on first line
- Separator: three dots on new lines (.\\n.\\n.)
- Hashtags: 20 relevant hashtags after dots, mix broad + niche
- No em dashes as list markers
- Product names stay in English`,
  linkedin: `LINKEDIN RULES:
- Hook on first line (before "see more" fold)
- Body 3-5 short paragraphs, 1-2 sentences each
- NO link in body — put link in firstComment
- Credit designers (Alain Gilles for Cork Tiles / Mario / Terra / Cruz / Cascade)
- 3-5 hashtags at end
- Professional but warm, no corporate buzzwords
- No em dashes as list markers`,
}

const BRAND_RULES = `BRAND RULES (absolute):
- G-Circle has cork backing + 9 METAL finishes. NEVER wood/oak on G-Circle.
- Moss Frames and Framed products DO have wood frames (only those two).
- NEVER say "soundproofing" — use "acoustic absorption" or "acoustic comfort"
- NEVER claim preserved moss purifies air (biologically inert)
- NEVER invent dimensions — only use KEY_FACTS
- Credit Alain Gilles for Cork Tiles / Mario / Terra / Cruz / Cascade
- Tone: expert, calm, refined. No hype, no sustainability fluff.
- NEVER write "launch", "new", "latest", "arrives", "introducing", "just dropped" — these are established products, not new releases.`

const KEY_FACTS = `PRODUCT FACTS:
- Ball Moss: NRC 0.73 (ISO 11654), B-S2-d0 (EU) / FSI 0, SDI 15 (US ASTM E84), 10+ years, 3-5 kg/m2
- Mario Pouf: 4 versions (Expanded Cork 5.5kg, Compressed Cork 100% recycled 9kg, Sneaker White 12kg, Sneaker Black 10.8kg), NRC 0.35, by Alain Gilles
- Terra Pouf: 100% expanded cork, Short 70cm diam × 40cm 21kg, Tall 99cm × 40cm 47kg, NRC 0.35, by Alain Gilles
- Terra Planters: 100% expanded cork, Short 90×48×40cm 18kg, Tall 115×85×40cm 30kg, optional solid oak cover (Natural/Black), by Alain Gilles
- Cork Tiles: 40.5×40.5×5cm, NRC 0.2, Fire Class E, 92% cork granules, hypoallergenic, 4 patterns (Sillon, Parenthèse, Brickx, Morse) by Alain Gilles
- Expanded cork: high density 100-120 kg/m3, by-product of cork industry, steam-heated granules bind without additives
- Certifications: WELL v2 (Feature 78 Sound + Feature 88 Biophilia), LEED v5
- Manufacturing: handcrafted in Bogdaniec, Poland
- Projects: L'Oréal Paris, JLL Brussels (Tetris), Cloud IX Budapest, Athora Brussels, UC Davis, Saltire Edinburgh`

function buildPrompt(brief: Brief): string {
  return `You are writing a ${brief.platform} post for Greenmood (premium Belgian biophilic design brand).

MARKET: ${brief.market.toUpperCase()}
TONE: ${MARKET_TONE[brief.market]}

${PLATFORM_RULES[brief.platform]}

${BRAND_RULES}

${KEY_FACTS}

BRIEF:
Product/topic: ${brief.product}
Angle: ${brief.angle}
${brief.mediaHint ? `Media: ${brief.mediaHint}` : ''}

OUTPUT — return ONLY valid JSON, no preamble, no backticks:
{
  "text": "post body (hook first, NO hashtags in this field)",
  "hashtags": "hashtags block (Instagram: 20 hashtags after 3 dots on new lines; LinkedIn: 3-5 inline at end)",
  "firstComment": "${brief.platform === 'linkedin' ? 'LinkedIn: short comment with link (e.g. Learn more: https://greenmood.be/terra) — under 100 chars' : 'empty string'}"
}`
}

async function generateOne(brief: Brief) {
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: buildPrompt(brief) }],
  })
  const tb = resp.content.find((b) => b.type === 'text')
  if (!tb || tb.type !== 'text') throw new Error('No text response')
  let parsed: any
  try {
    parsed = JSON.parse(tb.text)
  } catch {
    const m = tb.text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Unparseable response')
    parsed = JSON.parse(m[0])
  }
  return {
    text: parsed.text || '',
    hashtags: parsed.hashtags || '',
    firstComment: parsed.firstComment || '',
  }
}

const TIME_BY_PLATFORM: Record<string, string> = {
  instagram: '12:00',
  linkedin: '15:00', // 15h UTC = US+EU overlap
}

async function createPost(brief: Brief, content: { text: string; hashtags: string; firstComment: string }) {
  const date = new Date(brief.date + 'T00:00:00Z')
  const time = TIME_BY_PLATFORM[brief.platform] || '10:00'
  const post = await prisma.post.create({
    data: {
      workspaceId: WORKSPACE_ID,
      market: brief.market,
      platform: brief.platform,
      status: 'DRAFT',
      variants: {
        create: {
          version: 1,
          text: content.text,
          hashtags: content.hashtags,
          firstComment: content.firstComment,
          timing: `${brief.date}T${time}:00Z`,
          source: 'AI_GENERATED',
          isActive: true,
          notes: `Editorial ${brief.date} ${brief.market}/${brief.platform} — ${brief.product}${brief.mediaHint ? ' | MEDIA: ' + brief.mediaHint : ''}`,
        },
      },
    },
  })
  await prisma.calendarSlot.create({
    data: {
      workspaceId: WORKSPACE_ID,
      postId: post.id,
      date,
      time,
      market: brief.market,
      platform: brief.platform,
      status: 'PLANNED',
    },
  })
  return post.id
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const limit = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10)
  const briefs = limit > 0 ? plan.slice(0, limit) : plan

  // Verify no weekend dates
  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
  const weekends = briefs.filter((b) => {
    const d = new Date(b.date + 'T00:00:00Z')
    return d.getUTCDay() === 0 || d.getUTCDay() === 6
  })
  if (weekends.length > 0) {
    console.error('❌ Aborting: found weekend dates in plan:')
    weekends.forEach((w) => console.error('  ', w.date, days[new Date(w.date + 'T00:00:00Z').getUTCDay()], w.market, w.platform))
    process.exit(1)
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Generating ${briefs.length} posts (all weekdays verified)...\n`)

  let success = 0
  let failed = 0
  for (let i = 0; i < briefs.length; i++) {
    const brief = briefs[i]
    const d = new Date(brief.date + 'T00:00:00Z')
    const day = days[d.getUTCDay()]
    try {
      process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${briefs.length}] ${brief.date} ${day} ${brief.market}/${brief.platform.padEnd(9)} — ${brief.product.substring(0, 40)}... `)
      const content = await generateOne(brief)
      if (!dryRun) {
        await createPost(brief, content)
      }
      console.log('✓')
      success++
    } catch (err: any) {
      console.log(`✗ ${err.message}`)
      failed++
    }
  }
  console.log(`\nDone. ${success} ok, ${failed} failed.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  prisma.$disconnect()
  process.exit(1)
})
