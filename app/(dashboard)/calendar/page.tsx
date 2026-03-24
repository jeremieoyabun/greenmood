'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, addMonths, subMonths,
  isToday, isSameMonth, addWeeks, subWeeks,
} from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PostDetailModal } from '@/components/calendar/PostDetailModal'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { MARKETS, PLATFORMS } from '@/lib/constants'

interface CalendarSlot {
  id: string
  date: string
  time: string | null
  market: string
  platform: string
  status: string
  notes: string | null
  campaign: { title: string; contentType: string } | null
  post: {
    id: string
    status: string
    variants: { id: string; text: string; hashtags: string | null; firstComment: string | null; notes: string | null; timing: string | null; imageUrl: string | null }[]
  } | null
}

type ViewMode = 'month' | 'week' | 'agenda'

const ACCOUNT_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  // Instagram — all markets
  'hq--instagram': { label: 'IG BE', bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-l-pink-400', dot: 'bg-pink-400' },
  'us--instagram': { label: 'IG US', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-l-blue-400', dot: 'bg-blue-400' },
  'uk--instagram': { label: 'IG UK', bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-l-red-400', dot: 'bg-red-400' },
  'ae--instagram': { label: 'IG UAE', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-l-amber-400', dot: 'bg-amber-400' },
  'fr--instagram': { label: 'IG FR', bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-l-violet-400', dot: 'bg-violet-400' },
  'pl--instagram': { label: 'IG PL', bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-l-rose-400', dot: 'bg-rose-400' },
  'kr--instagram': { label: 'IG KR', bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-l-cyan-400', dot: 'bg-cyan-400' },
  // LinkedIn — all markets (sky blue = LinkedIn brand)
  'hq--linkedin': { label: 'LI BE', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'us--linkedin': { label: 'LI US', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'uk--linkedin': { label: 'LI UK', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'fr--linkedin': { label: 'LI FR', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'ae--linkedin': { label: 'LI UAE', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'pl--linkedin': { label: 'LI PL', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  // Stories
  'hq--stories': { label: 'Stories BE', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-l-purple-400', dot: 'bg-purple-400' },
  'us--stories': { label: 'Stories US', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-l-purple-400', dot: 'bg-purple-400' },
  'ae--stories': { label: 'Stories UAE', bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-l-orange-400', dot: 'bg-orange-400' },
  // Facebook
  'hq--facebook': { label: 'FB BE', bg: 'bg-blue-600/15', text: 'text-blue-200', border: 'border-l-blue-500', dot: 'bg-blue-500' },
  // TikTok
  'ae--tiktok': { label: 'TT UAE', bg: 'bg-white/[0.1]', text: 'text-white/80', border: 'border-l-white', dot: 'bg-white' },
}

function getAccountStyle(market: string, platform: string) {
  return ACCOUNT_STYLES[`${market}--${platform}`] || {
    label: `${MARKETS[market]?.emoji || ''} ${platform}`,
    bg: 'bg-white/[0.05]', text: 'text-gm-cream/50', border: 'border-l-gray-400', dot: 'bg-gray-400',
  }
}


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewMode>('month')
  const [slots, setSlots] = useState<CalendarSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [newSlot, setNewSlot] = useState({ market: 'hq', platform: 'instagram', time: '12:00', notes: '' })
  const [multiMarkets, setMultiMarkets] = useState<string[]>([])
  const [multiPlatforms, setMultiPlatforms] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterMarket, setFilterMarket] = useState<string>('all')

  // New post form
  const [newText, setNewText] = useState('')
  const [newHashtags, setNewHashtags] = useState('')
  const [newFirstComment, setNewFirstComment] = useState('')
  const [newImage, setNewImage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [genHash, setGenHash] = useState(false)
  // Story slides
  const [storySlides, setStorySlides] = useState<Array<{ text: string; media: string | null }>>([
    { text: '', media: null },
  ])
  const isStoryMode = multiPlatforms.length === 1 && multiPlatforms[0] === 'stories' || (multiPlatforms.length === 0 && newSlot.platform === 'stories')
  const [genStory, setGenStory] = useState(false)

  const generateStoryTexts = async () => {
    setGenStory(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: 'Generate 3-5 Instagram Story slides for Greenmood. Each slide needs a short punchy text overlay (max 8 words per slide). The story should tell a micro-narrative: hook → detail → proof → CTA. Use real Greenmood product facts from KB. No em-dashes.',
          contentType: 'stories',
          markets: [newSlot.market],
          platforms: ['stories'],
        }),
      })
      const data = await res.json()
      if (data.success && data.data?.posts) {
        const post = Object.values(data.data.posts)[0] as any
        if (post?.stories_slides || post?.storiesSlides) {
          const slides = post.stories_slides || post.storiesSlides || []
          setStorySlides(slides.map((s: any) => ({
            text: s.text || s.overlay_text || '',
            media: null,
          })))
        } else if (post?.text) {
          // Split by --- or newlines into slides
          const lines = post.text.split(/---|\n\n/).filter((l: string) => l.trim())
          setStorySlides(lines.map((l: string) => ({ text: l.trim(), media: null })))
        }
      }
    } catch { /* */ }
    setGenStory(false)
  }

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const start = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`)
      const data = await res.json()
      if (data.success) setSlots(data.data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate)
    const me = endOfMonth(currentDate)
    return eachDayOfInterval({ start: startOfWeek(ms, { weekStartsOn: 1 }), end: endOfWeek(me, { weekStartsOn: 1 }) })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: ws, end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
  }, [currentDate])

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return slots
      .filter(s => s.date.startsWith(dateStr))
      .filter(s => filterPlatform === 'all' || s.platform === filterPlatform)
      .filter(s => filterMarket === 'all' || s.market === filterMarket)
  }

  const filteredSlots = useMemo(() =>
    slots
      .filter(s => filterPlatform === 'all' || s.platform === filterPlatform)
      .filter(s => filterMarket === 'all' || s.market === filterMarket)
  , [slots, filterPlatform, filterMarket])

  const navigate = (dir: number) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    else setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
  }

  const resetForm = () => {
    setNewText('')
    setNewHashtags('')
    setNewFirstComment('')
    setNewImage(null)
    setNewSlot({ market: 'hq', platform: 'instagram', time: '12:00', notes: '' })
    setStorySlides([{ text: '', media: null }])
    setMultiMarkets([])
    setMultiPlatforms([])
  }

  const openAddModal = (date?: Date) => {
    setSelectedDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    resetForm()
    setShowAddModal(true)
  }

  // Create post with text, image, hashtags — supports multi-market/platform
  const createPost = async () => {
    if (!selectedDate || !newText.trim()) return
    setCreating(true)

    // Build list of market+platform combos
    const markets = multiMarkets.length > 0 ? multiMarkets : [newSlot.market]
    const platforms = multiPlatforms.length > 0 ? multiPlatforms : [newSlot.platform]
    const combos = markets.flatMap(m => platforms.map(p => ({ market: m, platform: p })))

    try {
      let successCount = 0
      for (const combo of combos) {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            time: newSlot.time,
            market: combo.market,
            platform: combo.platform,
            text: newText,
            hashtags: newHashtags || null,
            firstComment: newFirstComment || null,
            imageUrl: newImage || null,
            notes: newSlot.notes || null,
          }),
        })
        const data = await res.json()
        if (data.success) successCount++
      }
      if (successCount > 0) {
        setShowAddModal(false)
        resetForm()
        fetchSlots()
      } else {
        alert('Failed to create posts')
      }
    } catch { alert('Failed to create post') }
    setCreating(false)
  }

  // Delete a post
  const deleteSlot = async (slotId: string, postId?: string) => {
    if (!confirm('Delete this post?')) return
    try {
      await fetch(`/api/calendar/${slotId}`, { method: 'DELETE' })
      if (postId) await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      setSelectedSlot(null)
      fetchSlots()
    } catch { alert('Delete failed') }
  }

  // Auto-generate hashtags from caption text
  const generateHashtags = async () => {
    if (!newText.trim()) return
    setGenHash(true)
    try {
      const res = await fetch('/api/generate/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText, platform: newSlot.platform }),
      })
      const data = await res.json()
      if (data.success) setNewHashtags(data.data.hashtags)
    } catch { /* ignore */ }
    setGenHash(false)
  }

  // Drag & drop
  const [dragSlotId, setDragSlotId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const handleDrop = async (targetDate: string) => {
    if (!dragSlotId) return
    setDragOverDate(null)
    setDragSlotId(null)
    const slot = slots.find(s => s.id === dragSlotId)
    if (!slot || slot.date.startsWith(targetDate)) return

    setSlots(prev => prev.map(s =>
      s.id === dragSlotId ? { ...s, date: targetDate + 'T00:00:00.000Z' } : s
    ))

    try {
      const res = await fetch(`/api/posts/${slot.post?.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, time: slot.time || '12:00' }),
      })
      if (!(await res.json()).success) fetchSlots()
    } catch { fetchSlots() }
  }

  // Group slots with identical content (same campaign or same text) across markets
  const groupSlots = (daySlots: CalendarSlot[]) => {
    const groups: { key: string; slots: CalendarSlot[] }[] = []
    const used = new Set<string>()

    for (const slot of daySlots) {
      if (used.has(slot.id)) continue
      const text = slot.post?.variants?.[0]?.text || ''
      const campaignId = slot.campaign?.title || ''
      // Group by same campaign title + same platform + same time, or same text content
      const siblings = text ? daySlots.filter(s =>
        !used.has(s.id) &&
        s.platform === slot.platform &&
        s.time === slot.time &&
        s.id !== slot.id &&
        s.post?.variants?.[0]?.text === text
      ) : []

      if (siblings.length > 0) {
        const group = [slot, ...siblings]
        group.forEach(s => used.add(s.id))
        groups.push({ key: slot.id, slots: group })
      } else {
        used.add(slot.id)
        groups.push({ key: slot.id, slots: [slot] })
      }
    }
    return groups
  }

  const GroupedChip = ({ slots, compact = false }: { slots: CalendarSlot[]; compact?: boolean }) => {
    if (slots.length === 1) return <SlotChip slot={slots[0]} compact={compact} />
    const first = slots[0]
    const style = getAccountStyle(first.market, first.platform)
    const postStatus = first.post?.status || ''
    const isScheduled = postStatus === 'SCHEDULED' || postStatus === 'READY_TO_SCHEDULE'
    const isPublished = postStatus === 'PUBLISHED'
    const previewText = first.post?.variants?.[0]?.text?.split('\n')[0]?.substring(0, 40) || ''

    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSelectedSlot(first) }}
        className={`w-full text-left rounded-xl border-l-4 px-2.5 py-2 transition-all group cursor-pointer ${
          isPublished
            ? 'border-l-emerald-500/40 bg-emerald-900/20 opacity-45 hover:opacity-65'
            : isScheduled
            ? 'border-l-green-400 bg-green-500/20 ring-2 ring-green-400/30 shadow-md shadow-green-500/10'
            : `${style.border} ${style.bg} hover:brightness-125`
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <SocialIcon platform={first.platform} size="sm" />
          {slots.map(s => <FlagIcon key={s.id} market={s.market} size="sm" />)}
          <span className="text-[10px] text-gm-sage/60 font-semibold ml-auto">{slots.length} markets</span>
          {first.time && <span className="text-xs text-gm-cream/30 font-medium">{first.time}</span>}
        </div>
        {!compact && previewText && (
          <p className="text-xs truncate mt-1 text-gm-cream/40 group-hover:text-gm-cream/60">{previewText}</p>
        )}
      </button>
    )
  }

  const SlotChip = ({ slot, compact = false }: { slot: CalendarSlot; compact?: boolean }) => {
    const style = getAccountStyle(slot.market, slot.platform)
    const variant = slot.post?.variants?.[0]
    const previewText = variant?.text?.split('\n')[0]?.substring(0, 40) || ''
    const hasImage = !!variant?.imageUrl
    const postStatus = slot.post?.status || ''
    const isScheduled = postStatus === 'SCHEDULED' || postStatus === 'READY_TO_SCHEDULE'
    const isPublished = postStatus === 'PUBLISHED'
    const isDraft = postStatus === 'DRAFT' || postStatus === 'AI_GENERATED'

    return (
      <button
        draggable
        onDragStart={(e) => {
          setDragSlotId(slot.id)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', slot.id)
        }}
        onDragEnd={() => { setDragSlotId(null); setDragOverDate(null) }}
        onClick={(e) => { e.stopPropagation(); setSelectedSlot(slot) }}
        className={`w-full text-left rounded-xl border-l-4 px-2.5 py-2 transition-all group cursor-grab active:cursor-grabbing ${dragSlotId === slot.id ? 'opacity-40' : ''} ${
          isPublished
            ? 'border-l-emerald-500/40 bg-emerald-900/20 opacity-45 hover:opacity-65'
            : isScheduled
            ? 'border-l-green-400 bg-green-500/20 ring-2 ring-green-400/30 shadow-md shadow-green-500/10'
            : `${style.border} ${style.bg} hover:brightness-125`
        }`}
      >
        {isPublished && (
          <div className="flex items-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            <span className="text-[11px] font-bold text-emerald-400/70 uppercase tracking-wider">Published</span>
          </div>
        )}
        {isScheduled && (
          <div className="flex items-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-bold text-green-300 uppercase tracking-wider">Scheduled</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FlagIcon market={slot.market} size="sm" />
          <SocialIcon platform={slot.platform} size="sm" />
          {hasImage && <span className="text-xs text-gm-cream/30">🖼</span>}
          {slot.time && <span className="text-xs text-gm-cream/30 ml-auto font-medium">{slot.time}</span>}
        </div>
        {!compact && previewText && (
          <p className={`text-xs truncate mt-1 ${isPublished ? 'text-gm-cream/15 line-through' : 'text-gm-cream/40 group-hover:text-gm-cream/60'}`}>{previewText}</p>
        )}
      </button>
    )
  }

  return (
    <>
      <PageHeader
        title="Editorial Calendar"
        description={format(currentDate, view === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              tabs={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }, { id: 'agenda', label: 'Agenda' }]}
              activeTab={view}
              onChange={(v) => setView(v as ViewMode)}
            />
            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>←</Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)}>→</Button>
            </div>
            <Button size="sm" onClick={() => openAddModal()}>+ New Post</Button>
          </div>
        }
      />

      {/* Filters + Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-white/20 rounded-lg text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gm-sage/60"
          >
            <option value="all" className="bg-white text-gray-900">All Markets</option>
            {Object.entries(MARKETS).map(([id, m]) => (
              <option key={id} value={id} className="bg-white text-gray-900">{m.emoji} {m.name}</option>
            ))}
          </select>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-white/20 rounded-lg text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gm-sage/60"
          >
            <option value="all" className="bg-white text-gray-900">All Platforms</option>
            <option value="instagram" className="bg-white text-gray-900">Instagram</option>
            <option value="linkedin" className="bg-white text-gray-900">LinkedIn</option>
            <option value="stories" className="bg-white text-gray-900">Stories</option>
            <option value="facebook" className="bg-white text-gray-900">Facebook</option>
          </select>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { market: 'hq', platform: 'instagram' },
            { market: 'us', platform: 'instagram' },
            { market: 'ae', platform: 'instagram' },
            { market: '', platform: 'linkedin' },
            { market: '', platform: 'stories' },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1">
              {l.market && <FlagIcon market={l.market} size="sm" withLabel />}
              <SocialIcon platform={l.platform} size="sm" withLabel />
            </div>
          ))}
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="grid grid-cols-7 bg-white/[0.03]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-2 text-xs font-semibold text-gm-cream/40 uppercase tracking-wider text-center border-b border-white/[0.06]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const daySlots = getSlotsForDate(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              const dayStr = format(day, 'yyyy-MM-dd')
              const isDropTarget = dragOverDate === dayStr

              return (
                <div
                  key={i}
                  className={`min-h-[110px] border-b border-r border-white/[0.04] p-1 cursor-pointer transition-colors hover:bg-white/[0.02] ${!inMonth ? 'opacity-25' : ''} ${isDropTarget ? 'bg-gm-sage/10 ring-1 ring-inset ring-gm-sage/30' : ''}`}
                  onClick={() => openAddModal(day)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDate(dayStr) }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(dayStr) }}
                >
                  <div className="flex items-center justify-between mb-1 px-0.5">
                    <span className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-gm-sage text-gm-dark' : 'text-gm-cream/50'}`}>
                      {format(day, 'd')}
                    </span>
                    {daySlots.length > 0 && (
                      <span className="text-[11px] text-gm-cream/20">{daySlots.length}</span>
                    )}
                  </div>
                  <div className="space-y-[3px]">
                    {groupSlots(daySlots).slice(0, 4).map(group => (
                      <GroupedChip key={group.key} slots={group.slots} compact={daySlots.length > 3} />
                    ))}
                    {groupSlots(daySlots).length > 4 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentDate(day); setView('week' as ViewMode) }}
                        className="text-xs text-gm-sage/50 hover:text-gm-sage pl-1 transition-colors"
                      >
                        +{groupSlots(daySlots).length - 4} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map((day, i) => {
              const daySlots = getSlotsForDate(day)
              const today = isToday(day)
              const dayStr = format(day, 'yyyy-MM-dd')
              const isDropTarget = dragOverDate === dayStr

              return (
                <div key={i} className="border-r border-white/[0.04] last:border-r-0">
                  <div className={`px-3 py-2 border-b border-white/[0.06] text-center ${today ? 'bg-gm-sage/10' : 'bg-white/[0.02]'}`}>
                    <p className="text-xs text-gm-cream/40 uppercase">{format(day, 'EEE')}</p>
                    <p className={`text-lg font-semibold ${today ? 'text-gm-sage' : 'text-gm-cream/60'}`}>{format(day, 'd')}</p>
                  </div>
                  <div
                    className={`min-h-[400px] p-1.5 space-y-1 ${isDropTarget ? 'bg-gm-sage/10' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDate(dayStr) }}
                    onDragLeave={() => setDragOverDate(null)}
                    onDrop={(e) => { e.preventDefault(); handleDrop(dayStr) }}
                  >
                    {daySlots.map(slot => <SlotChip key={slot.id} slot={slot} />)}
                    <button
                      onClick={() => openAddModal(day)}
                      className="w-full py-2 text-xs text-gm-cream/10 hover:text-gm-cream/25 hover:bg-white/[0.02] rounded transition-colors"
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {view === 'agenda' && (
        <div className="space-y-2 max-w-3xl">
          {loading ? (
            <Card><p className="text-xs text-gm-cream/40 text-center py-8">Loading...</p></Card>
          ) : filteredSlots.length === 0 ? (
            <Card><p className="text-xs text-gm-cream/40 text-center py-8">No slots for {format(currentDate, 'MMMM yyyy')}</p></Card>
          ) : (
            filteredSlots.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).map(slot => {
              const style = getAccountStyle(slot.market, slot.platform)
              const variant = slot.post?.variants?.[0]
              const previewText = variant?.text?.split('\n')[0]?.substring(0, 80) || ''

              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full text-left rounded-xl p-4 border-l-[4px] ${style.border} bg-white/[0.035] border border-white/[0.08] hover:bg-white/[0.05] transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[45px]">
                      <p className="text-lg font-semibold text-gm-cream">{format(new Date(slot.date), 'd')}</p>
                      <p className="text-xs text-gm-cream/30">{format(new Date(slot.date), 'EEE')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                        {slot.time && <span className="text-xs text-gm-cream/30">{slot.time}</span>}
                        {slot.notes && <Badge variant="default" size="sm">{slot.notes}</Badge>}
                      </div>
                      {previewText && <p className="text-sm text-gm-cream/50 truncate">{previewText}</p>}
                      {slot.campaign && <p className="text-xs text-gm-sage/40 mt-0.5">{slot.campaign.title}</p>}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        slot={selectedSlot}
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onUpdate={() => fetchSlots()}
        onDelete={() => {
          if (selectedSlot) deleteSlot(selectedSlot.id, selectedSlot.post?.id)
        }}
      />

      {/* Create Post Modal — Full-width, spacious */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); resetForm() }} title={isStoryMode ? 'Create Story' : 'Create New Post'} size="xl">
        {/* Schedule Settings — always visible at top */}
        <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <Input label="Time" type="time" value={newSlot.time} onChange={(e) => setNewSlot(p => ({ ...p, time: e.target.value }))} />
          </div>

          {/* Multi-market selection */}
          <div>
            <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide mb-2">Markets</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MARKETS).map(([id, m]) => {
                const selected = multiMarkets.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMultiMarkets(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selected
                        ? 'bg-gm-sage/20 text-gm-sage border-gm-sage/30'
                        : 'bg-white/[0.03] text-gm-cream/50 border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    {m.emoji} {m.name}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setMultiMarkets(prev => prev.length === Object.keys(MARKETS).length ? [] : Object.keys(MARKETS))}
                className="text-xs text-gm-sage/50 hover:text-gm-sage ml-1"
              >
                {multiMarkets.length === Object.keys(MARKETS).length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Multi-platform selection */}
          <div>
            <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORMS).map(([id, p]) => {
                const selected = multiPlatforms.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMultiPlatforms(prev => selected ? prev.filter(x => x !== id) : [...prev, id])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selected
                        ? 'bg-gm-sage/20 text-gm-sage border-gm-sage/30'
                        : 'bg-white/[0.03] text-gm-cream/50 border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>

          {(multiMarkets.length > 0 || multiPlatforms.length > 0) && (
            <p className="text-xs text-gm-sage/60">
              Will create {Math.max(multiMarkets.length, 1) * Math.max(multiPlatforms.length, 1)} post{(Math.max(multiMarkets.length, 1) * Math.max(multiPlatforms.length, 1)) > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {isStoryMode ? (
          /* ─── STORY MODE: Slide-by-slide editor ─── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gm-cream/70">Story Slides ({storySlides.length})</label>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" loading={genStory} onClick={generateStoryTexts}>
                  {genStory ? 'Generating...' : '✨ AI Propose Texts'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStorySlides(prev => [...prev, { text: '', media: null }])}>
                  + Add Slide
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {storySlides.map((slide, i) => (
                <div key={i} className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
                  {/* Slide header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs font-semibold text-gm-cream/50">Slide {i + 1}</span>
                    {storySlides.length > 1 && (
                      <button onClick={() => setStorySlides(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-400/50 hover:text-red-400">Remove</button>
                    )}
                  </div>

                  {/* Media upload */}
                  <div className="p-3">
                    <input type="file" accept="image/*,video/*" id={`story-slide-${i}`} className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        const r = new FileReader()
                        r.onload = (ev) => setStorySlides(prev => prev.map((s, idx) => idx === i ? { ...s, media: ev.target?.result as string } : s))
                        r.readAsDataURL(f)
                      }
                    }} />
                    {slide.media ? (
                      <div className="relative rounded-lg overflow-hidden cursor-pointer group aspect-[9/16] bg-black/20 mb-3"
                        onClick={() => document.getElementById(`story-slide-${i}`)?.click()}>
                        {slide.media.includes('video') ? (
                          <video src={slide.media} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={slide.media} alt="" className="w-full h-full object-cover" />
                        )}
                        {/* Text overlay preview */}
                        {slide.text && (
                          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                            <p className="text-white text-center text-sm font-bold drop-shadow-lg bg-black/30 rounded-lg px-3 py-2">{slide.text}</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-xs text-white">Change</span>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => document.getElementById(`story-slide-${i}`)?.click()}
                        className="w-full aspect-[9/16] rounded-lg border-2 border-dashed border-white/[0.08] hover:border-gm-sage/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-all mb-3">
                        <span className="text-2xl opacity-15">+</span>
                        <span className="text-xs text-gm-cream/25">Image / Video</span>
                      </button>
                    )}

                    {/* Text to overlay on this slide */}
                    <textarea
                      value={slide.text}
                      onChange={(e) => setStorySlides(prev => prev.map((s, idx) => idx === i ? { ...s, text: e.target.value } : s))}
                      placeholder="Text for this slide..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-gm-cream placeholder:text-gm-cream/15 focus:outline-none focus:ring-1 focus:ring-gm-sage/30 resize-none"
                    />
                  </div>
                </div>
              ))}

              {/* Add slide button */}
              <button onClick={() => setStorySlides(prev => [...prev, { text: '', media: null }])}
                className="rounded-xl border-2 border-dashed border-white/[0.06] hover:border-gm-sage/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-all min-h-[200px]">
                <span className="text-3xl opacity-10">+</span>
                <span className="text-xs text-gm-cream/20">Add slide</span>
              </button>
            </div>

            <Button onClick={createPost} disabled={creating || storySlides.every(s => !s.media && !s.text)} size="lg" className="w-full mt-4">
              {creating ? 'Creating...' : `Create Story (${storySlides.filter(s => s.media || s.text).length} slides)`}
            </Button>
          </div>
        ) : (
          /* ─── REGULAR POST MODE ─── */
          <div className="grid grid-cols-2 gap-8">
            {/* Left column — Media */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-gm-cream/70 block mb-3">Media</label>
                <input type="file" accept="image/*,video/*" id="new-post-img" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    const r = new FileReader()
                    r.onload = (ev) => setNewImage(ev.target?.result as string)
                    r.readAsDataURL(f)
                  }
                }} />
                {newImage ? (
                  <div className="relative rounded-xl overflow-hidden cursor-pointer group border border-white/[0.08]" onClick={() => document.getElementById('new-post-img')?.click()}>
                    {newImage.startsWith('data:video') ? (
                      <video src={newImage} className="w-full max-h-80 object-cover" controls muted />
                    ) : (
                      <img src={newImage} alt="" className="w-full max-h-80 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-sm text-white font-medium">Click to change</span>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => document.getElementById('new-post-img')?.click()} className="w-full rounded-xl border-2 border-dashed border-white/[0.1] hover:border-gm-sage/30 transition-all p-12 flex flex-col items-center gap-3 cursor-pointer hover:bg-white/[0.02]">
                    <span className="text-4xl opacity-20">+</span>
                    <span className="text-sm text-gm-cream/30">Click to add image or video</span>
                    <span className="text-xs text-gm-cream/15">JPG, PNG, MP4, MOV</span>
                    <span className="text-[10px] text-gm-sage/30 mt-1">{
                      {
                        instagram: '1080 × 1350 px (4:5) or 1080 × 1080 px (1:1)',
                        linkedin: '1200 × 627 px (1.91:1) or 1080 × 1080 px (1:1)',
                        stories: '1080 × 1920 px (9:16)',
                        facebook: '1080 × 1350 px (4:5) or 1080 × 1080 px (1:1)',
                        tiktok: '1080 × 1920 px (9:16)',
                      }[multiPlatforms[0] || newSlot.platform] || '1080 × 1080 px'
                    }</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right column — Content */}
            <div className="space-y-6">
              {/* Caption */}
              <div>
                <label className="text-sm font-semibold text-gm-cream/70 block mb-3">Caption</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Write your caption..."
                  rows={6}
                  className="w-full px-4 py-3 text-base bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30 focus:border-gm-sage/20 resize-none leading-relaxed"
                />
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gm-cream/70">Hashtags</label>
                  <button
                    onClick={generateHashtags}
                    disabled={genHash || !newText.trim()}
                    className="text-sm font-medium text-gm-sage hover:text-gm-sage/80 disabled:text-gm-cream/20 disabled:cursor-not-allowed transition-colors"
                  >
                    {genHash ? 'Generating...' : '✨ Auto-generate'}
                  </button>
                </div>
                <textarea
                  value={newHashtags}
                  onChange={(e) => setNewHashtags(e.target.value)}
                  placeholder="#biophilicdesign #greenmood ..."
                  rows={2}
                  className="w-full px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-sage/70 placeholder:text-gm-cream/15 focus:outline-none focus:ring-2 focus:ring-gm-sage/30 resize-none"
                />
              </div>

              {/* First Comment */}
              <div>
                <label className="text-sm font-semibold text-gm-cream/70 block mb-3">
                  First Comment
                  <span className="text-gm-cream/25 font-normal ml-2">{newSlot.platform === 'linkedin' ? 'Put the link here' : 'Optional'}</span>
                </label>
                <input
                  value={newFirstComment}
                  onChange={(e) => setNewFirstComment(e.target.value)}
                  placeholder="Link or additional context..."
                className="w-full px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/15 focus:outline-none focus:ring-2 focus:ring-gm-sage/30"
              />
            </div>

              {/* Submit */}
              <Button onClick={createPost} disabled={creating || !newText.trim()} size="lg" className="w-full">
                {creating ? 'Creating...' : (() => {
                  const count = Math.max(multiMarkets.length, 1) * Math.max(multiPlatforms.length, 1)
                  return count > 1 ? `Create ${count} Posts` : 'Create Post'
                })()}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
