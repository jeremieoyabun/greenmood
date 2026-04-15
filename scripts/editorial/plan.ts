/**
 * Editorial plan: 4 weeks × HQ/UK/US × 3 Insta (Mon/Wed/Fri) + 2 LinkedIn (Tue/Thu).
 * Real weekdays only (no Sat/Sun).
 * S1 skips HQ/LinkedIn: already 3 posts exist (factory 21/04, acoustics 23/04, fire 24/04).
 */

export type Market = 'hq' | 'uk' | 'us'
export type Platform = 'instagram' | 'linkedin'

export interface Brief {
  date: string // YYYY-MM-DD (weekday only)
  market: Market
  platform: Platform
  product: string
  angle: string
  mediaHint?: string // optional instruction about the photo/video
}

export const plan: Brief[] = [
  /* ───── S1 (20-24 avril) — Terra focus (produit existant, pas launch) ───── */

  // MON 20/04 — Insta: Terra Pouf material
  { date: '2026-04-20', market: 'hq', platform: 'instagram', product: 'Terra Pouf', angle: 'MATERIAL: expanded cork close-up. High density 100-120 kg/m3, steam-heated granules, no additives. Let the texture speak.' },
  { date: '2026-04-20', market: 'uk', platform: 'instagram', product: 'Terra Pouf', angle: 'EDITORIAL: sculptural cork seating, considered British interior. Dry, elegant caption.' },
  { date: '2026-04-20', market: 'us', platform: 'instagram', product: 'Terra Pouf', angle: 'DATA: 100% expanded cork, NRC 0.35, zero VOC. Maintenance-free acoustic seating for offices.' },

  // TUE 21/04 — LinkedIn: Terra Pouf product (UK+US only, HQ has factory post already)
  { date: '2026-04-21', market: 'uk', platform: 'linkedin', product: 'Terra Pouf spec', angle: 'PRODUCT: Terra Pouf specification for UK architects. 2 sizes (70cm×40cm 21kg / 99cm×40cm 47kg), NRC 0.35, B-S2-d0. Designed by Alain Gilles. Editorial, specifier-ready.' },
  { date: '2026-04-21', market: 'us', platform: 'linkedin', product: 'Terra Pouf ROI', angle: 'PRODUCT: Terra Pouf as acoustic ROI for corporate offices. WELL v2 Feature 78 contribution, zero VOC, practically unlimited lifespan. Data-first.' },

  // WED 22/04 — Insta: Terra Planters
  { date: '2026-04-22', market: 'hq', platform: 'instagram', product: 'Terra Planters', angle: 'PRODUCT: Terra Planters — modular cork planter, transforms into bench or table with optional oak cover. Designed by Alain Gilles.' },
  { date: '2026-04-22', market: 'uk', platform: 'instagram', product: 'Terra Planters', angle: 'EDITORIAL: Terra Planters bench-mode with oak cover, for British hospitality lobbies.' },
  { date: '2026-04-22', market: 'us', platform: 'instagram', product: 'Terra Planters', angle: 'DATA: Short 90×48×40cm 18kg / Tall 115×85×40cm 30kg, optional solid oak cover (Natural or Black). Corporate lobby scale.' },

  // THU 23/04 — LinkedIn educational (UK+US only; HQ has "Office acoustics" already)
  { date: '2026-04-23', market: 'uk', platform: 'linkedin', product: 'Cork furniture trend', angle: 'EDUCATIONAL: Why cork furniture is having a British design moment. Renewable, acoustic, tactile. A broader material essay.' },
  { date: '2026-04-23', market: 'us', platform: 'linkedin', product: 'ESG + biophilic design', angle: 'EDUCATIONAL: How biophilic interiors feed ESG reporting. Sustainable cork, WELL v2 certification, workplace wellness tied to retention.' },

  // FRI 24/04 — Insta: material/process (HQ LinkedIn "Fire safety" already exists)
  { date: '2026-04-24', market: 'hq', platform: 'instagram', product: 'Expanded cork process', angle: 'MATERIAL + PROCESS: how expanded cork is made. By-product of cork industry, steam-heated granules bind without additives. A material that binds itself.' },
  { date: '2026-04-24', market: 'uk', platform: 'instagram', product: 'Terra Pouf styled', angle: 'EDITORIAL: Terra Pouf in a British interior, understated caption.' },
  { date: '2026-04-24', market: 'us', platform: 'instagram', product: 'Terra Pouf maintenance', angle: 'DATA: maintenance-free acoustic seating. Workplace wellness angle, no watering, no lifespan limit.' },

  /* ───── S2 (27 avril - 1 mai) — Cork Collection Story ───── */

  // MON 27/04 — Insta: Mario Pouf variants
  { date: '2026-04-27', market: 'hq', platform: 'instagram', product: 'Mario Pouf 4 versions', angle: 'PRODUCT: 4 Mario Pouf versions by Alain Gilles. Expanded Cork, Compressed Cork 100% recycled, Sneaker White, Sneaker Black. One shape, four material stories.' },
  { date: '2026-04-27', market: 'uk', platform: 'instagram', product: 'Mario Pouf Sneaker editions', angle: 'EDITORIAL: the Sneaker editions (cork + microfiber). Object of curiosity for reception areas.' },
  { date: '2026-04-27', market: 'us', platform: 'instagram', product: 'Mario Pouf Compressed', angle: 'DATA: Compressed Cork version is 100% recycled cork, 9kg. Circular material story for ESG reporting.' },

  // TUE 28/04 — LinkedIn
  { date: '2026-04-28', market: 'hq', platform: 'linkedin', product: 'Alain Gilles designer story', angle: 'PRODUCT/DESIGNER: Alain Gilles has designed Mario Pouf, Terra Pouf/Planters, Cruz Planters, Cork Tiles (Sillon, Parenthèse, Brickx, Morse) for Greenmood. A decade of cork sculpture.' },
  { date: '2026-04-28', market: 'uk', platform: 'linkedin', product: 'Mario Pouf spec', angle: 'PRODUCT: Mario Pouf specification for UK architects. 4 finishes, 5-12kg range, NRC 0.35. Full tech sheet on request.' },
  { date: '2026-04-28', market: 'us', platform: 'linkedin', product: 'Mario Pouf workplace', angle: 'PRODUCT: acoustic furniture for open-plan offices. NRC 0.35 per unit, stackable contribution to reverberation targets.' },

  // WED 29/04 — Insta: Mario Pouf timelapse + Cork Tiles
  { date: '2026-04-29', market: 'hq', platform: 'instagram', product: 'Mario Pouf timelapse video', angle: 'VIDEO: short timelapse of Mario Pouf — material process or styling variations. Caption focuses on craft, material, material-as-icon.', mediaHint: 'Use the Mario Pouf timelapse video (check public/Presentation or Cloudinary for MP4)' },
  { date: '2026-04-29', market: 'uk', platform: 'instagram', product: 'Cork Tiles Parenthèse', angle: 'EDITORIAL: Parenthèse pattern close-up. Alternating horizontal relief creating rhythm. Texture and light study.' },
  { date: '2026-04-29', market: 'us', platform: 'instagram', product: 'Cork Tiles data', angle: 'DATA: Fire Class E, NRC 0.2, -180°C to +120°C range, hypoallergenic, 92% cork granules. The spec case for cork acoustic tiles.' },

  // THU 30/04 — LinkedIn educational
  { date: '2026-04-30', market: 'hq', platform: 'linkedin', product: 'Specifying cork for acoustic comfort', angle: 'EDUCATIONAL: when to specify cork tiles vs moss panels. Cork for mid-frequency absorption + tactile warmth, moss for NRC peak + biophilic presence. Not either/or.' },
  { date: '2026-04-30', market: 'uk', platform: 'linkedin', product: 'Why cork is the moment', angle: 'EDUCATIONAL: British design audience. Why expanded cork is resurging in commercial interiors.' },
  { date: '2026-04-30', market: 'us', platform: 'linkedin', product: 'LEED v5 cork credits', angle: 'EDUCATIONAL: LEED v5 cork credits. Zero VOC, rapidly regenerating (cork oak regrows bark every 9 years), Indoor Environmental Quality contribution.' },

  // FRI 1/05 — Insta: cork ecosystem
  { date: '2026-05-01', market: 'hq', platform: 'instagram', product: 'Cork ecosystem', angle: 'MATERIAL: Terra + Mario + Cork Tiles together. One material, one design language (Alain Gilles), infinite configurations.' },
  { date: '2026-05-01', market: 'uk', platform: 'instagram', product: 'Cork Tiles Sillon', angle: 'EDITORIAL: Sillon pattern close-up. Deep grooved linear relief. Material study.' },
  { date: '2026-05-01', market: 'us', platform: 'instagram', product: 'Bogdaniec factory', angle: 'BEHIND THE SCENES: the Polish factory where every Greenmood cork piece is handcrafted. Data: 100% handcraft, no automation.' },

  /* ───── S3 (4-8 mai) — Acoustic & WELL v2 ───── */

  // MON 4/05 — Insta: Ball Moss
  { date: '2026-05-04', market: 'hq', platform: 'instagram', product: 'Ball Moss texture', angle: 'MATERIAL: Ball Moss close-up. NRC 0.73 — the highest acoustic rating in our range. Three-dimensional pillow texture.' },
  { date: '2026-05-04', market: 'uk', platform: 'instagram', product: 'Ball Moss in design office', angle: 'EDITORIAL: Ball Moss installation in a British design office. Understated caption.' },
  { date: '2026-05-04', market: 'us', platform: 'instagram', product: 'NRC 0.73 data', angle: 'DATA: NRC 0.73 under ISO 11654. Comparable to professional acoustic panels, with biophilic presence built in.' },

  // TUE 5/05 — LinkedIn educational
  { date: '2026-05-05', market: 'hq', platform: 'linkedin', product: 'WELL v2 Feature 78', angle: 'EDUCATIONAL: how preserved Ball Moss contributes to WELL v2 Feature 78 (Sound). NRC 0.73 helps achieve RT60 reverberation targets.' },
  { date: '2026-05-05', market: 'uk', platform: 'linkedin', product: 'Acoustic comfort UK', angle: 'EDUCATIONAL: acoustic comfort in British offices post-hybrid. How biophilic acoustic solutions help.' },
  { date: '2026-05-05', market: 'us', platform: 'linkedin', product: 'WELL v2 spec guide', angle: 'EDUCATIONAL: specifier pack for WELL v2 Feature 78 + Feature 88 documentation. Test reports, fire certs, VOC declarations.' },

  // WED 6/05 — Insta: moss varieties
  { date: '2026-05-06', market: 'hq', platform: 'instagram', product: 'Forest Wall', angle: 'MATERIAL: Forest Wall — mixed preserved moss species, naturalistic aesthetic. Texture layering.' },
  { date: '2026-05-06', market: 'uk', platform: 'instagram', product: 'Reindeer Moss colours', angle: 'EDITORIAL: Reindeer Moss — soft, spongy texture, 20+ custom colours. Chromatic study.' },
  { date: '2026-05-06', market: 'us', platform: 'instagram', product: 'Velvet Leaf', angle: 'DATA: Velvet Leaf — flat dense texture, hospitality and high-end residential. Texture-first composition.' },

  // THU 7/05 — LinkedIn projects/products
  { date: '2026-05-07', market: 'hq', platform: 'linkedin', product: 'Athora Brussels project', angle: 'PROJECT: Athora Brussels headquarters — preserved moss throughout. Financial services choosing preserved biophilia.' },
  { date: '2026-05-07', market: 'uk', platform: 'linkedin', product: 'Ball Moss close-up', angle: 'PRODUCT: Ball Moss, the NRC 0.73 star. Three-dimensional pillow texture, premium acoustic performance, editorial close-up.' },
  { date: '2026-05-07', market: 'us', platform: 'linkedin', product: 'UC Davis installation', angle: 'PROJECT: UC Davis — biophilic design in a North American academic setting. Performance across academic year cycles.' },

  // FRI 8/05 — Insta: install formats
  { date: '2026-05-08', market: 'hq', platform: 'instagram', product: 'Moss ceiling', angle: 'MATERIAL: moss on ceilings. 3-5 kg/m2 lightweight, no structural reinforcement needed.' },
  { date: '2026-05-08', market: 'uk', platform: 'instagram', product: 'Hotel lobby moss', angle: 'EDITORIAL: hotel lobby feature. Preserved moss creates welcoming atmosphere without live plant maintenance.' },
  { date: '2026-05-08', market: 'us', platform: 'instagram', product: 'Phone booth acoustic', angle: 'DATA: phone booth application. Moss inside sound-rated booths combines privacy + biophilia.' },

  /* ───── S4 (11-15 mai) — Projects & Craft ───── */

  // MON 11/05 — Insta: projects
  { date: '2026-05-11', market: 'hq', platform: 'instagram', product: 'JLL Brussels project', angle: 'PROJECT: JLL Brussels HQ — Cork Tiles + preserved moss in meeting rooms. By Tetris Design and Build.' },
  { date: '2026-05-11', market: 'uk', platform: 'instagram', product: 'UK project highlight', angle: 'EDITORIAL: latest UK installation. Editorial framing.' },
  { date: '2026-05-11', market: 'us', platform: 'instagram', product: 'UC Davis project', angle: 'PROJECT: UC Davis installation — biophilic design in a North American academic setting.' },

  // TUE 12/05 — LinkedIn case studies
  { date: '2026-05-12', market: 'hq', platform: 'linkedin', product: 'Cloud IX Budapest case', angle: 'PROJECT: Cloud IX Budapest — 4000m2 flexible coworking with preserved moss installations. Multi-tenant where zero maintenance was essential.' },
  { date: '2026-05-12', market: 'uk', platform: 'linkedin', product: 'Tetris JLL collab', angle: 'PROJECT: JLL Brussels with Tetris Design and Build. How acoustic data enabled WELL documentation + RT60 targets.' },
  { date: '2026-05-12', market: 'us', platform: 'linkedin', product: 'Cloud IX US angle', angle: 'PROJECT: Cloud IX case — flexible coworking lessons for US facility managers. Multi-tenant operational simplicity.' },

  // WED 13/05 — Insta: factory/craft
  { date: '2026-05-13', market: 'hq', platform: 'instagram', product: 'Bogdaniec factory', angle: 'BEHIND THE SCENES: Bogdaniec, Poland. Where every Greenmood moss wall is handcrafted. 10+ years of craft tradition.' },
  { date: '2026-05-13', market: 'uk', platform: 'instagram', product: 'Craft close-up', angle: 'EDITORIAL: hand-laid moss on backing panels. Zero automation, zero shortcuts.' },
  { date: '2026-05-13', market: 'us', platform: 'instagram', product: 'Made in Europe', angle: 'DATA: handcrafted, quality-controlled, no plastic substrates. Why "made where" matters for spec reviews.' },

  // THU 14/05 — LinkedIn educational
  { date: '2026-05-14', market: 'hq', platform: 'linkedin', product: 'How a moss wall is made', angle: 'EDUCATIONAL: from harvest to panel. Preserved moss harvested at maturity, natural sap replaced with glycerin solution. 5-7 year lifespan, zero maintenance.' },
  { date: '2026-05-14', market: 'uk', platform: 'linkedin', product: 'Zero waste craft', angle: 'EDUCATIONAL: offcut moss into Forest compositions, cork offcuts into compressed cork. Circular by design.' },
  { date: '2026-05-14', market: 'us', platform: 'linkedin', product: 'EU manufacturing advantage', angle: 'EDUCATIONAL: European manufacturing matters for US specifiers. Shorter supply chain, EN + ASTM harmonized certifications.' },

  // FRI 15/05 — Insta: details
  { date: '2026-05-15', market: 'hq', platform: 'instagram', product: 'Team factory', angle: 'BEHIND THE SCENES: the team behind every Greenmood piece. Human craft, preserved nature.' },
  { date: '2026-05-15', market: 'uk', platform: 'instagram', product: 'Material textures', angle: 'EDITORIAL: texture study. Ball Moss, Reindeer Moss, Velvet Leaf, Forest. Four textures, four moods.' },
  { date: '2026-05-15', market: 'us', platform: 'instagram', product: 'Preservation process', angle: 'DATA: glycerin stabilization. Plant-derived, biodegradable, non-toxic. Bioinert but visually unchanged for years.' },
]

export default plan
