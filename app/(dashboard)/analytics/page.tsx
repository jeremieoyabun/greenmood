import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SocialIcon } from '@/components/ui/SocialIcon'

async function getAnalyticsData() {
  // Overall stats
  const snapshots = await prisma.$queryRaw<Array<any>>`
    SELECT platform, market,
      SUM(likes) as total_likes, SUM(comments) as total_comments,
      SUM(reach) as total_reach, SUM(impressions) as total_impressions,
      SUM(saves) as total_saves, SUM(shares) as total_shares,
      COUNT(*) as posts
    FROM analytics_snapshots
    GROUP BY platform, market
    ORDER BY total_likes DESC
  `

  // Top posts by engagement
  const topPosts = await prisma.$queryRaw<Array<any>>`
    SELECT a.likes, a.comments, a.reach, a.saves, a.shares, a.platform, a.market,
      pv.text, pv.image_url
    FROM analytics_snapshots a
    LEFT JOIN post_variants pv ON pv.post_id = a.post_id AND pv.is_active = true
    ORDER BY (a.likes + a.comments * 3 + a.saves * 2 + a.shares * 2) DESC
    LIMIT 5
  `

  // Performance by day of week
  const byDayOfWeek = await prisma.$queryRaw<Array<any>>`
    SELECT EXTRACT(DOW FROM date) as dow,
      AVG(likes) as avg_likes, AVG(reach) as avg_reach,
      AVG(saves) as avg_saves, COUNT(*) as posts
    FROM analytics_snapshots
    WHERE likes > 0
    GROUP BY EXTRACT(DOW FROM date)
    ORDER BY avg_likes DESC
  `

  // Recent performance trend (last 10 posts)
  const recentTrend = await prisma.$queryRaw<Array<any>>`
    SELECT date, likes, comments, reach, saves, shares
    FROM analytics_snapshots
    ORDER BY date DESC
    LIMIT 10
  `

  // KB performance insight
  const insightRows = await prisma.$queryRaw<Array<{ value: string; updated_at: Date }>>`
    SELECT value, updated_at FROM knowledge_base
    WHERE category = 'PERFORMANCE_INSIGHT' AND is_active = true
    ORDER BY updated_at DESC LIMIT 1
  `
  const insight = insightRows[0] ? { value: insightRows[0].value, updatedAt: insightRows[0].updated_at } : null

  return { snapshots, topPosts, byDayOfWeek, recentTrend: recentTrend.reverse(), insight }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  const totalLikes = data.snapshots.reduce((s: number, r: any) => s + Number(r.total_likes || 0), 0)
  const totalReach = data.snapshots.reduce((s: number, r: any) => s + Number(r.total_reach || 0), 0)
  const totalSaves = data.snapshots.reduce((s: number, r: any) => s + Number(r.total_saves || 0), 0)
  const totalShares = data.snapshots.reduce((s: number, r: any) => s + Number(r.total_shares || 0), 0)
  const totalComments = data.snapshots.reduce((s: number, r: any) => s + Number(r.total_comments || 0), 0)
  const totalPosts = data.snapshots.reduce((s: number, r: any) => s + Number(r.posts || 0), 0)

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Content performance across all platforms and markets"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Reach', value: totalReach.toLocaleString(), color: 'text-sky-400' },
          { label: 'Likes', value: totalLikes.toLocaleString(), color: 'text-pink-400' },
          { label: 'Comments', value: totalComments.toLocaleString(), color: 'text-amber-400' },
          { label: 'Saves', value: totalSaves.toLocaleString(), color: 'text-emerald-400' },
          { label: 'Shares', value: totalShares.toLocaleString(), color: 'text-purple-400' },
          { label: 'Posts Tracked', value: totalPosts.toLocaleString(), color: 'text-gm-cream' },
        ].map(s => (
          <Card key={s.label}>
            <span className="text-xs uppercase tracking-wider text-gm-cream/40">{s.label}</span>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card>
          <CardHeader><CardTitle>Top Performing Posts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topPosts.map((post: any, i: number) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-lg font-bold text-gm-cream/20 w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gm-cream/70 line-clamp-2">{post.text?.substring(0, 100) || 'No caption'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <SocialIcon platform={post.platform} size="sm" />
                      <span className="text-xs text-pink-400">{Number(post.likes)} likes</span>
                      <span className="text-xs text-emerald-400">{Number(post.saves)} saves</span>
                      <span className="text-xs text-purple-400">{Number(post.shares)} shares</span>
                      <span className="text-xs text-sky-400">{Number(post.reach)} reach</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.topPosts.length === 0 && (
                <p className="text-sm text-gm-cream/30 text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Best Days */}
        <Card>
          <CardHeader><CardTitle>Best Days to Post</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.byDayOfWeek.map((d: any, i: number) => {
                const maxLikes = Math.max(...data.byDayOfWeek.map((x: any) => Number(x.avg_likes)))
                const pct = maxLikes > 0 ? (Number(d.avg_likes) / maxLikes) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gm-cream/60 w-10">{DAY_NAMES[Number(d.dow)]}</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gm-sage/30 rounded-full flex items-center px-2"
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-xs text-gm-cream/60">{Math.round(Number(d.avg_likes))} avg likes</span>
                      </div>
                    </div>
                    <span className="text-xs text-gm-cream/30">{Number(d.posts)} posts</span>
                  </div>
                )
              })}
              {data.byDayOfWeek.length === 0 && (
                <p className="text-sm text-gm-cream/30 text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trend */}
        <Card>
          <CardHeader><CardTitle>Recent Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {data.recentTrend.map((d: any, i: number) => {
                const maxLikes = Math.max(...data.recentTrend.map((x: any) => Number(x.likes)), 1)
                const pct = (Number(d.likes) / maxLikes) * 100
                const dateStr = d.date ? new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gm-cream/30 w-14">{dateStr}</span>
                    <div className="flex-1 h-4 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500/30 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gm-cream/40 w-8 text-right">{Number(d.likes)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Performance Insight */}
        <Card>
          <CardHeader>
            <CardTitle>AI Performance Analysis</CardTitle>
            {data.insight?.updatedAt && (
              <Badge variant="default" size="sm">
                Updated {new Date(data.insight.updatedAt).toLocaleDateString()}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {data.insight?.value ? (
              <pre className="text-sm text-gm-cream/60 whitespace-pre-wrap font-sans leading-relaxed">
                {data.insight.value}
              </pre>
            ) : (
              <p className="text-sm text-gm-cream/30">Performance analysis will be generated tonight at 22h by the Performance Learner agent.</p>
            )}
          </CardContent>
        </Card>

        {/* By Platform */}
        {data.snapshots.length > 0 && (
          <Card className="col-span-2">
            <CardHeader><CardTitle>Performance by Platform & Market</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 text-gm-cream/40 font-medium">Platform</th>
                      <th className="text-left py-2 text-gm-cream/40 font-medium">Market</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Posts</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Reach</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Likes</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Saves</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Shares</th>
                      <th className="text-right py-2 text-gm-cream/40 font-medium">Avg Eng.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.snapshots.map((s: any, i: number) => {
                      const posts = Number(s.posts)
                      const avgEng = posts > 0 ? ((Number(s.total_likes) + Number(s.total_comments) * 3 + Number(s.total_saves) * 2) / posts).toFixed(1) : '0'
                      return (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="py-2"><SocialIcon platform={s.platform} size="sm" withLabel /></td>
                          <td className="py-2 text-gm-cream/60 uppercase">{s.market}</td>
                          <td className="py-2 text-right text-gm-cream/60">{posts}</td>
                          <td className="py-2 text-right text-sky-400">{Number(s.total_reach).toLocaleString()}</td>
                          <td className="py-2 text-right text-pink-400">{Number(s.total_likes).toLocaleString()}</td>
                          <td className="py-2 text-right text-emerald-400">{Number(s.total_saves)}</td>
                          <td className="py-2 text-right text-purple-400">{Number(s.total_shares)}</td>
                          <td className="py-2 text-right text-amber-400 font-semibold">{avgEng}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
