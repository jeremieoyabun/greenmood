import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Content performance, engagement insights, and optimization recommendations"
      />

      <Card>
        <EmptyState
          title="Analytics available after publishing"
          description="Performance data will be collected once posts are published through the platform. Analytics will include engagement by platform, market, content pillar, and posting time."
        />
      </Card>
    </>
  )
}
