import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { KBBrowser } from '@/components/knowledge-base/KBBrowser'

async function getKBData() {
  const workspaceId = await getWorkspaceId()

  const entries = await prisma.knowledgeBaseEntry.findMany({
    where: { workspaceId, isActive: true },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  })

  // Group by category with counts
  const categories: Record<string, { count: number; entries: typeof entries }> = {}
  for (const entry of entries) {
    if (!categories[entry.category]) {
      categories[entry.category] = { count: 0, entries: [] }
    }
    categories[entry.category].count++
    categories[entry.category].entries.push(entry)
  }

  return { entries, categories, total: entries.length }
}

export default async function KnowledgeBasePage() {
  const { entries, categories, total } = await getKBData()

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description={`Source of truth — ${total} entries grounding all AI-generated content`}
      />
      <KBBrowser
        entries={JSON.parse(JSON.stringify(entries))}
        categoryCounts={Object.fromEntries(
          Object.entries(categories).map(([k, v]) => [k, v.count])
        )}
      />
    </>
  )
}
