import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const anthropic = new Anthropic()

async function main() {
  const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  const kbEntries = await prisma.knowledgeBaseEntry.findMany({
    where: { workspaceId: ws.id, isActive: true },
  })

  const kb = {}
  for (const e of kbEntries) kb[`${e.category}::${e.key}`] = e.value

  const buildSection = (prefix) => Object.entries(kb)
    .filter(([k]) => k.startsWith(`${prefix}::`))
    .map(([k, v]) => `- ${k.split('::')[1]}: ${v}`)
    .join('\n')

  const systemPrompt = `You are the content strategist for Greenmood, a premium Belgian biophilic design brand.

PRODUCT FACTS:
${buildSection('PRODUCT_FACT')}

BRAND RULES:
${buildSection('BRAND_RULE')}

PLATFORM RULES:
${buildSection('PLATFORM_RULE')}

MARKET TONES:
${buildSection('MARKET_TONE')}

RESTRICTED CLAIMS (NEVER use):
${buildSection('RESTRICTED_CLAIM')}

STYLE:
- Instagram captions: SHORT. Photo does the work. 1-2 lines max for impact. Design publication feel, not marketing.
- LinkedIn: NO links in body. Hook first line. Data-driven. Thought leadership.
- Stories: 1-2 lines per slide. BTS feel. CTA-driven.
- Never generic hype. Never "revolutionary" or "game-changing".
- Always credit designers (Alain Gilles, Cas Moor, Studio Nove 3).
- Product names stay in English.
- G-Desk is DISCONTINUED — never mention it.
- Ball Moss NRC is 0.73, NEVER 0.85.`

  const userPrompt = `Generate editorial content for these specific days. NO weekends — Greenmood doesn't post Sat/Sun.

MONDAY 24 March:
- Instagram HQ: Carousel éducatif (R2) — "Acoustic cork vs acoustic foam: the honest comparison" — Cork Tiles by Alain Gilles vs synthetic alternatives. Data-driven, 5 slides.
- LinkedIn HQ: Thought leadership post — "Why the world's best offices are going biophilic" — cite WELL v2, data, Greenmood projects. Hook line must stop the scroll.
- Stories (3 slides): Monday morning motivation, product beauty shots

TUESDAY 25 March:
- Instagram HQ: Reel concept (R1) — "Before/After" office transformation with moss wall. Describe what the 15-sec video shows.
- Instagram US: Post (R3) — Modulor mobile divider in open office context. Focus on flexibility + acoustic.
- Stories (3 slides): Process / making-of content

THURSDAY 27 March:
- Instagram HQ: Post (R3) — Cascade by Alain Gilles in a hospitality/hotel lobby. Dramatic shot. Short caption.
- Instagram US: Carousel (R2) — "WELL v2 + Biophilic Design: What architects need to know" — US-focused, data-driven, LEED angle
- LinkedIn HQ: Post (R2) — Cork Tiles performance data. NRC, fire rating, sustainability. Position vs competitors.
- Stories (3 slides): Team / office life / showroom peek

For EACH post respond with this exact JSON structure in an array:
{
  "day": "2026-03-XX",
  "platform": "instagram_hq|instagram_us|linkedin|stories",
  "type": "post|carousel|reel|story",
  "content_pillar": "R1|R2|R3|R4",
  "caption": "the ACTUAL caption ready to copy-paste (short for IG, longer for LinkedIn)",
  "hashtags": "for Instagram only, 20 relevant hashtags",
  "first_comment": "for LinkedIn: the link or call to action",
  "visual_direction": "detailed description of what the photo/visual should look like",
  "pomelli_prompt": "AI image generation prompt if needed, or null",
  "stories_slides": [{"text": "slide text", "visual": "what to show"}],
  "notes": "production notes"
}

JSON array only. No markdown.`

  console.log('Generating Mon-Tue-Thu content...')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  console.log('Tokens:', response.usage.input_tokens + response.usage.output_tokens)

  let posts
  try {
    posts = JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) posts = JSON.parse(match[0])
    else { console.log('Raw:', text); process.exit(1) }
  }

  console.log(`${posts.length} posts generated.\n`)

  // Get or create campaign
  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ws.id,
      title: 'Week of March 24-27, 2026',
      brief: 'Editorial plan Mon-Tue-Thu. 4R framework. IG HQ + IG US + LinkedIn + Stories.',
      contentType: 'ARTICLE',
      status: 'IN_PROGRESS',
      markets: ['hq', 'us'],
      platforms: ['instagram', 'linkedin', 'stories'],
    },
  })

  for (const p of posts) {
    const market = p.platform === 'instagram_us' ? 'us' : 'hq'
    const platform = p.platform.startsWith('instagram') ? 'instagram'
      : p.platform === 'linkedin' ? 'linkedin' : 'stories'

    const postText = p.caption || p.stories_slides?.map(s => s.text).join('\n---\n') || ''

    const post = await prisma.post.create({
      data: {
        workspaceId: ws.id,
        campaignId: campaign.id,
        market,
        platform,
        status: 'AI_GENERATED',
        variants: {
          create: {
            version: 1,
            text: postText,
            hashtags: p.hashtags || null,
            firstComment: p.first_comment || null,
            timing: p.day || null,
            notes: JSON.stringify({
              type: p.type,
              contentPillar: p.content_pillar,
              visualDirection: p.visual_direction,
              pomelliPrompt: p.pomelli_prompt,
              storiesSlides: p.stories_slides,
              productionNotes: p.notes,
            }),
            source: 'AI_GENERATED',
          },
        },
      },
    })

    if (p.day) {
      const timeMap = { linkedin: '09:00', stories: '08:00', instagram: '12:00' }
      await prisma.calendarSlot.create({
        data: {
          workspaceId: ws.id,
          campaignId: campaign.id,
          postId: post.id,
          date: new Date(p.day),
          time: timeMap[platform] || '12:00',
          market,
          platform,
          status: 'CONTENT_READY',
          notes: `${p.content_pillar} — ${p.type}`,
        },
      })
    }

    await prisma.approvalStep.create({
      data: { postId: post.id, fromStatus: 'DRAFT', toStatus: 'AI_GENERATED', action: 'AUTO_PASS' },
    })

    console.log(`✓ ${p.day} ${p.platform} (${p.type})`)
  }

  await prisma.agentRun.create({
    data: {
      workspaceId: ws.id,
      campaignId: campaign.id,
      agentType: 'EDITORIAL_STRATEGIST',
      status: 'COMPLETED',
      input: { period: '2026-03-24 to 2026-03-27', framework: '4R' },
      output: { postsGenerated: posts.length },
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      completedAt: new Date(),
    },
  })

  // Print
  console.log('\n========== CONTENT PLAN ==========\n')
  for (const p of posts) {
    console.log(`📅 ${p.day} | ${p.platform} | ${p.type} | ${p.content_pillar}`)
    if (p.caption) console.log(`📝 ${p.caption.substring(0, 150)}${p.caption.length > 150 ? '...' : ''}`)
    if (p.visual_direction) console.log(`📷 ${p.visual_direction.substring(0, 120)}...`)
    if (p.pomelli_prompt) console.log(`🎨 ${p.pomelli_prompt.substring(0, 120)}...`)
    if (p.stories_slides) p.stories_slides.forEach(s => console.log(`  📱 "${s.text}"`))
    console.log('')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
