import { z } from 'zod'

// ─── API Request Validation Schemas ───

export const generateContentSchema = z.object({
  brief: z.string().min(10, 'Brief must be at least 10 characters'),
  contentType: z.enum(['article', 'project', 'product', 'event', 'education', 'behind']),
  markets: z.array(z.string()).min(1, 'Select at least one market'),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  campaignId: z.string().optional(),
  contentPillarId: z.string().optional(),
})

export const createCampaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  brief: z.string().optional(),
  contentType: z.enum(['ARTICLE', 'PROJECT', 'PRODUCT', 'EVENT', 'EDUCATION', 'BEHIND_THE_SCENES']),
  markets: z.array(z.string()).min(1),
  platforms: z.array(z.string()).min(1),
  contentPillarId: z.string().optional(),
})

export const createCalendarSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm').optional(),
  market: z.string().min(1),
  platform: z.string().min(1),
  campaignId: z.string().optional(),
  postId: z.string().optional(),
  notes: z.string().optional(),
})

export const updateCalendarSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['PLANNED', 'CONTENT_READY', 'SCHEDULED', 'PUBLISHED', 'SKIPPED']).optional(),
  notes: z.string().optional(),
  postId: z.string().optional(),
})

export const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  comment: z.string().optional(),
  reviewerId: z.string().optional(),
})

export const createKBEntrySchema = z.object({
  category: z.enum([
    'PRODUCT_FACT',
    'APPROVED_CLAIM',
    'RESTRICTED_CLAIM',
    'BRAND_RULE',
    'MARKET_TONE',
    'PLATFORM_RULE',
    'RESOURCE_LINK',
    'COLOR_PALETTE',
  ]),
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  metadata: z.record(z.unknown()).optional(),
  source: z.string().optional(),
})

export const uploadAssetSchema = z.object({
  filename: z.string().min(1),
  alt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collection: z.string().optional(),
})

export const createPostVariantSchema = z.object({
  postId: z.string(),
  text: z.string().min(1),
  hashtags: z.string().optional(),
  firstComment: z.string().optional(),
  timing: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(['AI_GENERATED', 'MANUAL', 'AI_EDITED']).optional(),
})
