/**
 * Auto-select Cloudinary images for all upcoming S1-S4 DRAFT posts (HQ/UK/US).
 * - For each post without imageUrl, runs the image-director auto-select logic
 * - Stores the selected image URL on the variant
 * - Skips posts that already have an imageUrl (manual L'Oréal, Mario timelapse, etc.)
 * - Logs posts where no match was found (needs_image) so you can upload manually
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dzbbql3do',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Use Cloudinary Search API (matches on assetFolder, tags, context — not just publicId prefix)
async function searchAssets(folder: string, maxResults = 20) {
  const result = await cloudinary.search
    .expression(`folder:"${folder}"`)
    .with_field('tags')
    .with_field('context')
    .max_results(maxResults)
    .execute()
  return (result.resources || []).map((r: any) => ({
    url: r.secure_url,
    publicId: r.public_id,
    width: r.width,
    height: r.height,
    format: r.format,
    tags: r.tags || [],
    folder: r.asset_folder || r.folder || '',
  }))
}

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_VISUAL = `You are the visual director for Greenmood, a premium Belgian biophilic design brand.

Given a post caption + platform, suggest 1-3 Cloudinary folders to search. USE EXACT PATHS.
Return JSON only: {"folders": ["greenmood/products/pouf/terra", "greenmood/products/cascade", ...]}

EXACT FOLDER PATHS (use these verbatim):
POUFS:
- greenmood/products/pouf/terra
- greenmood/products/pouf/mario
- greenmood/products/pouf/mario/expanded-cork
- greenmood/products/pouf/mario/compressed-cork
- greenmood/products/pouf/mario/sneaker-white
- greenmood/products/pouf/mario/sneaker-black
- greenmood/products/pouf/mario/All versions

PLANTERS:
- greenmood/products/planters/terra
- greenmood/products/planters/mario
- greenmood/products/planters/cruz

CORK TILES (note: no "products/" prefix):
- greenmood/cork-tiles/sillon
- greenmood/cork-tiles/parenthese
- greenmood/cork-tiles/brickx
- greenmood/cork-tiles/morse

OTHER PRODUCTS:
- greenmood/products/cascade
- greenmood/products/g-circle
- greenmood/products/hoverlight
- greenmood/products/modulor
- greenmood/products/framed
- greenmood/products/green-walls

MOSS (use these for green walls / moss content):
- greenmood/acoustic-solutions/ball-moss
- greenmood/acoustic-solutions/reindeer-moss
- greenmood/acoustic-solutions/velvet-leaf
- greenmood/acoustic-solutions/forest
- greenmood/acoustic-solutions/Ceiling (moss ceilings)

PROJECTS:
- greenmood/projects/france/l-oreal
- greenmood/projects/belgium/jll-brussels
- greenmood/projects/belgium/athora-brussels
- greenmood/projects/hungary/cloud-ix-budapest
- greenmood/projects/usa/uc-davis
- greenmood/projects/uk/saltire-edinburgh

BEHIND THE SCENES:
- greenmood/factory (Bogdaniec factory, production)
- greenmood/textures (material close-ups)

Pick specific sub-folders when the caption is about a specific product (e.g. "Sneaker Black Mario Pouf" → greenmood/products/pouf/mario/sneaker-black).
Pick the parent folder for broader topics.`

const SYSTEM_PICK = `You are picking the best Cloudinary image for a social media post. Reply with valid JSON only.`

async function suggestFolders(caption: string, platform: string): Promise<string[]> {
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: SYSTEM_VISUAL,
    messages: [{ role: 'user', content: `POST CAPTION: ${caption.substring(0, 500)}\nPLATFORM: ${platform}\n\nReturn JSON: {"folders": [...]}` }],
  })
  const tb = resp.content.find((b) => b.type === 'text')
  if (!tb || tb.type !== 'text') return []
  try {
    const m = tb.text.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : { folders: [] }
    return (parsed.folders || []).map((f: string) => f.startsWith('greenmood/') ? f : `greenmood/${f}`)
  } catch {
    return []
  }
}

async function pickBestMatch(
  caption: string,
  platform: string,
  candidates: Array<{ url: string; publicId: string; width: number; height: number; tags: string[]; folder: string }>,
): Promise<{ index: number; reason: string } | null> {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return { index: 0, reason: 'only candidate' }

  const list = candidates
    .map((c, i) => {
      const tags = c.tags.slice(0, 6).join(', ') || '-'
      const name = c.publicId.split('/').pop() || ''
      return `${i}. ${name} [${c.width}x${c.height}, ${c.folder}] tags: ${tags}`
    })
    .join('\n')

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: SYSTEM_PICK,
    messages: [
      {
        role: 'user',
        content: `POST CAPTION: ${caption.substring(0, 400)}
PLATFORM: ${platform}

CANDIDATES:
${list}

Return JSON: {"index": 0, "reason": "short reason"}`,
      },
    ],
  })
  const tb = resp.content.find((b) => b.type === 'text')
  if (!tb || tb.type !== 'text') return null
  try {
    const m = tb.text.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : null
    if (!parsed) return null
    return { index: parsed.index ?? 0, reason: parsed.reason || '' }
  } catch {
    return null
  }
}

interface UpcomingPost {
  post_id: string
  variant_id: string
  text: string
  platform: string
  market: string
  date: Date
  image_url: string | null
}

async function autoSelectForPost(p: UpcomingPost, verbose = false): Promise<{ status: 'selected' | 'needs_image'; url?: string; reason?: string }> {
  // 1. Ask Haiku which folders to search
  const folders = await suggestFolders(p.text, p.platform)
  if (verbose) console.log('\n  folders suggested:', folders)
  if (folders.length === 0) return { status: 'needs_image', reason: 'no_folders_suggested' }

  // 2. Gather candidates
  const seen = new Set<string>()
  const candidates: any[] = []
  for (const folder of folders.slice(0, 3)) {
    try {
      const assets = await searchAssets(folder, 15)
      if (verbose) console.log(`  folder "${folder}" -> ${assets.length} assets`)
      for (const a of assets) {
        if (seen.has(a.publicId)) continue
        if (a.format === 'mp4' || a.format === 'mov') continue
        seen.add(a.publicId)
        candidates.push({
          url: a.url,
          publicId: a.publicId,
          width: a.width,
          height: a.height,
          tags: a.tags || [],
          folder,
        })
      }
    } catch (err: any) {
      if (verbose) console.log(`  folder "${folder}" ERROR: ${err.message}`)
    }
  }

  if (candidates.length === 0) return { status: 'needs_image', reason: 'no_candidates_in_folders' }

  // 3. Filter by aspect ratio (prefer ~1:1 for Insta feed, ~1.91:1 for LinkedIn)
  const targetRatio = p.platform === 'linkedin' ? 1 : 1 // 1:1 works for both
  const scored = candidates
    .map((c) => ({ ...c, ratioDist: Math.abs((c.width / c.height) - targetRatio) }))
    .sort((a, b) => a.ratioDist - b.ratioDist)
    .slice(0, 10)

  // 4. Let Haiku pick
  const pick = await pickBestMatch(p.text, p.platform, scored)
  if (!pick) return { status: 'needs_image', reason: 'scoring_failed' }

  const chosen = scored[pick.index]
  if (!chosen) return { status: 'needs_image', reason: 'invalid_pick' }

  return { status: 'selected', url: chosen.url, reason: pick.reason }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const rows = await prisma.$queryRaw<UpcomingPost[]>`
    SELECT p.id as post_id, pv.id as variant_id, pv.text, p.platform, p.market, cs.date, pv.image_url
    FROM posts p
    JOIN post_variants pv ON pv.post_id = p.id AND pv.is_active = true
    JOIN calendar_slots cs ON cs.post_id = p.id
    WHERE cs.date BETWEEN '2026-04-16' AND '2026-05-15'
      AND p.market IN ('hq','uk','us')
      AND p.status != 'PUBLISHED'
    ORDER BY cs.date
  `

  const limit = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10)
  let needsImage = rows.filter((r) => !r.image_url)
  if (limit > 0) needsImage = needsImage.slice(0, limit)
  console.log(`${rows.length} posts S1-S4 | ${needsImage.length} without image`)
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing...\n`)

  const log: Array<{ date: string; market: string; platform: string; status: string; url?: string; reason?: string }> = []

  for (let i = 0; i < needsImage.length; i++) {
    const p = needsImage[i]
    const ds = p.date.toISOString().substring(0, 10)
    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${needsImage.length}] ${ds} ${p.market}/${p.platform.padEnd(9)} ... `)

    try {
      const result = await autoSelectForPost(p, false)
      if (result.status === 'selected' && result.url) {
        if (!dryRun) {
          await prisma.postVariant.update({
            where: { id: p.variant_id },
            data: { imageUrl: result.url },
          })
        }
        console.log(`✓ (${(result.reason || '').substring(0, 50)})`)
        log.push({ date: ds, market: p.market, platform: p.platform, status: 'selected', url: result.url, reason: result.reason })
      } else {
        console.log(`⚠ needs_image (${result.reason})`)
        log.push({ date: ds, market: p.market, platform: p.platform, status: 'needs_image', reason: result.reason })
      }
    } catch (err: any) {
      console.log(`✗ ${err.message}`)
      log.push({ date: ds, market: p.market, platform: p.platform, status: 'error', reason: err.message })
    }
  }

  const selected = log.filter((l) => l.status === 'selected').length
  const needs = log.filter((l) => l.status === 'needs_image').length
  const errors = log.filter((l) => l.status === 'error').length
  console.log(`\nDone. ${selected} selected, ${needs} need_image, ${errors} errors.`)

  if (needs > 0) {
    console.log(`\nPosts needing manual image:`)
    log.filter((l) => l.status === 'needs_image').forEach((l) => {
      console.log(`  ${l.date} ${l.market}/${l.platform} — ${l.reason}`)
    })
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  prisma.$disconnect()
  process.exit(1)
})
