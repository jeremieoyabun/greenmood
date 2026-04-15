import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { uploadToCloudinary } from './cloudinary'

const PUBLIC = join(process.cwd(), 'public')

const FONTS = {
  juanaAltRegular: join(PUBLIC, 'Juana-Font', 'Juana Alt Regular.ttf'),
  juanaAltLight: join(PUBLIC, 'Juana-Font', 'Juana Alt Light.ttf'),
  juanaAltBlack: join(PUBLIC, 'Juana-Font', 'Juana Alt Black.ttf'),
  juanaAltSemiBold: join(PUBLIC, 'Juana-Font', 'Juana Alt SemiBold.ttf'),
  poppinsLight: join(PUBLIC, 'fonts', 'Poppins', 'Poppins-300.ttf'),
  poppinsRegular: join(PUBLIC, 'fonts', 'Poppins', 'Poppins-400.ttf'),
  poppinsMedium: join(PUBLIC, 'fonts', 'Poppins', 'Poppins-500.ttf'),
  poppinsSemiBold: join(PUBLIC, 'fonts', 'Poppins', 'Poppins-600.ttf'),
  poppinsBold: join(PUBLIC, 'fonts', 'Poppins', 'Poppins-700.ttf'),
} as const

const fontCache = new Map<string, string>()

function fontBase64(path: string): string {
  if (fontCache.has(path)) return fontCache.get(path)!
  if (!existsSync(path)) throw new Error(`Font not found: ${path}`)
  const b64 = readFileSync(path).toString('base64')
  fontCache.set(path, b64)
  return b64
}

function fontFaceCSS(): string {
  return `
    @font-face { font-family: 'Juana Alt'; font-weight: 300; src: url(data:font/ttf;base64,${fontBase64(FONTS.juanaAltLight)}) format('truetype'); }
    @font-face { font-family: 'Juana Alt'; font-weight: 400; src: url(data:font/ttf;base64,${fontBase64(FONTS.juanaAltRegular)}) format('truetype'); }
    @font-face { font-family: 'Juana Alt'; font-weight: 600; src: url(data:font/ttf;base64,${fontBase64(FONTS.juanaAltSemiBold)}) format('truetype'); }
    @font-face { font-family: 'Juana Alt'; font-weight: 900; src: url(data:font/ttf;base64,${fontBase64(FONTS.juanaAltBlack)}) format('truetype'); }
    @font-face { font-family: 'Poppins'; font-weight: 300; src: url(data:font/ttf;base64,${fontBase64(FONTS.poppinsLight)}) format('truetype'); }
    @font-face { font-family: 'Poppins'; font-weight: 400; src: url(data:font/ttf;base64,${fontBase64(FONTS.poppinsRegular)}) format('truetype'); }
    @font-face { font-family: 'Poppins'; font-weight: 500; src: url(data:font/ttf;base64,${fontBase64(FONTS.poppinsMedium)}) format('truetype'); }
    @font-face { font-family: 'Poppins'; font-weight: 600; src: url(data:font/ttf;base64,${fontBase64(FONTS.poppinsSemiBold)}) format('truetype'); }
    @font-face { font-family: 'Poppins'; font-weight: 700; src: url(data:font/ttf;base64,${fontBase64(FONTS.poppinsBold)}) format('truetype'); }
  `
}

function escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxCharsPerLine) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

export type OverlayTemplate = 'quote' | 'stat' | 'event' | 'product'

export interface OverlayData {
  template: OverlayTemplate
  // Quote card
  quote?: string
  attribution?: string
  // Stat callout
  stat?: string
  label?: string
  context?: string
  // Event teaser
  eventName?: string
  date?: string
  location?: string
  cta?: string
  // Product highlight
  productName?: string
  specs?: string[] // pills, up to 3
}

interface RenderOptions {
  baseImageUrl: string
  overlayData: OverlayData
  width?: number
  height?: number
  uploadFolder?: string
  publicIdPrefix?: string
}

