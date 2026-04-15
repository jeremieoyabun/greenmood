/**
 * Retransforms existing Cloudinary image URLs to the correct aspect ratio per platform.
 * - Instagram feed: 1080x1350 (4:5)
 * - Instagram stories: 1080x1920 (9:16)
 * - LinkedIn: 1080x1080 (1:1)
 *
 * Only touches URLs that don't already have a transformation block.
 * Skips non-Cloudinary URLs and video URLs.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { cloudinaryTransformUrl } from '../../lib/image-validation'

const prisma = new PrismaClient()

function hasTransform(url: string): boolean {
  // Check for w_ and h_ in the transformation block
  const m = url.match(/\/upload\/([^/]+)\//)
  if (!m) return false
  return /(?:^|,)w_\d+/.test(m[1]) && /(?:^|,)h_\d+/.test(m[1])
}

function isVideo(url: string): boolean {
  return /\/video\/upload\//.test(url) || /\.(mp4|mov|webm)$/i.test(url)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const rows = await prisma.$queryRaw<
    Array<{ variant_id: string; post_id: string; platform: string; market: string; date: Date; image_url: string }>
  >`
    SELECT pv.id as variant_id, p.id as post_id, p.platform, p.market, cs.date, pv.image_url
    FROM posts p
    JOIN post_variants pv ON pv.post_id = p.id AND pv.is_active = true
    JOIN calendar_slots cs ON cs.post_id = p.id
    WHERE cs.date BETWEEN '2026-04-16' AND '2026-05-15'
      AND p.market IN ('hq','uk','us') AND p.status != 'PUBLISHED'
      AND pv.image_url IS NOT NULL
      AND pv.image_url LIKE '%cloudinary.com%'
  `

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Processing ${rows.length} posts with Cloudinary images...\n`)

  let updated = 0
  let skipped = 0
  for (const r of rows) {
    const ds = r.date.toISOString().substring(0, 10)
    if (isVideo(r.image_url)) {
      skipped++
      continue
    }
    if (hasTransform(r.image_url)) {
      skipped++
      continue
    }

    const dims = r.platform === 'stories'
      ? { w: 1080, h: 1920 }
      : r.platform === 'linkedin'
      ? { w: 1080, h: 1080 }
      : { w: 1080, h: 1350 }

    const newUrl = cloudinaryTransformUrl(r.image_url, dims.w, dims.h)
    if (newUrl === r.image_url) {
      skipped++
      continue
    }

    console.log(`${ds} ${r.market}/${r.platform} -> ${dims.w}x${dims.h}`)
    if (!dryRun) {
      await prisma.postVariant.update({
        where: { id: r.variant_id },
        data: { imageUrl: newUrl },
      })
    }
    updated++
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped (video/already-transformed).`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  prisma.$disconnect()
  process.exit(1)
})
