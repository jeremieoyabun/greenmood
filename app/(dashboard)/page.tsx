import { prisma } from '@/lib/db'
import { getWorkspaceId } from '@/lib/workspace'
import { getCurrentUser } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { SocialIcon, MarketBadge } from '@/components/ui/SocialIcon'
import { MARKETS } from '@/lib/constants'
import { getServerTranslations } from '@/lib/i18n/server'
import { Clock, CheckCircle2, Send, BookOpen, Radio, PenSquare, Calendar, ClipboardCheck, Satellite, ArrowUpRight, Hand } from 'lucide-react'

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
  const [data, currentUser, t] = await Promise.all([getDashboardData(), getCurrentUser(), getServerTranslations()])
  const userRole = currentUser?.role || 'VIEWER'

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
        title={t.nav.dashboard}
        description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: t.dashboard.pendingApproval, value: data.pendingApprovals, color: 'text-amber-400', barColor: 'bg-amber-400', icon: Clock, href: '/approvals', max: Math.max(data.totalPosts, 1) },
          { label: t.dashboard.readyToPublish, value: data.scheduledPosts, color: 'text-emerald-400', barColor: 'bg-emerald-400', icon: CheckCircle2, href: '/approvals', max: Math.max(data.totalPosts, 1) },
          { label: t.dashboard.published, value: data.publishedPosts, color: 'text-sky-400', barColor: 'bg-sky-400', icon: Send, href: '/calendar', max: Math.max(data.totalPosts, 1) },
          { label: t.dashboard.knowledgeBase, value: data.kbCount, color: 'text-purple-400', barColor: 'bg-purple-400', icon: BookOpen, href: '/knowledge-base', max: 50 },
          { label: t.dashboard.intelSignals, value: data.signalCount, color: 'text-pink-400', barColor: 'bg-pink-400', icon: Radio, href: '/intelligence', max: 100 },
        ].map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover>
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color} opacity-70`} />
                <ArrowUpRight className="w-4 h-4 text-gm-cream/20" />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-medium mt-1 block">{stat.label}</span>
              <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full ${stat.barColor} opacity-60 transition-all duration-500`} style={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%` }} />
              </div>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Today's Actions */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.todaysActions}</CardTitle>
            <Badge variant="info">{todayActions.length} items</Badge>
          </CardHeader>
          <CardContent>
            {todayActions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gm-cream/40">{t.dashboard.noActions}</p>
                <a href="/composer" className="text-sm text-gm-sage hover:underline mt-2 inline-block">{t.dashboard.createNewPost}</a>
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
                    {action.type === 'post'
                      ? <Send className="w-4 h-4 text-emerald-400/70" />
                      : <Hand className="w-4 h-4 text-amber-400/70" />
                    }
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Top Signals */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">{t.dashboard.quickActions}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[
                  { label: t.dashboard.createNewPost, href: '/composer', icon: PenSquare, iconColor: 'text-gm-sage' },
                  { label: t.dashboard.viewCalendar, href: '/calendar', icon: Calendar, iconColor: 'text-sky-400' },
                  { label: t.dashboard.reviewApprovals, href: '/approvals', icon: ClipboardCheck, iconColor: 'text-amber-400', count: data.pendingApprovals },
                  { label: t.dashboard.intelligenceHub, href: '/intelligence', icon: Satellite, iconColor: 'text-pink-400', count: data.signalCount },
                ].map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gm-cream/60 hover:text-gm-cream hover:bg-white/[0.06] transition-all group"
                  >
                    <action.icon className={`w-4 h-4 ${action.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <span className="flex-1">{action.label}</span>
                    {action.count ? <Badge variant="info" size="sm">{action.count}</Badge> : <ArrowUpRight className="w-3.5 h-3.5 text-gm-cream/15 group-hover:text-gm-cream/40 transition-colors" />}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {data.topSignals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t.dashboard.topSignals}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {data.topSignals.map((signal) => (
                    <a key={signal.id} href="/intelligence" className="block p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all">
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
          <CardTitle className="text-base">{t.dashboard.weekOverview}</CardTitle>
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
                <div key={i} className={`rounded-xl p-4 border transition-all ${
                  isToday ? 'border-gm-sage/30 bg-gm-sage/8 shadow-sm shadow-gm-sage/5' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-semibold ${isToday ? 'text-gm-sage' : 'text-gm-cream/40'}`}>
                      {DAY_NAMES[day.getDay()]} {day.getDate()}
                    </p>
                    {isToday && <span className="text-[10px] font-bold uppercase tracking-widest text-gm-sage bg-gm-sage/10 px-1.5 py-0.5 rounded">{t.common.today}</span>}
                    {!isToday && daySlots.length > 0 && <span className="text-[10px] text-gm-cream/25">{daySlots.length}</span>}
                  </div>
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
          <CardHeader><CardTitle className="text-base">{t.dashboard.agentActivity}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-3 border-b border-white/[0.08] last:border-0">
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
