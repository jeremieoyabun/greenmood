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

// Account config for visual distinction
const ACCOUNT_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  'hq--instagram': { label: 'IG HQ', bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-l-pink-400', dot: 'bg-pink-400' },
  'us--instagram': { label: 'IG US', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-l-blue-400', dot: 'bg-blue-400' },
  'ae--instagram': { label: 'IG UAE', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-l-amber-400', dot: 'bg-amber-400' },
  'hq--linkedin': { label: 'LinkedIn', bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-l-sky-400', dot: 'bg-sky-400' },
  'fr--linkedin': { label: 'LI FR', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-l-indigo-400', dot: 'bg-indigo-400' },
  'hq--stories': { label: 'Stories', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-l-purple-400', dot: 'bg-purple-400' },
  'ae--stories': { label: 'Stories UAE', bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-l-orange-400', dot: 'bg-orange-400' },
  'hq--facebook': { label: 'Facebook', bg: 'bg-blue-600/15', text: 'text-blue-200', border: 'border-l-blue-500', dot: 'bg-blue-500' },
}

function getAccountStyle(market: string, platform: string) {
  return ACCOUNT_STYLES[`${market}--${platform}`] || {
    label: `${MARKETS[market]?.emoji || ''} ${platform}`,
    bg: 'bg-white/[0.05]', text: 'text-gm-cream/50', border: 'border-l-gray-400', dot: 'bg-gray-400',
  }
}

function getPostTypeIcon(notes: string | null): string {
  if (!notes) return ''
  try {
    const meta = JSON.parse(notes)
    const type = meta?.type
    if (type === 'carousel') return '◫'
    if (type === 'reel') return '▶'
    if (type === 'story') return '○'
    return '■'
  } catch { return '' }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewMode>('month')
  const [slots, setSlots] = useState<CalendarSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [newSlot, setNewSlot] = useState({ market: 'hq', platform: 'linkedin', time: '09:00', notes: '' })
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterMarket, setFilterMarket] = useState<string>('all')

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

  const addSlot = async () => {
    if (!selectedDate) return
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, ...newSlot }),
      })
      setShowAddModal(false)
      setNewSlot({ market: 'hq', platform: 'linkedin', time: '09:00', notes: '' })
      fetchSlots()
    } catch { /* ignore */ }
  }

  const openAddModal = (date?: Date) => {
    setSelectedDate(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setShowAddModal(true)
  }

  // Drag & drop state
  const [dragSlotId, setDragSlotId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const handleDrop = async (targetDate: string) => {
    if (!dragSlotId) return
    setDragOverDate(null)
    setDragSlotId(null)
    const slot = slots.find(s => s.id === dragSlotId)
    if (!slot || slot.date.startsWith(targetDate)) return

    // Optimistic update
    setSlots(prev => prev.map(s =>
      s.id === dragSlotId ? { ...s, date: targetDate + 'T00:00:00.000Z' } : s
    ))

    // Update calendar slot date
    try {
      const res = await fetch(`/api/posts/${slot.post?.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, time: slot.time || '12:00' }),
      })
      if (!(await res.json()).success) fetchSlots() // revert on failure
    } catch { fetchSlots() }
  }

  // Slot chip component for reuse
  const SlotChip = ({ slot, compact = false }: { slot: CalendarSlot; compact?: boolean }) => {
    const style = getAccountStyle(slot.market, slot.platform)
    const variant = slot.post?.variants?.[0]
    const typeIcon = variant ? getPostTypeIcon(variant.notes) : ''
    const previewText = variant?.text?.split('\n')[0]?.substring(0, 40) || ''

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
        className={`w-full text-left rounded-md border-l-[3px] ${style.border} ${style.bg} px-2 py-1 hover:brightness-125 transition-all group ${dragSlotId === slot.id ? 'opacity-40' : ''} cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-semibold ${style.text} whitespace-nowrap`}>{style.label}</span>
          {typeIcon && <span className="text-[8px] text-gm-cream/30">{typeIcon}</span>}
          {slot.time && <span className="text-[8px] text-gm-cream/20 ml-auto">{slot.time}</span>}
        </div>
        {!compact && previewText && (
          <p className="text-[8px] text-gm-cream/30 truncate mt-0.5 group-hover:text-gm-cream/50">{previewText}</p>
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
            <Button size="sm" onClick={() => openAddModal()}>Add Slot</Button>
          </div>
        }
      />

      {/* Filters + Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="px-2 py-1 text-xs bg-white/[0.05] border border-white/[0.08] rounded-md text-gm-cream focus:outline-none"
          >
            <option value="all" className="bg-gm-dark">All Markets</option>
            {Object.entries(MARKETS).map(([id, m]) => (
              <option key={id} value={id} className="bg-gm-dark">{m.emoji} {m.name}</option>
            ))}
          </select>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-2 py-1 text-xs bg-white/[0.05] border border-white/[0.08] rounded-md text-gm-cream focus:outline-none"
          >
            <option value="all" className="bg-gm-dark">All Platforms</option>
            <option value="instagram" className="bg-gm-dark">Instagram</option>
            <option value="linkedin" className="bg-gm-dark">LinkedIn</option>
            <option value="stories" className="bg-gm-dark">Stories</option>
            <option value="facebook" className="bg-gm-dark">Facebook</option>
          </select>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'IG HQ', dot: 'bg-pink-400' },
            { label: 'IG US', dot: 'bg-blue-400' },
            { label: 'IG UAE', dot: 'bg-amber-400' },
            { label: 'LinkedIn', dot: 'bg-sky-400' },
            { label: 'Stories', dot: 'bg-purple-400' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${l.dot}`} />
              <span className="text-[9px] text-gm-cream/30">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-2 text-[9px] text-gm-cream/20">
            <span>◫ carousel</span><span>▶ reel</span><span>○ story</span><span>■ post</span>
          </div>
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="grid grid-cols-7 bg-white/[0.03]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-2 text-[10px] font-semibold text-gm-cream/40 uppercase tracking-wider text-center border-b border-white/[0.06]">{d}</div>
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
                      <span className="text-[8px] text-gm-cream/20">{daySlots.length}</span>
                    )}
                  </div>
                  <div className="space-y-[3px]">
                    {daySlots.slice(0, 4).map(slot => (
                      <SlotChip key={slot.id} slot={slot} compact={daySlots.length > 3} />
                    ))}
                    {daySlots.length > 4 && (
                      <span className="text-[8px] text-gm-cream/20 pl-1">+{daySlots.length - 4} more</span>
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
                    <p className="text-[10px] text-gm-cream/40 uppercase">{format(day, 'EEE')}</p>
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
                      className="w-full py-2 text-[10px] text-gm-cream/10 hover:text-gm-cream/25 hover:bg-white/[0.02] rounded transition-colors"
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
                      <p className="text-[10px] text-gm-cream/30">{format(new Date(slot.date), 'EEE')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                        {slot.time && <span className="text-[10px] text-gm-cream/30">{slot.time}</span>}
                        {slot.notes && <Badge variant="default" size="sm">{slot.notes}</Badge>}
                      </div>
                      {previewText && <p className="text-xs text-gm-cream/50 truncate">{previewText}</p>}
                      {slot.campaign && <p className="text-[10px] text-gm-sage/40 mt-0.5">{slot.campaign.title}</p>}
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
      />

      {/* Add Slot Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Calendar Slot" size="sm">
        <div className="space-y-4">
          <Input label="Date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <Input label="Time" type="time" value={newSlot.time} onChange={(e) => setNewSlot(p => ({ ...p, time: e.target.value }))} />
          <Select label="Market" value={newSlot.market} onChange={(e) => setNewSlot(p => ({ ...p, market: e.target.value }))} options={Object.entries(MARKETS).map(([id, m]) => ({ value: id, label: `${m.emoji} ${m.name}` }))} />
          <Select label="Platform" value={newSlot.platform} onChange={(e) => setNewSlot(p => ({ ...p, platform: e.target.value }))} options={Object.entries(PLATFORMS).map(([id, p]) => ({ value: id, label: p.name }))} />
          <Input label="Notes" placeholder="Optional notes..." value={newSlot.notes} onChange={(e) => setNewSlot(p => ({ ...p, notes: e.target.value }))} />
          <Button onClick={addSlot} className="w-full">Add to Calendar</Button>
        </div>
      </Modal>
    </>
  )
}
