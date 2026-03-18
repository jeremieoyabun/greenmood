import { prisma } from './db'

/**
 * Get the default workspace.
 * Phase 1: Single workspace. Phase 2: Multi-workspace with auth.
 */
export async function getDefaultWorkspace() {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!workspace) {
    throw new Error('No workspace found. Run: npx tsx prisma/seed.ts')
  }

  return workspace
}

/**
 * Get workspace ID. Cached after first call per request.
 */
let cachedWorkspaceId: string | null = null

export async function getWorkspaceId(): Promise<string> {
  if (cachedWorkspaceId) return cachedWorkspaceId
  const ws = await getDefaultWorkspace()
  cachedWorkspaceId = ws.id
  return ws.id
}