export async function composeOverlayImage(opts: RenderOptions): Promise<{
  url: string
  publicId: string
  width: number
  height: number
  bytes: number
}> {
  const width = opts.width || 1080
  const height = opts.height || 1350 // 4:5 default (Instagram portrait)

  // Fetch the base image
  const res = await fetch(opts.baseImageUrl)
  if (!res.ok) throw new Error(`Failed to fetch base image: ${res.status}`)
  const baseBuffer = Buffer.from(await res.arrayBuffer())

  // Resize/crop to target dimensions
  const base = await sharp(baseBuffer)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .toBuffer()

  // Build the SVG overlay depending on template
  const svg = buildOverlaySVG(opts.overlayData, width, height)

  // Composite SVG on top of base image
  const composed = await sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer()

  // Upload to Cloudinary
  const folder = opts.uploadFolder || 'greenmood/social/generated'
  const timestamp = Date.now()
  const publicIdPrefix = opts.publicIdPrefix || opts.overlayData.template
  const uploaded = await uploadToCloudinary(composed, {
    folder,
    tags: ['generated', `template:${opts.overlayData.template}`],
    context: {
      originalName: `${publicIdPrefix}-${timestamp}`,
      template: opts.overlayData.template,
    },
  })

  return {
    url: uploaded.url,
    publicId: uploaded.publicId,
    width: uploaded.width,
    height: uploaded.height,
    bytes: uploaded.bytes,
  }
}

function buildOverlaySVG(data: OverlayData, w: number, h: number): string {
  const fonts = fontFaceCSS()

  switch (data.template) {
    case 'quote':
      return svgQuote(data, w, h, fonts)
    case 'stat':
      return svgStat(data, w, h, fonts)
    case 'event':
      return svgEvent(data, w, h, fonts)
    case 'product':
      return svgProduct(data, w, h, fonts)
    default:
      throw new Error(`Unknown template: ${(data as any).template}`)
  }
}

