/**
 * Image dimension validation for social media platforms.
 * Validates aspect ratios and dimensions before scheduling/publishing.
 */

export interface DimensionValidation {
  valid: boolean
  severity: 'ok' | 'warning' | 'critical'
  currentRatio: string
  expectedRatios: string[]
  message: string
  width?: number
  height?: number
}

export interface PlatformSpec {
  name: string
  ratios: Array<{ label: string; ratio: number; ideal: { w: number; h: number } }>
  criticalFail: (ratio: number) => boolean
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  instagram: {
    name: 'Instagram Feed',
    ratios: [
      { label: '4:5 portrait', ratio: 4 / 5, ideal: { w: 1080, h: 1350 } },
      { label: '1:1 square', ratio: 1, ideal: { w: 1080, h: 1080 } },
    ],
    criticalFail: (r) => r > 1.2, // landscape is bad for feed
  },
  stories: {
    name: 'Instagram Stories',
    ratios: [
      { label: '9:16 portrait', ratio: 9 / 16, ideal: { w: 1080, h: 1920 } },
    ],
    criticalFail: (r) => r > 0.7, // anything wider than ~2:3 will crop badly
  },
  linkedin: {
    name: 'LinkedIn',
    ratios: [
      { label: '1:1 square', ratio: 1, ideal: { w: 1080, h: 1080 } },
      { label: '1.91:1 landscape', ratio: 1.91, ideal: { w: 1200, h: 627 } },
    ],
    criticalFail: () => false, // LinkedIn is more forgiving
  },
  facebook: {
    name: 'Facebook',
    ratios: [
      { label: '1:1 square', ratio: 1, ideal: { w: 1080, h: 1080 } },
      { label: '4:5 portrait', ratio: 4 / 5, ideal: { w: 1080, h: 1350 } },
    ],
    criticalFail: () => false,
  },
  tiktok: {
    name: 'TikTok',
    ratios: [
      { label: '9:16 portrait', ratio: 9 / 16, ideal: { w: 1080, h: 1920 } },
    ],
    criticalFail: (r) => r > 0.7,
  },
}

const RATIO_TOLERANCE = 0.08 // 8% tolerance

function formatRatio(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 1) < 0.05) return '1:1'
  if (Math.abs(r - 4 / 5) < 0.05) return '4:5'
  if (Math.abs(r - 9 / 16) < 0.05) return '9:16'
  if (Math.abs(r - 16 / 9) < 0.05) return '16:9'
  if (Math.abs(r - 1.91) < 0.1) return '1.91:1'
  return `${r.toFixed(2)}:1`
}

export function validateImageDimensions(
  platform: string,
  width: number,
  height: number
): DimensionValidation {
  const spec = PLATFORM_SPECS[platform]
  if (!spec) {
    return {
      valid: true,
      severity: 'ok',
      currentRatio: formatRatio(width, height),
      expectedRatios: [],
      message: `Unknown platform "${platform}" — skipping validation`,
      width,
      height,
    }
  }

  const currentRatio = width / height
  const currentRatioLabel = formatRatio(width, height)

  // Check if any accepted ratio matches
  for (const accepted of spec.ratios) {
    const diff = Math.abs(currentRatio - accepted.ratio) / accepted.ratio
    if (diff <= RATIO_TOLERANCE) {
      // Check minimum dimensions
      const minW = accepted.ideal.w * 0.8
      const minH = accepted.ideal.h * 0.8
      if (width < minW || height < minH) {
        return {
          valid: true,
          severity: 'warning',
          currentRatio: currentRatioLabel,
          expectedRatios: spec.ratios.map((r) => r.label),
          message: `Ratio OK (${accepted.label}) but resolution is low: ${width}×${height}. Recommended: ${accepted.ideal.w}×${accepted.ideal.h}`,
          width,
          height,
        }
      }
      return {
        valid: true,
        severity: 'ok',
        currentRatio: currentRatioLabel,
        expectedRatios: spec.ratios.map((r) => r.label),
        message: `${width}×${height} (${accepted.label}) — perfect for ${spec.name}`,
        width,
        height,
      }
    }
  }

  // No ratio matched — check if critical
  const isCritical = spec.criticalFail(currentRatio)
  const expectedLabels = spec.ratios.map((r) => `${r.label} (${r.ideal.w}×${r.ideal.h})`)

  return {
    valid: false,
    severity: isCritical ? 'critical' : 'warning',
    currentRatio: currentRatioLabel,
    expectedRatios: spec.ratios.map((r) => r.label),
    message: isCritical
      ? `Image ${width}×${height} (${currentRatioLabel}) will be badly cropped on ${spec.name}. Required: ${expectedLabels.join(' or ')}`
      : `Image ${width}×${height} (${currentRatioLabel}) is not ideal for ${spec.name}. Recommended: ${expectedLabels.join(' or ')}`,
    width,
    height,
  }
}

/**
 * Get image dimensions from a Cloudinary URL by appending fl_getinfo.
 * Falls back to fetching the image if the URL is not Cloudinary.
 */
export async function getImageDimensionsFromUrl(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    // Cloudinary: use fl_getinfo trick
    if (url.includes('cloudinary.com')) {
      // Insert fl_getinfo before the file extension
      const infoUrl = url.replace(/\/upload\//, '/upload/fl_getinfo/')
      const res = await fetch(infoUrl)
      if (res.ok) {
        const data = await res.json()
        if (data.input?.width && data.input?.height) {
          return { width: data.input.width, height: data.input.height }
        }
      }
    }

    // Fallback: fetch image and parse dimensions from headers or buffer
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())

    // PNG: width at offset 16, height at offset 20 (4 bytes each, big-endian)
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      }
    }

    // JPEG: scan for SOF markers
    let offset = 2
    while (offset < buffer.length - 8) {
      if (buffer[offset] === 0xff) {
        const marker = buffer[offset + 1]
        // SOF0, SOF1, SOF2
        if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc1) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          }
        }
        const segLen = buffer.readUInt16BE(offset + 2)
        offset += 2 + segLen
      } else {
        offset++
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Apply Cloudinary transformation to resize/crop an image URL for a target platform and ratio.
 * Uses c_fill + g_auto (smart subject detection) for optimal cropping.
 * Returns the original URL if it's not a Cloudinary URL.
 */
export function cloudinaryTransformUrl(
  url: string,
  width: number,
  height: number
): string {
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) return url
  const transform = `c_fill,w_${width},h_${height},g_auto,q_auto,f_auto`
  return url.replace(/\/upload\//, `/upload/${transform}/`)
}

/**
 * Get the best matching ratio spec for a given platform.
 * If the platform supports multiple ratios, returns the first (preferred) one.
 */
export function getPlatformRatios(platform: string) {
  const spec = PLATFORM_SPECS[platform]
  if (!spec) return []
  return spec.ratios.map(r => ({
    label: r.label,
    width: r.ideal.w,
    height: r.ideal.h,
  }))
}
