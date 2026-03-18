# Greenmood V2 — Marketing Operating System

## Project Identity

This is the Greenmood V2 Marketing Platform — an AI-powered marketing operating system for Greenmood, a premium biophilic design brand. It is NOT a toy or demo. It is a production-grade internal tool.

**Brand**: Greenmood — preserved moss walls, cork acoustic panels, biophilic architectural products.
**Founded**: 2014, Brussels, by Sadig Alakbarov.
**Positioning**: Premium, design-literate, architecturally credible, sustainability-grounded.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 with custom Greenmood theme
- **Database**: Neon PostgreSQL via Prisma ORM
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514 for content, claude-haiku-4-5-20251001 for validation)
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Validation**: Zod
- **Date handling**: date-fns

## Project Structure

```
app/                      # Next.js App Router pages
  (dashboard)/            # Authenticated layout group
    calendar/             # Editorial calendar
    composer/             # Content composer
    assets/               # Asset library
    approvals/            # Approval queue
    knowledge-base/       # Source of truth / KB
    intelligence/         # Market intelligence hub
    analytics/            # Performance analytics
    settings/             # Workspace settings
  api/                    # API routes
components/               # Reusable UI components
  ui/                     # Primitives (Button, Card, Badge, etc.)
  layout/                 # Sidebar, TopBar, PageHeader
  calendar/               # Calendar-specific components
  composer/               # Composer-specific components
  assets/                 # Asset-specific components
  approvals/              # Approval-specific components
  knowledge-base/         # KB-specific components
lib/                      # Shared utilities
  db.ts                   # Prisma client singleton
  types.ts                # Shared TypeScript types
  constants.ts            # Markets, platforms, content types, brand colors
  utils.ts                # Formatting, date helpers, cn() utility
  ai/                     # AI integration
    client.ts             # Anthropic API wrapper
    prompts.ts            # Dynamic prompt builder (KB-aware)
    parser.ts             # AI response validation
  schemas/                # Zod schemas for API validation
agents/                   # AI agent modules (Phase 2)
prisma/
  schema.prisma           # Database schema
  seed.ts                 # Seed with real Greenmood data
```

## Key Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npx prisma migrate dev   # Run database migrations
npx prisma db push       # Push schema changes (dev)
npx prisma generate      # Regenerate Prisma client
npx prisma db seed       # Seed database
npx prisma studio        # Open Prisma Studio (DB browser)
```

## Architecture Rules

### Server/Client Boundaries
- Pages and layouts are Server Components by default
- Use `"use client"` only for interactive widgets (forms, modals, calendars)
- API routes handle mutations; Server Components handle reads via Prisma
- Never import Prisma client in client components

### Code Style
- Use TypeScript strict mode everywhere
- Use Zod for all API request validation
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Prefer named exports
- Use absolute imports with `@/` prefix

### Database
- All queries filter by workspaceId
- Use Prisma transactions for multi-step operations
- Log all agent runs to `agent_runs` table
- Every approval state transition creates an `approval_steps` record

### AI Integration
- Never hardcode prompts — build dynamically from KnowledgeBaseEntry records
- Always log AI calls to agent_runs with input, output, tokens, duration
- Validate AI JSON responses with Zod before using
- Never let AI-generated content bypass fact-checking
- Use claude-sonnet for content generation, claude-haiku for validation/checking

### UI/UX
- Dark biophilic theme: forest greens, sage accents, cream text
- Fonts: Poppins (UI), Spectral (editorial/accent)
- Premium, calm, efficient aesthetic — no childish AI gimmicks
- Excellent spacing, clear hierarchy, minimal clutter
- All interactive elements need loading states and error handling

## Brand Rules (Source of Truth)

These rules MUST be enforced in all AI-generated content:

- Never use em dashes as list markers
- Always credit designers (Alain Gilles for Cork Tiles, etc.)
- Product names stay in English in all languages
- LinkedIn: NO link in post body (kills reach) — put link in first comment
- LinkedIn: Hook on first line
- Instagram: Hashtags after 3 dots on new lines, 20 relevant hashtags
- Never invent technical product facts
- Never make unsupported sustainability claims
- Tone: expert, calm, refined, architecturally credible
- Avoid generic hype, vague sustainability fluff, inflated marketing language

## Market Tones

- **HQ (Belgium)**: International authority voice
- **USA**: Data-driven, WELL/LEED angle, dollar figures
- **UK**: Editorial, design-forward
- **France**: French language, Belgian designer pride
- **UAE**: Premium, GCC market, wellness credentials
- **Poland**: Polish language, local production (Bogdaniec factory)
- **South Korea**: Korean language
- **Germany**: German language

## Product Facts (Critical — Never Fabricate)

- Ball Moss: NRC 0.73 acoustic rating
- Cork Tiles: Designed by Alain Gilles — patterns: Parenthèse, Sillon, Brickx, Morse
- Design Collection: G-Circle, Hoverlight, Cascade, Rings, Pouf, Planters, Modulor, Framed, Perspective Lines
- Fire rating: B-S2-d0 (EU) / FSI 0, SDI 15 (US)
- Certifications: WELL v2 + LEED v5 compatible
- Materials: 100% natural, 0% maintenance, handcrafted in Europe
- Moss types: Ball Moss, Reindeer Moss, Velvet Leaf, Forest

## Approval State Machine

Valid transitions (enforced server-side):
```
DRAFT → AI_GENERATED (after AI generation)
AI_GENERATED → FACT_CHECKED (after fact check pass)
FACT_CHECKED → BRAND_APPROVED (after brand review)
BRAND_APPROVED → READY_TO_SCHEDULE
READY_TO_SCHEDULE → SCHEDULED (placed on calendar)
SCHEDULED → PUBLISHED (confirmed published)
Any → REJECTED (requires comment)
REJECTED → DRAFT (for rework)
```

## Non-Negotiable Rules

1. Never invent technical product facts
2. Never let AI bypass validation workflows
3. Never create fake success states
4. Never mix AI prompt logic into UI components
5. Every agent run must be logged with full audit trail
6. Every approval transition must be recorded
7. No fragile hardcoding — use DB-driven configuration
8. Source of truth (Knowledge Base) must ground all AI output
9. Publishing architecture must be adapter-based from day one
10. No vanity-only analytics — focus on actionable insights

## Environment Variables

```
ANTHROPIC_API_KEY=        # Claude API key
DATABASE_URL=             # Neon PostgreSQL connection string
NEXT_PUBLIC_APP_URL=      # App URL (for redirects, etc.)
VERCEL_BLOB_TOKEN=        # Vercel Blob storage (assets)
```

## Phase Roadmap

### Phase 1: Foundation MVP (Current)
- TypeScript migration, Tailwind, Prisma + Neon
- UI shell with sidebar navigation
- Knowledge Base (seeded with real data)
- Content Composer (migrated from V1)
- Editorial Calendar (month/week/agenda)
- Asset Library (upload + grid)
- Approval Workflow
- Agent run logging

### Phase 2: Core AI Ops
- Multi-agent orchestration (orchestrator, fact-checker, brand guardian, channel adapter)
- Editorial strategist agent
- Scheduler recommendations
- Analytics foundation

### Phase 3: Intelligence Engine
- Biophilic Market Intelligence Agent
- Competitor watchlists, source management
- Daily/weekly digest generation
- Signal scoring, deduplication
- Intelligence → content pipeline

### Phase 4: Performance Loop
- Performance analyst agent
- Timing optimization
- Learn-from-results workflows
- Content recommendations from analytics
