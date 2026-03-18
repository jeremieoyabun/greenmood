import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AssetsPage() {
  return (
    <>
      <PageHeader
        title="Asset Library"
        description="Manage images, videos, and media assets"
        actions={<Button size="sm">Upload</Button>}
      />

      <Card>
        <EmptyState
          title="No assets yet"
          description="Upload images, videos, and media to build your asset library. Assets can be tagged, organized into collections, and linked to posts."
        />
      </Card>
    </>
  )
}
