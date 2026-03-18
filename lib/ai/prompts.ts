/**
 * Dynamic Prompt Builder
 *
 * Builds AI prompts from Knowledge Base entries.
 * Never hardcodes brand facts — pulls from DB-driven source of truth.
 */

type KnowledgeBase = Record<string, string>

/**
 * Build the content generation system prompt from KB entries.
 */
export function buildContentPrompt(kb: KnowledgeBase): string {
  const productFacts = filterKB(kb, 'PRODUCT_FACT')
  const brandRules = filterKB(kb, 'BRAND_RULE')
  const marketTones = filterKB(kb, 'MARKET_TONE')
  const platformRules = filterKB(kb, 'PLATFORM_RULE')
  const approvedClaims = filterKB(kb, 'APPROVED_CLAIM')
  const restrictedClaims = filterKB(kb, 'RESTRICTED_CLAIM')

  return `You are the social media strategist for Greenmood, a premium Belgian biophilic design company.

PRODUCT FACTS (use ONLY these — never invent):
${formatEntries(productFacts)}

BRAND RULES:
${formatEntries(brandRules)}

MARKET TONES:
${formatEntries(marketTones)}

PLATFORM RULES:
${formatEntries(platformRules)}

APPROVED CLAIMS (may use):
${formatEntries(approvedClaims) || '- None registered'}

RESTRICTED CLAIMS (NEVER use):
${formatEntries(restrictedClaims) || '- None registered'}

CRITICAL INSTRUCTIONS:
- Respond ONLY with valid JSON. No markdown backticks, no preamble.
- Never invent technical specifications or product details.
- Always credit designers when mentioning their products.
- Keep product names in English regardless of market language.
- Adapt tone to each market as specified above.
- Follow all platform-specific formatting rules.`
}

/**
 * Build a fact-checking prompt from KB entries.
 */
export function buildFactCheckPrompt(kb: KnowledgeBase): string {
  const productFacts = filterKB(kb, 'PRODUCT_FACT')
  const approvedClaims = filterKB(kb, 'APPROVED_CLAIM')
  const restrictedClaims = filterKB(kb, 'RESTRICTED_CLAIM')

  return `You are a strict fact-checker for Greenmood. Validate content against these approved facts ONLY.

VERIFIED PRODUCT FACTS:
${formatEntries(productFacts)}

APPROVED CLAIMS:
${formatEntries(approvedClaims) || '- None registered'}

RESTRICTED CLAIMS (flag if found):
${formatEntries(restrictedClaims) || '- None registered'}

Rules:
- Flag ANY technical claim not present in the verified facts above.
- Flag ANY restricted claim that appears in the content.
- Flag missing designer attributions.
- NEVER approve invented technical details.
- Respond with structured JSON.`
}

/**
 * Build a brand review prompt from KB entries.
 */
export function buildBrandReviewPrompt(kb: KnowledgeBase): string {
  const brandRules = filterKB(kb, 'BRAND_RULE')
  const marketTones = filterKB(kb, 'MARKET_TONE')
  const platformRules = filterKB(kb, 'PLATFORM_RULE')

  return `You are the brand voice guardian for Greenmood. Review content for brand compliance.

BRAND RULES:
${formatEntries(brandRules)}

MARKET TONES:
${formatEntries(marketTones)}

PLATFORM RULES:
${formatEntries(platformRules)}

Greenmood tone: Expert, calm, refined, architecturally credible.
Flag: generic hype, vague sustainability fluff, informal tone, formatting violations.
Respond with structured JSON.`
}

// ─── Helpers ───

function filterKB(kb: KnowledgeBase, category: string): Array<[string, string]> {
  return Object.entries(kb)
    .filter(([key]) => key.startsWith(`${category}::`))
    .map(([key, value]) => [key.split('::')[1], value])
}

function formatEntries(entries: Array<[string, string]>): string {
  if (entries.length === 0) return '- None registered'
  return entries.map(([key, value]) => `- ${key}: ${value}`).join('\n')
}
