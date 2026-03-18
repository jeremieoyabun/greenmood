import { prisma } from './db'
import { cache } from 'react'

/**
 * Get the default workspace — cached per request via React cache().
 */
export const getDefaultWorkspace = cache(async () => {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (!workspace) {
    throw new Error('No workspace found. Run: npx tsx prisma/seed.ts')
  }

  return workspace
})

/**
 * Get workspace ID — cached per request.
 */
export const getWorkspaceId = cache(async (): Promise<string> => {
  const ws = await getDefaultWorkspace()
  return ws.id
})
