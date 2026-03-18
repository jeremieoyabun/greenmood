import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const anthropic = new Anthropic()

async function main() {
  // Load KB
  const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  const kbEntries = await prisma.knowledgeBaseEntry.findMany({
    where: { workspaceId: ws.id, isActive: true },
  })

  const kb = {}
  for (const e of kbEntries) kb[`${e.category}::${e.key}`] = e.value

  const productFacts = Object.entries(kb).filter(([k]) => k.startsWith('PRODUCT_FACT::')).map(([k, v]) => `- ${k.split('::')[1]}: ${v}`).join('\n')
  const brandRules = Object.entries(kb).filter(([k]) => k.startsWith('BRAND_RULE::')).map(([k, v]) => `- ${v}`).join('\n')
  const platformRules = Object.entries(kb).filter(([k]) => k.startsWith('PLATFORM_RULE::')).map(([k, v]) => `- ${v}`).join('\n')
  const marketTones = Object.entries(kb).filter(([k]) => k.startsWith('MARKET_TONE::')).map(([k, v]) => `- ${v}`).join('\n')
  const restrictedClaims = Object.entries(kb).filter(([k]) => k.startsWith('RESTRICTED_CLAIM::')).map(([k, v]) => `- ${v}`).join('\n')
  const approvedClaims = Object.entries(kb).filter(([k]) => k.startsWith('APPROVED_CLAIM::')).map(([k, v]) => `- ${v}`).join('\n')

  const systemPrompt = `You are the marketing content strategist for Greenmood, a premium Belgian biophilic design brand.

PRODUCT FACTS (use ONLY these):
${productFacts}

BRAND RULES:
${brandRules}

PLATFORM RULES:
${platformRules}

MARKET TONES:
${marketTones}

APPROVED CLAIMS:
${approvedClaims}

RESTRICTED CLAIMS (NEVER use):
${restrictedClaims}

CONTENT FRAMEWORK (4R):
- R1 REVEAL: Process, time-lapse, behind the scenes, before/after — most viral format
- R2 REFERENCE: Educate, carousels, data, comparisons, A&D tips — save machine
- R3 RESULTS: Projects, case studies, testimonials, proof — converts
- R4 RELATE: Team, founder story, events, designers, culture — builds community

INSTAGRAM CAPTION STYLE:
- SHORT. Photo does the work.
- Examples: "Texture is information." / "Quiet never looked this good." / "G-Circle." (just the name)
- Max 1-2 lines for impact posts. Educational carousels can be longer.
- Never generic marketing speak. Feel like a design publication.
- Hashtags: after 3 dots on new lines, 20 relevant hashtags

LINKEDIN RULES:
- NO links in post body
- Hook on first line (the data shock or the position)
- Link in first comment
- Feel like thought leadership, not advertising

STORIES: Ultra-short, 1-2 lines per slide. CTA-driven. Behind the scenes feel.`

  const userPrompt = `Generate a complete editorial plan for Thursday 19 March to Sunday 22 March 2026.

Follow this exact cadence:

THURSDAY 19 March:
- Instagram HQ (@greenmood.be): Carousel éducatif (R2) — Topic: "5 reasons preserved moss outperforms living walls" — 5-7 slides with key data
- Instagram US (@greenmood.usa): Photo projet or product highlight
- Stories (3 slides): Behind the scenes / process / team moment
- LinkedIn HQ: Nothing today (posted yesterday)

FRIDAY 20 March:
- Instagram HQ: Photo projet international (R3) — pick a stunning installation angle
- LinkedIn HQ: Post données/impact biophilic design (R2) — acoustic performance data + WELL connection
- Stories (3 slides): Product close-up teasers for weekend

SATURDAY 21 March:
- Instagram HQ: Reel concept — "satisfying process" (R1) — describe what the 15-second video should show
- Stories (2 slides): Mood / nature inspiration

SUNDAY 22 March:
- Stories only (1-2 slides): Simple, calm, nature quote or product beauty shot

For each post, provide:
{
  "day": "YYYY-MM-DD",
  "platform": "instagram_hq|instagram_us|linkedin|stories",
  "type": "post|carousel|reel|story",
  "content_pillar": "R1|R2|R3|R4",
  "caption": "the actual caption text ready to copy-paste",
  "hashtags": "hashtags ready to paste (Instagram only)",
  "first_comment": "for LinkedIn posts only",
  "visual_direction": "detailed description of what the photo/visual should be",
  "pomelli_prompt": "if we need to generate an image with AI, the prompt",
  "stories_slides": [{"text": "slide text", "visual": "what to show"}],
  "notes": "any production notes"
}

Respond with a JSON array of all posts. No markdown, no preamble.`

  console.log('Generating content for Thu-Sun...')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text
  console.log('Tokens:', response.usage.input_tokens + response.usage.output_tokens)

  // Parse
  let posts
  try {
    posts = JSON.parse(text)
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) posts = JSON.parse(match[0])
    else { console.log('Raw:', text); process.exit(1) }
  }

  console.log(`\n${posts.length} posts generated.\n`)

  // Save to DB
  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ws.id,
      title: 'Week of March 19-22, 2026',
      brief: 'Weekly editorial plan following 4R framework. Thu-Sun coverage across IG HQ, IG US, LinkedIn, Stories.',
      contentType: 'ARTICLE',
      status: 'IN_PROGRESS',
      markets: ['hq', 'us'],
      platforms: ['instagram', 'linkedin', 'stories'],
    },
  })

  for (const p of posts) {
    const market = p.platform === 'instagram_us' ? 'us' : 'hq'
    const platform = p.platform.startsWith('instagram') ? 'instagram' : p.platform === 'linkedin' ? 'linkedin' : 'stories'

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
            text: p.caption || p.stories_slides?.map(s => s.text).join('\n---\n') || '',
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

    // Calendar slot
    if (p.day) {
      await prisma.calendarSlot.create({
        data: {
          workspaceId: ws.id,
          campaignId: campaign.id,
          postId: post.id,
          date: new Date(p.day),
          time: platform === 'linkedin' ? '09:00' : platform === 'stories' ? '08:00' : '12:00',
          market,
          platform,
          status: 'CONTENT_READY',
          notes: `${p.content_pillar} — ${p.type}`,
        },
      })
    }

    // Approval step
    await prisma.approvalStep.create({
      data: {
        postId: post.id,
        fromStatus: 'DRAFT',
        toStatus: 'AI_GENERATED',
        action: 'AUTO_PASS',
      },
    })

    console.log(`✓ ${p.day} ${p.platform} (${p.type}) — saved`)
  }

  // Log agent run
  await prisma.agentRun.create({
    data: {
      workspaceId: ws.id,
      campaignId: campaign.id,
      agentType: 'EDITORIAL_STRATEGIST',
      status: 'COMPLETED',
      input: { period: '2026-03-19 to 2026-03-22', framework: '4R' },
      output: { postsGenerated: posts.length },
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      completedAt: new Date(),
    },
  })

  // Print content for review
  console.log('\n========== CONTENT PLAN ==========\n')
  for (const p of posts) {
    console.log(`📅 ${p.day} | ${p.platform} | ${p.type} | ${p.content_pillar}`)
    console.log(`📝 ${p.caption || '(stories)'}`)
    if (p.visual_direction) console.log(`📷 Visual: ${p.visual_direction}`)
    if (p.pomelli_prompt) console.log(`🎨 Pomelli: ${p.pomelli_prompt}`)
    if (p.stories_slides) {
      for (const s of p.stories_slides) {
        console.log(`  📱 Story: "${s.text}" — ${s.visual}`)
      }
    }
    if (p.hashtags) console.log(`# ${p.hashtags.substring(0, 100)}...`)
    console.log('')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
