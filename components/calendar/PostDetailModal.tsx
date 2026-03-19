'use client'

import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/StatusDot'
import { MARKETS } from '@/lib/constants'
import { useState, useRef, useEffect } from 'react'

interface PostDetail {
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

interface PostDetailModalProps {
  slot: PostDetail | null
  open: boolean
  onClose: () => void
  onUpdate?: () => void
  onDelete?: () => void
}

const DUPLICATE_TARGETS = [
  { market: 'hq', label: 'IG BE' },
  { market: 'us', label: 'IG US' },
  { market: 'ae', label: 'IG UAE' },
  { market: 'uk', label: 'IG UK' },
  { market: 'fr', label: 'IG FR' },
]

export function PostDetailModal({ slot, open, onClose, onUpdate, onDelete }: PostDetailModalProps) {
  const [copied, setCopied] = useState('')
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [editFirstComment, setEditFirstComment] = useState('')
  const [saving, setSaving] = useState(false)

  // Approval state
  const [approving, setApproving] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState<string | null>(null)

  // Reset local status when slot changes
  useEffect(() => {
    setLocalStatus(null)
  }, [slot?.post?.id])
  const [rejectComment, setRejectComment] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  // Schedule edit state
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Sync imageUrl from variant when slot changes
  useEffect(() => {
    const varImg = slot?.post?.variants?.[0]?.imageUrl || null
    setImageUrl(varImg)
  }, [slot?.id])

  const handleImageUpload = async (file: File) => {
    if (!slot?.post?.id) return
    setUploading(true)
    const variant = slot.post.variants?.[0]
    if (!variant) { setUploading(false); return }

    let url: string | null = null

    // Try Vercel Blob first
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('postId', slot.post.id)
      const res = await fetch('/api/assets/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) url = data.data.url
    } catch { /* Blob failed */ }

    // Fallback to data URL
    if (!url) {
      url = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
    }

    setImageUrl(url)
    await fetch(`/api/posts/${slot.post.id}/variant`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variant.id, imageUrl: url }),
    })
    onUpdate?.()
    setUploading(false)
  }

  const startEditingSchedule = () => {
    setScheduleDate(slot?.date?.split('T')[0] || new Date().toISOString().split('T')[0])
    setScheduleTime(slot?.time || '12:00')
    setEditingSchedule(true)
  }

  const saveSchedule = async () => {
    if (!slot?.post?.id) return
    setSavingSchedule(true)
    try {
      const res = await fetch(`/api/posts/${slot.post.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: scheduleDate, time: scheduleTime }),
      })
      const data = await res.json()
      if (data.success) {
        setEditingSchedule(false)
        onUpdate?.()
      } else {
        alert('Save failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Save failed')
    }
    setSavingSchedule(false)
  }

  const startEditing = () => {
    setEditText(variant?.text || '')
    setEditHashtags(variant?.hashtags || '')
    setEditFirstComment(variant?.firstComment || '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!slot?.post?.id || !variant?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/posts/${slot.post.id}/variant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          text: editText,
          hashtags: editHashtags,
          firstComment: editFirstComment,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditing(false)
        onUpdate?.()
      } else {
        alert('Save failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Save failed')
    }
    setSaving(false)
  }

  const handleApproval = async (action: string, comment?: string) => {
    if (!slot?.post?.id) return
    setApproving(action)
    try {
      const res = await fetch(`/api/posts/${slot.post.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: comment || undefined,
          reviewerId: 'user-jeremie',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowRejectInput(false)
        setRejectComment('')
        setLocalStatus(data.data?.post?.status || null)
        onUpdate?.()
      } else {
        alert('Action failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Action failed')
    }
    setApproving(null)
  }

  const analyzeImage = async (file: File) => {
    setAnalyzing(true)
    setImageAnalysis(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (slot?.post?.id) formData.append('postId', slot.post.id)
      const res = await fetch('/api/assets/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) setImageAnalysis(data.data)
      else setImageAnalysis({ status: 'error', summary: data.error })
    } catch {
      setImageAnalysis({ status: 'error', summary: 'Analysis failed' })
    }
    setAnalyzing(false)
  }

  if (!slot) return null

  const market = MARKETS[slot.market]
  const variant = slot.post?.variants?.[0]
  const postText = variant?.text || ''
  const hashtags = variant?.hashtags || ''
  const firstComment = variant?.firstComment || ''
  const postStatus = localStatus || slot.post?.status || slot.status

  let meta: any = {}
  try {
    if (variant?.notes) meta = JSON.parse(variant.notes)
  } catch { /* ignore */ }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const pillars: Record<string, { label: string; color: string }> = {
    R1: { label: 'REVEAL — Process', color: 'purple' },
    R2: { label: 'REFERENCE — Educate', color: 'info' },
    R3: { label: 'RESULTS — Proof', color: 'success' },
    R4: { label: 'RELATE — Human', color: 'warning' },
  }
  const pillar = pillars[meta.contentPillar]

  // Determine available actions based on status
  const getAvailableActions = () => {
    const actions: { action: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'outline'; nextStatus: string }[] = []
    switch (postStatus) {
      case 'AI_GENERATED':
        actions.push({ action: 'APPROVE', label: 'Mark as Fact-Checked', variant: 'primary', nextStatus: 'FACT_CHECKED' })
        actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger', nextStatus: 'REJECTED' })
        break
      case 'FACT_CHECKED':
        actions.push({ action: 'APPROVE', label: 'Brand Approve', variant: 'primary', nextStatus: 'BRAND_APPROVED' })
        actions.push({ action: 'REQUEST_CHANGES', label: 'Request Changes', variant: 'outline', nextStatus: 'REJECTED' })
        actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger', nextStatus: 'REJECTED' })
        break
      case 'BRAND_APPROVED':
        actions.push({ action: 'APPROVE', label: 'Ready to Schedule', variant: 'primary', nextStatus: 'READY_TO_SCHEDULE' })
        actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger', nextStatus: 'REJECTED' })
        break
      case 'READY_TO_SCHEDULE':
        actions.push({ action: 'APPROVE', label: 'Mark as Scheduled', variant: 'primary', nextStatus: 'SCHEDULED' })
        break
      case 'SCHEDULED':
        actions.push({ action: 'APPROVE', label: 'Mark as Published', variant: 'primary', nextStatus: 'PUBLISHED' })
        break
      case 'REJECTED':
        actions.push({ action: 'APPROVE', label: 'Move to Draft', variant: 'secondary', nextStatus: 'DRAFT' })
        break
    }
    return actions
  }

  const availableActions = getAvailableActions()

  return (
    <Modal open={open} onClose={() => { setEditing(false); setShowRejectInput(false); onClose() }} title="Post Detail" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg">{market?.emoji}</span>
          <span className="text-sm font-medium text-gm-cream">{market?.name}</span>
          <Badge variant="default">{slot.platform}</Badge>
          {meta.type && <Badge variant="info">{meta.type}</Badge>}
          {pillar && <Badge variant={pillar.color as any}>{pillar.label}</Badge>}
          <StatusDot status={postStatus} />
          <div className="flex items-center gap-3 ml-auto">
            {/* Duplicate to other market */}
            <div className="relative">
              <button
                onClick={() => setShowDuplicate(!showDuplicate)}
                className="text-[10px] text-gm-sage/60 hover:text-gm-sage transition-colors"
              >
                Duplicate to...
              </button>
              {showDuplicate && (
                <div className="absolute top-6 right-0 z-50 bg-gm-dark border border-white/[0.1] rounded-lg shadow-xl py-1 min-w-[140px]">
                  {DUPLICATE_TARGETS
                    .filter(t => t.market !== slot.market)
                    .map(t => (
                      <button
                        key={t.market}
                        disabled={duplicating === t.market}
                        onClick={async () => {
                          if (!slot.post?.id) return
                          setDuplicating(t.market)
                          try {
                            const res = await fetch(`/api/posts/${slot.post.id}/duplicate`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ targetMarket: t.market }),
                            })
                            const data = await res.json()
                            if (data.success) {
                              setShowDuplicate(false)
                              onUpdate?.()
                              alert(`Post duplicated to ${t.label}`)
                            } else {
                              alert('Failed: ' + data.error)
                            }
                          } catch { alert('Duplicate failed') }
                          setDuplicating(null)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gm-cream/70 hover:bg-white/[0.05] hover:text-gm-cream transition-colors disabled:opacity-40"
                      >
                        {duplicating === t.market ? 'Duplicating...' : t.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
            {onDelete && (
              <button onClick={onDelete} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
            )}
          </div>
          {editingSchedule ? (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-white/[0.05] text-xs text-gm-cream/90 rounded px-2 py-1 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-white/[0.05] text-xs text-gm-cream/90 rounded px-2 py-1 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none"
              />
              <Button variant="primary" size="sm" loading={savingSchedule} onClick={saveSchedule}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={startEditingSchedule}
              className="text-[10px] text-gm-cream/30 ml-auto hover:text-gm-sage/60 transition-colors cursor-pointer"
              title="Click to edit date/time"
            >
              {slot.date?.split('T')[0]} {slot.time || ''} ✎
            </button>
          )}
        </div>

        {/* Quick Approval Actions — always visible at top */}
        {!editing && availableActions.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xs text-gm-cream/40 mr-2">Status:</span>
            <Badge variant="info" size="sm">{postStatus?.replace(/_/g, ' ')}</Badge>
            <span className="text-gm-cream/20 mx-1">→</span>
            {availableActions.map(({ action, label, variant: btnVariant }) => (
              <Button
                key={action + '-top'}
                variant={btnVariant}
                size="sm"
                loading={approving === action}
                onClick={() => {
                  if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
                    setShowRejectInput(true)
                  } else {
                    handleApproval(action)
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        {slot.campaign && (
          <p className="text-[10px] text-gm-sage/50">Campaign: {slot.campaign.title}</p>
        )}

        {/* Post Image — upload or display */}
        <div className="relative">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
          />
          {(imageUrl || variant?.imageUrl) ? (
            <div
              className="rounded-lg overflow-hidden border border-white/[0.08] cursor-pointer group relative"
              onClick={() => imageInputRef.current?.click()}
            >
              <img
                src={imageUrl || variant?.imageUrl || ''}
                alt="Post image"
                className="w-full max-h-72 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white font-medium">Click to change image</span>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-xs text-white animate-pulse">Uploading...</span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-white/[0.1] hover:border-gm-sage/30 transition-colors p-6 flex flex-col items-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <span className="text-xs text-gm-cream/40 animate-pulse">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl opacity-30">+</span>
                  <span className="text-xs text-gm-cream/30">Click to add image</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Caption — View or Edit */}
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Caption</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="w-full bg-white/[0.05] text-sm text-gm-cream/90 rounded-lg p-4 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none font-sans leading-relaxed"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Hashtags</label>
              <textarea
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.05] text-xs text-gm-sage/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">
                First Comment
                {slot.platform === 'linkedin' && <Badge variant="warning" size="sm" className="ml-2">Required for LinkedIn</Badge>}
              </label>
              <textarea
                value={editFirstComment}
                onChange={(e) => setEditFirstComment(e.target.value)}
                rows={2}
                placeholder={slot.platform === 'linkedin' ? 'Put the link here — never in the post body' : 'Optional first comment'}
                className="w-full bg-white/[0.05] text-xs text-gm-cream/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none placeholder:text-gm-cream/15"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" loading={saving} onClick={saveEdit}>Save Changes</Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Caption */}
            {postText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">
                    {slot.platform === 'stories' ? 'Story Slides' : 'Caption'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={startEditing}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => copy(postText, 'caption')}>
                      {copied === 'caption' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
                <pre className="text-sm text-gm-cream/80 whitespace-pre-wrap font-sans leading-relaxed bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                  {postText}
                </pre>
              </div>
            )}

            {/* Hashtags */}
            {hashtags && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Hashtags</span>
                  <Button variant="ghost" size="sm" onClick={() => copy(hashtags, 'hash')}>
                    {copied === 'hash' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-gm-sage/60 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] leading-relaxed">
                  {hashtags}
                </p>
              </div>
            )}

            {/* First Comment */}
            <div className={`rounded-lg p-3 border ${
              firstComment
                ? 'bg-sky-500/5 border-sky-500/15'
                : slot.platform === 'linkedin'
                  ? 'bg-amber-500/5 border-amber-500/15'
                  : 'bg-white/[0.02] border-white/[0.05]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">First Comment</span>
                  {slot.platform === 'linkedin' && (
                    <Badge variant="warning" size="sm">Required for LinkedIn</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {!firstComment && <Button variant="ghost" size="sm" onClick={startEditing}>Add</Button>}
                  {firstComment && (
                    <Button variant="ghost" size="sm" onClick={() => copy(firstComment, 'fc')}>
                      {copied === 'fc' ? 'Copied!' : 'Copy'}
                    </Button>
                  )}
                </div>
              </div>
              {firstComment ? (
                <p className="text-xs text-gm-cream/70 leading-relaxed">{firstComment}</p>
              ) : (
                <p className="text-[10px] text-gm-cream/25 italic">
                  {slot.platform === 'linkedin'
                    ? 'No first comment set — LinkedIn posts should have the link in the first comment (not in the post body).'
                    : 'No first comment. Add one for extra engagement or to include a link.'}
                </p>
              )}
            </div>
          </>
        )}

        {/* Visual Direction */}
        {!editing && meta.visualDirection && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Visual Direction</span>
            <p className="text-xs text-gm-cream/50 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
              {meta.visualDirection}
            </p>
          </div>
        )}

        {/* Pomelli Prompt */}
        {!editing && meta.pomelliPrompt && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Pomelli Prompt</span>
              <Button variant="ghost" size="sm" onClick={() => copy(meta.pomelliPrompt, 'pomelli')}>
                {copied === 'pomelli' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-amber-400/70 bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
              {meta.pomelliPrompt}
            </p>
          </div>
        )}

        {/* Stories Slides */}
        {!editing && meta.storiesSlides && meta.storiesSlides.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Story Slides</span>
            <div className="grid grid-cols-3 gap-2">
              {meta.storiesSlides.map((slide: any, i: number) => (
                <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                  <p className="text-[10px] text-gm-cream/30 mb-1">Slide {i + 1}</p>
                  <p className="text-xs text-gm-cream/80 font-medium mb-1">{slide.text}</p>
                  <p className="text-[10px] text-gm-cream/40">{slide.visual}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Check */}
        {!editing && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Image Check</span>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) analyzeImage(f) }}
                />
                <Button variant="outline" size="sm" loading={analyzing} onClick={() => fileInputRef.current?.click()}>
                  {analyzing ? 'Analyzing...' : 'Check Image'}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-gm-cream/25 mb-2">Upload an image to verify it matches this post (product, dimensions, quality, brand).</p>

            {imageAnalysis && (
              <div className={`rounded-lg p-3 border ${
                imageAnalysis.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                imageAnalysis.status === 'needs_adjustment' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={
                    imageAnalysis.status === 'approved' ? 'success' :
                    imageAnalysis.status === 'needs_adjustment' ? 'warning' : 'danger'
                  }>
                    {imageAnalysis.status?.toUpperCase()}
                  </Badge>
                  {imageAnalysis.quality_score && (
                    <span className="text-[10px] text-gm-cream/40">Quality: {imageAnalysis.quality_score}/10</span>
                  )}
                  {imageAnalysis.brand_alignment && (
                    <span className="text-[10px] text-gm-cream/40">Brand: {imageAnalysis.brand_alignment}/10</span>
                  )}
                </div>

                {imageAnalysis.product_identified && (
                  <p className="text-xs text-gm-cream/60 mb-1">
                    <span className="text-gm-cream/40">Product:</span> {imageAnalysis.product_identified}
                    {imageAnalysis.product_correct === false && (
                      <Badge variant="danger" size="sm" className="ml-2">Wrong product</Badge>
                    )}
                  </p>
                )}

                {imageAnalysis.dimensions_check && !imageAnalysis.dimensions_check.suitable && (
                  <p className="text-[10px] text-amber-400/80 mb-1">
                    Dimensions: {imageAnalysis.dimensions_check.recommendation}
                  </p>
                )}

                {imageAnalysis.issues?.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {imageAnalysis.issues.map((issue: any, i: number) => (
                      <p key={i} className={`text-[10px] ${issue.severity === 'critical' ? 'text-red-400' : 'text-amber-400/70'}`}>
                        {issue.severity === 'critical' ? '✕' : '△'} {issue.detail}
                      </p>
                    ))}
                  </div>
                )}

                {imageAnalysis.suggestions?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {imageAnalysis.suggestions.map((s: string, i: number) => (
                      <p key={i} className="text-[10px] text-gm-sage/60">→ {s}</p>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gm-cream/50 mt-2">{imageAnalysis.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Approval Actions */}
        {!editing && availableActions.length > 0 && (
          <div className="pt-4 border-t border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-3">Approval Actions</span>

            {showRejectInput && (
              <div className="mb-3">
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Reason for rejection (required)..."
                  rows={2}
                  className="w-full bg-white/[0.05] text-xs text-gm-cream/70 rounded-lg p-3 border border-red-500/20 focus:border-red-500/40 focus:outline-none resize-none placeholder:text-gm-cream/15"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={approving === 'REJECT'}
                    onClick={() => {
                      if (!rejectComment.trim()) { alert('Comment is required'); return }
                      handleApproval('REJECT', rejectComment)
                    }}
                  >
                    Confirm Rejection
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowRejectInput(false); setRejectComment('') }}>Cancel</Button>
                </div>
              </div>
            )}

            {!showRejectInput && (
              <div className="flex flex-wrap gap-2">
                {availableActions.map(({ action, label, variant: btnVariant }) => (
                  <Button
                    key={action}
                    variant={btnVariant}
                    size="sm"
                    loading={approving === action}
                    onClick={() => {
                      if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
                        setShowRejectInput(true)
                      } else {
                        handleApproval(action)
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copy All Button */}
        {!editing && (
          <div className="pt-3 border-t border-white/[0.06] flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const full = [postText, hashtags ? `\n.\n.\n.\n${hashtags}` : ''].filter(Boolean).join('')
                copy(full, 'all')
              }}
            >
              {copied === 'all' ? 'Copied!' : 'Copy Caption + Hashtags'}
            </Button>
            {firstComment && (
              <Button variant="secondary" size="sm" onClick={() => copy(firstComment, 'fc2')}>
                {copied === 'fc2' ? 'Copied!' : 'Copy First Comment'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
