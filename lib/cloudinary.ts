import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dzbbql3do',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

/**
 * Upload a file to Cloudinary with auto-tagging
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string
    tags?: string[]
    context?: Record<string, string>
    resourceType?: 'image' | 'video' | 'auto'
  } = {}
): Promise<{
  url: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
  tags: string[]
  aiTags?: Array<{ tag: string; confidence: number }>
}> {
  const folder = options.folder || 'greenmood/posts'
  const resourceType = options.resourceType || 'auto'

  const result = await new Promise<any>((resolve, reject) => {
    // Clean display name from original filename
    const displayName = options.context?.originalName
      ? options.context.originalName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
      : undefined

    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      display_name: displayName,
      tags: options.tags || [],
      context: options.context ? Object.entries(options.context).map(([k, v]) => `${k}=${v}`).join('|') : undefined,
    }

    if (typeof file === 'string' && (file.startsWith('data:') || file.startsWith('http'))) {
      cloudinary.uploader.upload(file, uploadOptions, (err, res) => {
        if (err) reject(err)
        else resolve(res)
      })
    } else {
      cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
        if (err) reject(err)
        else resolve(res)
      }).end(file)
    }
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    tags: result.tags || [],
    aiTags: result.info?.categorization?.google_tagging?.data?.map((t: any) => ({
      tag: t.tag,
      confidence: t.confidence,
    })),
  }
}

/**
 * Search assets in Cloudinary
 */
export async function searchAssets(query: {
  tags?: string[]
  folder?: string
  query?: string
  maxResults?: number
}): Promise<Array<{
  url: string
  publicId: string
  width: number
  height: number
  format: string
  tags: string[]
  createdAt: string
}>> {
  let expression = 'folder:greenmood/*'
  if (query.folder) {
    expression = `folder:${query.folder}`
  } else if (query.tags?.length) {
    expression = `tags:${query.tags.join(' AND tags:')}`
  } else if (query.query) {
    expression = query.query
  }

  // Fetch both images and videos
  const [imageResult, videoResult] = await Promise.all([
    cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix: query.folder || 'greenmood/',
      max_results: query.maxResults || 20,
      tags: true,
      context: true,
    }),
    cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      prefix: query.folder || 'greenmood/',
      max_results: query.maxResults || 20,
      tags: true,
      context: true,
    }).catch(() => ({ resources: [] })), // video folder might not exist
  ])

  const allResources = [...(imageResult.resources || []), ...(videoResult.resources || [])]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return allResources.map((r: any) => {
    const originalName = r.context?.custom?.originalName || ''
    const displayName = r.display_name || originalName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || r.public_id.split('/').pop() || ''
    return {
      url: r.secure_url,
      publicId: r.public_id,
      displayName,
      originalName,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes || 0,
      tags: r.tags || [],
      context: r.context?.custom || {},
      createdAt: r.created_at,
      resourceType: r.resource_type || 'image',
    }
  })
}

/**
 * Get optimized URL for a specific format/size
 */
export function getOptimizedUrl(publicId: string, options: {
  width?: number
  height?: number
  crop?: 'fill' | 'fit' | 'scale'
  format?: 'auto' | 'jpg' | 'webp' | 'png'
  quality?: 'auto' | number
} = {}): string {
  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop || 'fill',
    fetch_format: options.format || 'auto',
    quality: options.quality || 'auto',
    secure: true,
  })
}
