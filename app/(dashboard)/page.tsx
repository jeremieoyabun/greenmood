import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { MARKETS } from '@/lib/constants'

async function getDashboardData() {
  const workspaceId = await getWorkspaceId()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [
    kbCount,
    totalPosts,
    pendingApprovals,
    scheduledPosts,
    publishedPosts,
    competitorCount,
    signalCount,
    todaySlots,
    weekSlots,
    recentRuns,
    topSignals,
  ] = await Promise.all([
    prisma.knowledgeBaseEntry.count({ where: { workspaceId, isActive: true } }),
    prisma.post.count({ where: { workspaceId } }),
    prisma.post.count({ where: { workspaceId, status: { in: ['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED'] } } }),
    prisma.post.count({ where: { workspaceId, status: { in: ['BRAND_APPROVED', 'READY_TO_SCHEDULE', 'SCHEDULED'] } } }),
    prisma.post.count({ where: { workspaceId, status: 'PUBLISHED' } }),
    prisma.competitorEntity.count({ where: { isActive: true } }),
    prisma.intelligenceSignal.count({ where: { isDuplicate: false } }),
    // Today's calendar
    prisma.calendarSlot.findMany({
      where: { workspaceId, date: { gte: today, lt: tomorrow } },
      include: {
        post: {
          select: {
            id: true, status: true, market: true, platform: true,
            variants: { where: { isActive: true }, take: 1, select: { text: true } },
          },
        },
      },
      orderBy: { time: 'asc' },
    }),
    // This week's calendar
    prisma.calendarSlot.findMany({
      where: { workspaceId, date: { gte: today, lt: weekEnd } },
      include: {
        post: { select: { id: true, status: true, market: true, platform: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),
    // Recent agent runs
    prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, agentType: true, status: true, createdAt: true, durationMs: true, tokensUsed: true },
    }),
    // Top intelligence signals
    prisma.intelligenceSignal.findMany({
      where: { isDuplicate: false },
      orderBy: { score: 'desc' },
      take: 3,
      select: { id: true, title: true, category: true, score: true, urgency: true },
    }),
  ])

  return {
    kbCount, totalPosts, pendingApprovals, scheduledPosts, publishedPosts,
    competitorCount, signalCount, todaySlots, weekSlots, recentRuns, topSignals,
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function DashboardPage() {
  const data = await getDashboardData()

  const todayActions: { label: string; type: 'post' | 'approve' | 'alert'; detail: string }[] = []

  // Build today's actions
  data.todaySlots.forEach(slot => {
    if (slot.post) {
      const caption = slot.post.variants?.[0]?.text?.substring(0, 60) || 'No caption'
      const market = MARKETS[slot.post.market]
      todayActions.push({
        label: `${market?.emoji || ''} ${slot.post.platform} ${slot.time || ''}`,
        type: slot.post.status === 'READY_TO_SCHEDULE' || slot.post.status === 'SCHEDULED' ? 'post' : 'approve',
        detail: caption,
      })
    }
  })

  if (data.pendingApprovals > 0) {
    todayActions.push({
      label: `${data.pendingApprovals} posts awaiting approval`,
      type: 'approve',
      detail: 'Review in Approvals queue',
    })
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Pending Approval', value: data.pendingApprovals, color: 'text-amber-400', href: '/approvals' },
          { label: 'Ready to Publish', value: data.scheduledPosts, color: 'text-emerald-400', href: '/approvals' },
          { label: 'Published', value: data.publishedPosts, color: 'text-sky-400', href: '/calendar' },
          { label: 'Knowledge Base', value: data.kbCount, color: 'text-purple-400', href: '/knowledge-base' },
          { label: 'Intel Signals', value: data.signalCount, color: 'text-pink-400', href: '/intelligence' },
        ].map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover>
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{stat.label}</span>
              <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Today's Actions */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Actions</CardTitle>
            <Badge variant="info">{todayActions.length} items</Badge>
          </CardHeader>
          <CardContent>
            {todayActions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-gm-cream/40">No posts scheduled for today</p>
                <a href="/composer" className="text-xs text-gm-sage hover:underline mt-2 inline-block">Create content in Composer</a>
              </div>
            ) : (
              <div className="space-y-2">
                {todayActions.map((action, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                    action.type === 'post' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    action.type === 'approve' ? 'bg-amber-500/5 border-amber-500/10' :
                    'bg-red-500/5 border-red-500/10'
                  }`}>
                    <span className="text-xs mt-0.5">
                      {action.type === 'post' ? '📤' : action.type === 'approve' ? '✋' : '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gm-cream/80">{action.label}</p>
                      <p className="text-[10px] text-gm-cream/40 truncate">{action.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Top Signals */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  { label: 'Create New Post', href: '/composer', icon: '✏️' },
                  { label: 'View Calendar', href: '/calendar', icon: '📅' },
                  { label: 'Review Approvals', href: '/approvals', icon: '✅', count: data.pendingApprovals },
                  { label: 'Intelligence Hub', href: '/intelligence', icon: '📡', count: data.signalCount },
                ].map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gm-cream/60 hover:text-gm-cream hover:bg-white/[0.03] transition-colors"
                  >
                    <span>{action.icon}</span>
                    <span className="flex-1">{action.label}</span>
                    {action.count ? <Badge variant="info" size="sm">{action.count}</Badge> : null}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Intelligence */}
          {data.topSignals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Top Signals</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topSignals.map((signal) => (
                    <a key={signal.id} href="/intelligence" className="block p-2 rounded bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-bold ${
                          (signal.score || 0) >= 90 ? 'text-emerald-400' :
                          (signal.score || 0) >= 80 ? 'text-sky-400' : 'text-amber-400'
                        }`}>{signal.score}</span>
                        <Badge variant={signal.urgency === 'HIGH' ? 'danger' : 'default'} size="sm">{signal.category?.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-[10px] text-gm-cream/50 line-clamp-2">{signal.title}</p>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Week Overview */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>This Week</CardTitle>
          <Badge variant="default">{data.weekSlots.length} posts planned</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => {
              const day = new Date()
              day.setDate(day.getDate() + i)
              day.setHours(0, 0, 0, 0)
              const dayEnd = new Date(day)
              dayEnd.setDate(dayEnd.getDate() + 1)
              const daySlots = data.weekSlots.filter(s => {
                const slotDate = new Date(s.date)
                return slotDate >= day && slotDate < dayEnd
              })
              const isToday = i === 0

              return (
                <div key={i} className={`rounded-lg p-2 border ${
                  isToday ? 'border-gm-sage/20 bg-gm-sage/5' : 'border-white/[0.04] bg-white/[0.01]'
                }`}>
                  <p className={`text-[10px] font-medium mb-1.5 ${isToday ? 'text-gm-sage' : 'text-gm-cream/30'}`}>
                    {DAY_NAMES[day.getDay()]} {day.getDate()}
                    {isToday && <span className="ml-1 text-[8px] text-gm-sage/60">TODAY</span>}
                  </p>
                  {daySlots.length === 0 ? (
                    <p className="text-[9px] text-gm-cream/15">No posts</p>
                  ) : (
                    <div className="space-y-1">
                      {daySlots.map((slot) => {
                        const market = MARKETS[slot.post?.market || '']
                        return (
                          <div key={slot.id} className="flex items-center gap-1">
                            <span className="text-[9px]">{market?.emoji || ''}</span>
                            <span className="text-[9px] text-gm-cream/40 truncate">{slot.post?.platform} {slot.time || ''}</span>
                            <StatusDot status={slot.post?.status || ''} className="ml-auto" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Agent Activity */}
      {data.recentRuns.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Recent Agent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <StatusDot status={run.status} />
                  <span className="text-xs text-gm-cream/60 flex-1">{run.agentType.replace(/_/g, ' ')}</span>
                  <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'} size="sm">
                    {run.status}
                  </Badge>
                  {run.tokensUsed ? <span className="text-[9px] text-gm-cream/20">{run.tokensUsed} tokens</span> : null}
                  {run.durationMs ? <span className="text-[9px] text-gm-cream/20">{(run.durationMs / 1000).toFixed(1)}s</span> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
