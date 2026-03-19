import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { SocialIcon, MarketBadge } from '@/components/ui/SocialIcon'
import { MARKETS } from '@/lib/constants'
import { cookies } from 'next/headers'

async function getUserRole() {
  const cookieStore = await cookies()
  const session = cookieStore.get('gm-session')
  if (!session?.value) return 'OPERATOR'
  try {
    const decoded = Buffer.from(session.value, 'base64').toString()
    const parsed = JSON.parse(decoded)
    const user = await prisma.user.findUnique({ where: { id: parsed.userId }, select: { role: true } })
    return user?.role || 'OPERATOR'
  } catch { return 'OPERATOR' }
}

async function getDashboardData() {
  const workspaceId = await getWorkspaceId()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [
    kbCount, totalPosts, pendingApprovals, scheduledPosts, publishedPosts,
    competitorCount, signalCount, todaySlots, weekSlots, recentRuns, topSignals,
  ] = await Promise.all([
    prisma.knowledgeBaseEntry.count({ where: { workspaceId, isActive: true } }),
    prisma.post.count({ where: { workspaceId } }),
    prisma.post.count({ where: { workspaceId, status: { in: ['AI_GENERATED', 'FACT_CHECKED', 'BRAND_APPROVED'] } } }),
    prisma.post.count({ where: { workspaceId, status: { in: ['BRAND_APPROVED', 'READY_TO_SCHEDULE', 'SCHEDULED'] } } }),
    prisma.post.count({ where: { workspaceId, status: 'PUBLISHED' } }),
    prisma.competitorEntity.count({ where: { isActive: true } }),
    prisma.intelligenceSignal.count({ where: { isDuplicate: false } }),
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
    prisma.calendarSlot.findMany({
      where: { workspaceId, date: { gte: today, lt: weekEnd } },
      include: {
        post: { select: { id: true, status: true, market: true, platform: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),
    prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, agentType: true, status: true, createdAt: true, durationMs: true, tokensUsed: true },
    }),
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
  const [data, userRole] = await Promise.all([getDashboardData(), getUserRole()])

  const todayActions: { market: string; platform: string; time: string; type: 'post' | 'approve' | 'alert'; detail: string }[] = []

  data.todaySlots.forEach(slot => {
    if (slot.post) {
      const caption = slot.post.variants?.[0]?.text?.substring(0, 70) || 'No caption'
      todayActions.push({
        market: slot.post.market,
        platform: slot.post.platform,
        time: slot.time || '',
        type: slot.post.status === 'READY_TO_SCHEDULE' || slot.post.status === 'SCHEDULED' ? 'post' : 'approve',
        detail: caption,
      })
    }
  })

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Pending Approval', value: data.pendingApprovals, color: 'text-amber-400', href: '/approvals' },
          { label: 'Ready to Publish', value: data.scheduledPosts, color: 'text-emerald-400', href: '/approvals' },
          { label: 'Published', value: data.publishedPosts, color: 'text-sky-400', href: '/calendar' },
          { label: 'Knowledge Base', value: data.kbCount, color: 'text-purple-400', href: '/knowledge-base' },
          { label: 'Intel Signals', value: data.signalCount, color: 'text-pink-400', href: '/intelligence' },
        ].map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover>
              <span className="text-sm uppercase tracking-wider text-gm-cream/40 font-medium">{stat.label}</span>
              <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Today's Actions */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Actions</CardTitle>
            <Badge variant="info">{todayActions.length} items</Badge>
          </CardHeader>
          <CardContent>
            {todayActions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gm-cream/40">No posts scheduled for today</p>
                <a href="/composer" className="text-sm text-gm-sage hover:underline mt-2 inline-block">Create content in Composer</a>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayActions.map((action, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${
                    action.type === 'post' ? 'bg-emerald-500/5 border-emerald-500/10' :
                    action.type === 'approve' ? 'bg-amber-500/5 border-amber-500/10' :
                    'bg-red-500/5 border-red-500/10'
                  }`}>
                    <MarketBadge market={action.market} platform={action.platform} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gm-cream/80 truncate">{action.detail}</p>
                    </div>
                    <span className="text-sm text-gm-cream/30 whitespace-nowrap">{action.time}</span>
                    <span className="text-sm">
                      {action.type === 'post' ? '📤' : '✋'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Top Signals */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[
                  { label: 'Create New Post', href: '/composer', icon: '✏️' },
                  { label: 'View Calendar', href: '/calendar', icon: '📅' },
                  { label: 'Review Approvals', href: '/approvals', icon: '✅', count: data.pendingApprovals },
                  { label: 'Intelligence Hub', href: '/intelligence', icon: '📡', count: data.signalCount },
                ].map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gm-cream/60 hover:text-gm-cream hover:bg-white/[0.04] transition-all"
                  >
                    <span className="text-base">{action.icon}</span>
                    <span className="flex-1">{action.label}</span>
                    {action.count ? <Badge variant="info" size="sm">{action.count}</Badge> : null}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {data.topSignals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top Signals</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {data.topSignals.map((signal) => (
                    <a key={signal.id} href="/intelligence" className="block p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-sm font-bold ${
                          (signal.score || 0) >= 90 ? 'text-emerald-400' :
                          (signal.score || 0) >= 80 ? 'text-sky-400' : 'text-amber-400'
                        }`}>{signal.score}</span>
                        <Badge variant={signal.urgency === 'HIGH' ? 'danger' : 'default'} size="sm">{signal.category?.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-gm-cream/50 line-clamp-2">{signal.title}</p>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Week Overview */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">This Week</CardTitle>
          <Badge variant="default">{data.weekSlots.length} posts planned</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
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
                <div key={i} className={`rounded-xl p-3 border ${
                  isToday ? 'border-gm-sage/20 bg-gm-sage/5' : 'border-white/[0.04] bg-white/[0.01]'
                }`}>
                  <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-gm-sage' : 'text-gm-cream/40'}`}>
                    {DAY_NAMES[day.getDay()]} {day.getDate()}
                    {isToday && <span className="ml-1.5 text-xs text-gm-sage/60">TODAY</span>}
                  </p>
                  {daySlots.length === 0 ? (
                    <p className="text-sm text-gm-cream/15">No posts</p>
                  ) : (
                    <div className="space-y-1.5">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center gap-2">
                          <MarketBadge market={slot.post?.market || ''} platform={slot.post?.platform || ''} size="sm" />
                          <span className="text-xs text-gm-cream/30">{slot.time || ''}</span>
                          <StatusDot status={slot.post?.status || ''} className="ml-auto" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Agent Activity — Operator only */}
      {userRole === 'OPERATOR' && data.recentRuns.length > 0 && (
        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Recent Agent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <StatusDot status={run.status} />
                  <span className="text-sm text-gm-cream/60 flex-1">{run.agentType.replace(/_/g, ' ')}</span>
                  <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'warning'} size="sm">
                    {run.status}
                  </Badge>
                  {run.tokensUsed ? <span className="text-sm text-gm-cream/20">{run.tokensUsed} tokens</span> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