/* ─────────── TEMPLATE: QUOTE CARD ─────────── */
function svgQuote(d: OverlayData, w: number, h: number, fonts: string): string {
  const quote = escapeXML(d.quote || '')
  const attribution = escapeXML(d.attribution || '')
  const fontSize = w * 0.055 // ~60px on 1080
  const maxChars = Math.floor(w / (fontSize * 0.52))
  const lines = wrapText(quote, maxChars)
  const lineHeight = fontSize * 1.25
  const totalTextH = lines.length * lineHeight
  const startY = h / 2 - totalTextH / 2 + fontSize

  const textLines = lines.map((line, i) =>
    `<text x="${w / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Juana Alt" font-weight="400" font-size="${fontSize}" fill="#F5F0E8">${escapeXML(line)}</text>`
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><style>${fonts}</style></defs>
    <!-- Dark gradient overlay -->
    <rect width="${w}" height="${h}" fill="url(#grad)"/>
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(6,13,6,0.3)"/>
        <stop offset="50%" stop-color="rgba(6,13,6,0.65)"/>
        <stop offset="100%" stop-color="rgba(6,13,6,0.3)"/>
      </linearGradient>
    </defs>
    <!-- Opening quote mark -->
    <text x="${w / 2}" y="${startY - fontSize * 1.2}" text-anchor="middle" font-family="Juana Alt" font-weight="400" font-size="${fontSize * 2.2}" fill="#A3BF94" opacity="0.7">&#8220;</text>
    ${textLines}
    ${attribution ? `
      <line x1="${w / 2 - 30}" y1="${startY + totalTextH + fontSize * 0.5}" x2="${w / 2 + 30}" y2="${startY + totalTextH + fontSize * 0.5}" stroke="#A3BF94" stroke-width="2"/>
      <text x="${w / 2}" y="${startY + totalTextH + fontSize * 1.4}" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="${fontSize * 0.35}" letter-spacing="3" fill="#A3BF94">${attribution.toUpperCase()}</text>
    ` : ''}
  </svg>`
}

/* ─────────── TEMPLATE: STAT CALLOUT ─────────── */
function svgStat(d: OverlayData, w: number, h: number, fonts: string): string {
  const stat = escapeXML(d.stat || '')
  const label = escapeXML((d.label || '').toUpperCase())
  const context = escapeXML(d.context || '')
  const statSize = w * 0.28 // massive
  const labelSize = w * 0.035
  const contextSize = w * 0.03

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><style>${fonts}</style></defs>
    <!-- Bottom gradient -->
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(6,13,6,0)"/>
        <stop offset="55%" stop-color="rgba(6,13,6,0.2)"/>
        <stop offset="100%" stop-color="rgba(6,13,6,0.85)"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grad)"/>
    <!-- Stat massif centré -->
    <text x="${w * 0.08}" y="${h - h * 0.22}" font-family="Juana Alt" font-weight="900" font-size="${statSize}" fill="#F5F0E8" letter-spacing="-2">${stat}</text>
    <!-- Label -->
    <text x="${w * 0.08}" y="${h - h * 0.14}" font-family="Poppins" font-weight="600" font-size="${labelSize}" letter-spacing="4" fill="#A3BF94">${label}</text>
    ${context ? `<text x="${w * 0.08}" y="${h - h * 0.08}" font-family="Poppins" font-weight="300" font-size="${contextSize}" fill="rgba(245,240,232,0.7)">${context}</text>` : ''}
  </svg>`
}

/* ─────────── TEMPLATE: EVENT TEASER ─────────── */
function svgEvent(d: OverlayData, w: number, h: number, fonts: string): string {
  const eventName = escapeXML(d.eventName || '')
  const date = escapeXML((d.date || '').toUpperCase())
  const location = escapeXML((d.location || '').toUpperCase())
  const cta = escapeXML(d.cta || '')
  const nameSize = w * 0.075
  const metaSize = w * 0.032
  const ctaSize = w * 0.03

  const nameLines = wrapText(eventName, Math.floor(w / (nameSize * 0.48)))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><style>${fonts}</style></defs>
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(6,13,6,0.7)"/>
        <stop offset="50%" stop-color="rgba(6,13,6,0.25)"/>
        <stop offset="100%" stop-color="rgba(6,13,6,0.85)"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grad)"/>
    <!-- Top: Date + location bar -->
    <text x="${w * 0.08}" y="${h * 0.12}" font-family="Poppins" font-weight="500" font-size="${metaSize}" letter-spacing="4" fill="#A3BF94">${date}${location ? `  &#8226;  ${location}` : ''}</text>
    <!-- Center: Event name -->
    ${nameLines.map((line, i) => `<text x="${w * 0.08}" y="${h * 0.5 + (i - nameLines.length / 2) * nameSize * 1.15 + nameSize * 0.8}" font-family="Juana Alt" font-weight="600" font-size="${nameSize}" fill="#F5F0E8" letter-spacing="-1">${escapeXML(line)}</text>`).join('')}
    <!-- Bottom: CTA -->
    ${cta ? `
      <line x1="${w * 0.08}" y1="${h * 0.88}" x2="${w * 0.08 + 60}" y2="${h * 0.88}" stroke="#A3BF94" stroke-width="2"/>
      <text x="${w * 0.08}" y="${h * 0.93}" font-family="Poppins" font-weight="500" font-size="${ctaSize}" letter-spacing="3" fill="#F5F0E8">${cta.toUpperCase()}</text>
    ` : ''}
  </svg>`
}

/* ─────────── TEMPLATE: PRODUCT HIGHLIGHT ─────────── */
function svgProduct(d: OverlayData, w: number, h: number, fonts: string): string {
  const productName = escapeXML(d.productName || '')
  const specs = (d.specs || []).slice(0, 3).map(escapeXML)
  const nameSize = w * 0.068
  const specSize = w * 0.028

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><style>${fonts}</style></defs>
    <defs>
      <linearGradient id="grad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="rgba(6,13,6,0.9)"/>
        <stop offset="40%" stop-color="rgba(6,13,6,0.4)"/>
        <stop offset="100%" stop-color="rgba(6,13,6,0)"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grad)"/>
    <!-- Product name -->
    <text x="${w * 0.08}" y="${h * 0.78}" font-family="Juana Alt" font-weight="400" font-size="${nameSize}" fill="#F5F0E8" letter-spacing="-0.5">${productName}</text>
    <!-- Specs as pills -->
    ${specs.map((spec, i) => {
      const padX = specSize * 0.9
      const padY = specSize * 0.5
      const approxW = spec.length * specSize * 0.54 + padX * 2
      const x = w * 0.08 + specs.slice(0, i).reduce((acc, s) => acc + s.length * specSize * 0.54 + padX * 2 + 12, 0)
      const y = h * 0.85
      return `
        <rect x="${x}" y="${y}" width="${approxW}" height="${specSize + padY * 2}" rx="${(specSize + padY * 2) / 2}" fill="none" stroke="#A3BF94" stroke-width="1.5" opacity="0.8"/>
        <text x="${x + approxW / 2}" y="${y + specSize + padY * 0.7}" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="${specSize}" letter-spacing="2" fill="#A3BF94">${spec.toUpperCase()}</text>
      `
    }).join('')}
  </svg>`
}
