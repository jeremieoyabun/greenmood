import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Greenmood V2 database...')

  // ─── Workspace ───
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'greenmood' },
    update: {},
    create: {
      name: 'Greenmood',
      slug: 'greenmood',
    },
  })
  console.log('Workspace:', workspace.id)

  // ─── Default User ───
  const admin = await prisma.user.upsert({
    where: { email: 'admin@greenmood.be' },
    update: {},
    create: {
      email: 'admin@greenmood.be',
      name: 'Greenmood Admin',
      role: 'OPERATOR',
      workspaceId: workspace.id,
    },
  })
  console.log('Admin user:', admin.id)

  // ─── Content Pillars ───
  const pillars = [
    { name: 'Product Innovation & Design', color: '#A8C49A', description: 'Showcasing products, materials, and designers', sortOrder: 1 },
    { name: 'Project Showcase', color: '#5B8DB8', description: 'Completed installations and case studies', sortOrder: 2 },
    { name: 'Sustainability & Wellness', color: '#8DB85B', description: 'Certifications, WELL/LEED, biophilic science', sortOrder: 3 },
    { name: 'Education & Specifications', color: '#C4A46C', description: 'Acoustic performance, fire safety, material specs', sortOrder: 4 },
    { name: 'Behind the Scenes', color: '#B85B8D', description: 'Factory, craftsmanship, team stories', sortOrder: 5 },
    { name: 'Industry & Trends', color: '#5B6FB8', description: 'Biophilic design trends, workplace evolution', sortOrder: 6 },
  ]

  for (const p of pillars) {
    await prisma.contentPillar.upsert({
      where: { id: `pillar-${p.sortOrder}` },
      update: { ...p, workspaceId: workspace.id },
      create: { id: `pillar-${p.sortOrder}`, ...p, workspaceId: workspace.id },
    })
  }
  console.log('Content pillars: 6')

  // ─── Knowledge Base: Product Facts ───
  const productFacts: Array<{ key: string; value: string }> = [
    { key: 'company_overview', value: 'Greenmood is a premium Belgian biophilic design company founded in 2014 in Brussels by Sadig Alakbarov. Manufacturing preserved moss walls, cork acoustic panels, and architectural biophilic products.' },
    { key: 'ball_moss', value: 'Ball Moss — preserved moss wall system. NRC 0.73 acoustic rating. Fire rated B-S2-d0 (EU) / FSI 0, SDI 15 (US). 100% natural, 0% maintenance.' },
    { key: 'reindeer_moss', value: 'Reindeer Moss — preserved reindeer moss wall system. Soft texture, available in 20+ colors. Handcrafted in Europe.' },
    { key: 'velvet_leaf', value: 'Velvet Leaf — preserved velvet leaf moss panels. Lush, dense appearance. Premium biophilic wall covering.' },
    { key: 'forest_moss', value: 'Forest Moss — preserved forest moss wall system. Natural, organic appearance combining multiple moss species.' },
    { key: 'cork_tiles', value: 'Cork Tiles — acoustic cork wall tiles designed by Alain Gilles. Patterns: Parenthèse, Sillon, Brickx, Morse. Natural cork, acoustic performance, design-forward.' },
    { key: 'design_collection', value: 'Design Collection — G-Circle, Hoverlight, Cascade, Rings, Pouf, Planters, Modulor, Framed, Perspective Lines. Premium biophilic design objects.' },
    { key: 'semi_natural_trees', value: 'Semi-natural Trees — preserved trees combining real wood trunks with preserved foliage. Zero maintenance indoor trees.' },
    { key: 'custom_logos', value: 'Custom Logos — branded moss wall installations with corporate logos and custom designs in preserved moss.' },
    { key: 'fire_rating', value: 'Fire rating: B-S2-d0 (European classification) / FSI 0, SDI 15 (US ASTM E84). Tested and certified.' },
    { key: 'certifications', value: 'WELL v2 compatible (Biophilia feature). LEED v5 compatible (Materials & Resources, Indoor Environmental Quality).' },
    { key: 'materials', value: '100% natural materials. 0% maintenance required. Handcrafted in Europe. Preserved with eco-friendly glycerin-based process.' },
    { key: 'factory_poland', value: 'Manufacturing facility located in Bogdaniec, Poland. European production ensures quality control and sustainable supply chain.' },
    { key: 'headquarters', value: 'Headquarters in Brussels, Belgium. International presence with regional offices and distribution.' },
  ]

  for (const fact of productFacts) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'PRODUCT_FACT', key: fact.key } },
      update: { value: fact.value },
      create: { workspaceId: workspace.id, category: 'PRODUCT_FACT', key: fact.key, value: fact.value, source: 'v1_migration' },
    })
  }
  console.log('Product facts:', productFacts.length)

  // ─── Knowledge Base: Brand Rules ───
  const brandRules: Array<{ key: string; value: string }> = [
    { key: 'no_em_dash_lists', value: 'Never use em dashes (—) as list markers in any content.' },
    { key: 'credit_designers', value: 'Always credit designers when mentioning their products. Alain Gilles for Cork Tiles.' },
    { key: 'product_names_english', value: 'Product names must stay in English in all languages and markets. Do not translate product names.' },
    { key: 'tone_premium', value: 'Tone must be expert, calm, refined, and architecturally credible. No generic hype.' },
    { key: 'no_vague_sustainability', value: 'Avoid vague sustainability claims. Be specific: cite certifications, materials, processes.' },
    { key: 'no_inflated_language', value: 'Avoid inflated marketing language: "revolutionary", "game-changing", "best-in-class". Keep it grounded.' },
  ]

  for (const rule of brandRules) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'BRAND_RULE', key: rule.key } },
      update: { value: rule.value },
      create: { workspaceId: workspace.id, category: 'BRAND_RULE', key: rule.key, value: rule.value, source: 'v1_migration' },
    })
  }
  console.log('Brand rules:', brandRules.length)

  // ─── Knowledge Base: Market Tones ───
  const marketTones: Array<{ key: string; value: string }> = [
    { key: 'tone_hq', value: 'HQ Global (Belgium): International authority voice. English. Position as the source, the origin, the expert.' },
    { key: 'tone_us', value: 'USA: Data-driven, ROI-focused. WELL/LEED angle. Dollar figures. Performance metrics. Business case orientation.' },
    { key: 'tone_uk', value: 'UK: Editorial, design-forward. British English. Sophisticated, understated. Design press style.' },
    { key: 'tone_fr', value: 'France: French language. Belgian designer pride. Artisanal quality. European craftsmanship angle.' },
    { key: 'tone_ae', value: 'UAE: Premium positioning. GCC market awareness. Wellness credentials. Luxury hospitality angle.' },
    { key: 'tone_pl', value: 'Poland: Polish language. Local production pride (Bogdaniec factory). European quality, made locally.' },
    { key: 'tone_kr', value: 'South Korea: Korean language. K-design sensibility. Wellness and biophilic wellness angle.' },
    { key: 'tone_de', value: 'Germany: German language. Technical precision. Acoustic performance data. Engineering credibility.' },
  ]

  for (const tone of marketTones) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'MARKET_TONE', key: tone.key } },
      update: { value: tone.value },
      create: { workspaceId: workspace.id, category: 'MARKET_TONE', key: tone.key, value: tone.value, source: 'v1_migration' },
    })
  }
  console.log('Market tones:', marketTones.length)

  // ─── Knowledge Base: Platform Rules ───
  const platformRules: Array<{ key: string; value: string }> = [
    { key: 'linkedin_no_link_body', value: 'LinkedIn: NEVER put links in the post body — it kills organic reach. Always put the link in the first comment instead.' },
    { key: 'linkedin_hook_first_line', value: 'LinkedIn: The first line IS the hook. It must be compelling, specific, and scroll-stopping. No greetings.' },
    { key: 'instagram_hashtags', value: 'Instagram: Place hashtags after 3 dots on new lines. Use 20 relevant hashtags. Mix broad and niche.' },
    { key: 'instagram_no_links', value: 'Instagram: Links are not clickable in captions. Direct to "link in bio" if needed.' },
    { key: 'facebook_links_ok', value: 'Facebook: Links can be included directly in the post body.' },
  ]

  for (const rule of platformRules) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'PLATFORM_RULE', key: rule.key } },
      update: { value: rule.value },
      create: { workspaceId: workspace.id, category: 'PLATFORM_RULE', key: rule.key, value: rule.value, source: 'v1_migration' },
    })
  }
  console.log('Platform rules:', platformRules.length)

  // ─── Knowledge Base: Approved Claims ───
  const approvedClaims: Array<{ key: string; value: string }> = [
    { key: 'zero_maintenance', value: 'Greenmood products require zero maintenance — no watering, no sunlight, no trimming.' },
    { key: 'acoustic_performance', value: 'Ball Moss achieves NRC 0.73, providing effective acoustic absorption for interior spaces.' },
    { key: 'fire_safety', value: 'Products are fire rated B-S2-d0 (EU) and FSI 0, SDI 15 (US ASTM E84).' },
    { key: 'well_compatible', value: 'Greenmood products contribute to WELL v2 Biophilia feature requirements.' },
    { key: 'leed_compatible', value: 'Greenmood products contribute to LEED v5 credits in Materials & Resources and Indoor Environmental Quality.' },
    { key: 'handcrafted_europe', value: 'All products are handcrafted in Europe with quality-controlled processes.' },
    { key: 'natural_materials', value: 'Made from 100% natural, preserved materials using eco-friendly glycerin-based preservation.' },
  ]

  for (const claim of approvedClaims) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'APPROVED_CLAIM', key: claim.key } },
      update: { value: claim.value },
      create: { workspaceId: workspace.id, category: 'APPROVED_CLAIM', key: claim.key, value: claim.value, source: 'v1_migration' },
    })
  }
  console.log('Approved claims:', approvedClaims.length)

  // ─── Knowledge Base: Restricted Claims ───
  const restrictedClaims: Array<{ key: string; value: string }> = [
    { key: 'air_purification', value: 'Do NOT claim preserved plants purify air. Preserved moss does not perform active air purification.' },
    { key: 'carbon_negative', value: 'Do NOT claim products are carbon-negative unless independently verified. Use "sustainable" carefully.' },
    { key: 'medical_benefits', value: 'Do NOT claim specific health benefits (stress reduction percentages, productivity increases) without citing peer-reviewed sources.' },
    { key: 'soundproofing', value: 'Do NOT claim "soundproofing". Correct term is "acoustic absorption". NRC 0.73 means absorption, not isolation.' },
    { key: 'lifetime_guarantee', value: 'Do NOT promise "lifetime" durability. Preserved products have a multi-year lifespan depending on conditions.' },
  ]

  for (const claim of restrictedClaims) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'RESTRICTED_CLAIM', key: claim.key } },
      update: { value: claim.value },
      create: { workspaceId: workspace.id, category: 'RESTRICTED_CLAIM', key: claim.key, value: claim.value, source: 'v1_migration' },
    })
  }
  console.log('Restricted claims:', restrictedClaims.length)

  // ─── Knowledge Base: Resource Links ───
  const resourceLinks: Array<{ key: string; value: string }> = [
    { key: 'fire_safety_article', value: 'Fire Safety & Biophilic Materials — https://greenmood.us/fire-safety' },
    { key: 'sustainability_leed', value: 'Sustainability & LEED v5 — https://greenmood.us/sustainability' },
    { key: 'acoustic_performance', value: 'Acoustic & Material Performance — https://greenmood.us/acoustics' },
    { key: 'acoustic_spec_guide', value: 'Acoustic Specification Guide — https://greenmood.us/spec-guide' },
    { key: 'biophilic_wellbeing', value: 'Biophilic Design & Workplace Wellbeing — https://greenmood.us/wellbeing' },
    { key: 'preservation_process', value: 'Plant Preservation Process — https://greenmood.us/preservation' },
    { key: 'inspiration_gallery', value: 'Inspiration Gallery — https://greenmood.us/inspiration/' },
  ]

  for (const link of resourceLinks) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'RESOURCE_LINK', key: link.key } },
      update: { value: link.value },
      create: { workspaceId: workspace.id, category: 'RESOURCE_LINK', key: link.key, value: link.value, source: 'v1_migration' },
    })
  }
  console.log('Resource links:', resourceLinks.length)

  // ─── Knowledge Base: Color Palette ───
  const colors: Array<{ key: string; value: string }> = [
    { key: 'forest', value: '#1B3A2D — Forest green. Primary dark accent.' },
    { key: 'copper', value: '#8B3E23 — Warm copper. Secondary accent for premium feel.' },
    { key: 'cream', value: '#F4F2EE — Cream. Light background / text on dark.' },
    { key: 'sage', value: '#A8C49A — Sage green. Primary brand color, nature-inspired.' },
    { key: 'dark', value: '#0F2318 — Deep dark green. Background base.' },
  ]

  for (const c of colors) {
    await prisma.knowledgeBaseEntry.upsert({
      where: { workspaceId_category_key: { workspaceId: workspace.id, category: 'COLOR_PALETTE', key: c.key } },
      update: { value: c.value },
      create: { workspaceId: workspace.id, category: 'COLOR_PALETTE', key: c.key, value: c.value, source: 'v1_migration' },
    })
  }
  console.log('Color palette:', colors.length)

  // ─── Competitors ───
  const competitors = [
    { name: 'MoosMoos', website: 'https://www.moosmoos.com', country: 'Germany', products: ['moss walls', 'acoustic panels'], positioning: 'German manufacturer, nature-inspired interiors' },
    { name: 'Nordgröna', website: 'https://www.nordgrona.com', country: 'Sweden', products: ['moss panels', 'acoustic solutions'], positioning: 'Scandinavian design, Nordic nature' },
    { name: 'Polarmoss', website: 'https://www.polarmoss.com', country: 'Finland', products: ['reindeer moss', 'moss panels'], positioning: 'Finnish reindeer moss supplier' },
    { name: 'Freund Moosmanufaktur', website: 'https://www.freund-moosmanufaktur.de', country: 'Germany', products: ['moss walls', 'green walls'], positioning: 'German moss manufacturer, large-scale projects' },
    { name: 'Verdissimo', website: 'https://www.verdissimo.com', country: 'Spain', products: ['preserved plants', 'preserved flowers'], positioning: 'Spanish preserved plants and flowers' },
    { name: 'StyleGreen', website: 'https://www.stylegreen.de', country: 'Germany', products: ['preserved plant walls', 'moss pictures'], positioning: 'German preserved green walls' },
    { name: 'Benetti Moss', website: 'https://www.benettimoss.com', country: 'Italy', products: ['moss walls', 'preserved plants'], positioning: 'Italian moss and preserved plant specialist' },
  ]

  for (const comp of competitors) {
    await prisma.competitorEntity.upsert({
      where: { id: `comp-${comp.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: { ...comp },
      create: { id: `comp-${comp.name.toLowerCase().replace(/\s+/g, '-')}`, ...comp },
    })
  }
  console.log('Competitors:', competitors.length)

  console.log('\nSeed complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
