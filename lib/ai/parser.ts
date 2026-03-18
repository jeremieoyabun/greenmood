import { z } from 'zod'

/**
 * Parse and validate AI JSON responses.
 * Handles common issues like markdown code blocks, trailing text, etc.
 */
export function parseAIResponse<T>(
  raw: string,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string; raw: string } {
  // Strip markdown code blocks if present
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned)
    const validated = schema.safeParse(parsed)
    if (validated.success) {
      return { success: true, data: validated.data }
    }
    return {
      success: false,
      error: `Validation failed: ${validated.error.message}`,
      raw,
    }
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const validated = schema.safeParse(parsed)
        if (validated.success) {
          return { success: true, data: validated.data }
        }
        return {
          success: false,
          error: `Validation failed: ${validated.error.message}`,
          raw,
        }
      } catch {
        // Fall through
      }
    }

    return {
      success: false,
      error: 'Failed to parse response as JSON',
      raw,
    }
  }
}

// ─── Common Schemas ───

export const generationResultSchema = z.object({
  title: z.string(),
  posts: z.record(
    z.string(),
    z.object({
      text: z.string(),
      first_comment: z.string().nullable(),
      hashtags: z.string().nullable(),
      timing: z.string().nullable(),
      notes: z.string().nullable(),
    })
  ),
  image_prompts: z.array(z.string()).optional(),
  stories: z.array(z.string()).optional(),
})

export const factCheckResultSchema = z.object({
  status: z.enum(['pass', 'fail', 'warning']),
  issues: z.array(
    z.object({
      type: z.enum([
        'incorrect_fact',
        'unsupported_claim',
        'restricted_claim',
        'missing_attribution',
        'invented_detail',
      ]),
      severity: z.enum(['critical', 'warning']),
      text: z.string(),
      explanation: z.string(),
      suggestion: z.string().nullable(),
    })
  ),
  summary: z.string(),
})

export const brandReviewResultSchema = z.object({
  status: z.enum(['pass', 'needs_revision']),
  score: z.number().min(1).max(10),
  issues: z.array(
    z.object({
      type: z.enum(['tone', 'formatting', 'brand_rule', 'quality']),
      severity: z.enum(['critical', 'suggestion']),
      text: z.string(),
      explanation: z.string(),
      suggestion: z.string(),
    })
  ),
  revisedContent: z.string().nullable(),
  summary: z.string(),
})
