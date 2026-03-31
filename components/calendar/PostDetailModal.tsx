'use client'

import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CarouselEditor } from '@/components/posts/CarouselEditor'
import { CloudinaryPicker } from '@/components/ui/CloudinaryPicker'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { StatusDot } from '@/components/ui/StatusDot'
import { MARKETS } from '@/lib/constants'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useState, useRef, useEffect } from 'react'

function StorySlideEditor({ postId, variantId, initialSlides, onUpdate }: {
  postId: string; variantId: string
  initialSlides: Array<{ text: string; visual?: string }>
  onUpdate?: () => void
}) {
  const [slides, setSlides] = useState(initialSlides)
  const [editingSlide, setEditingSlide] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const saveSlides = async (newSlides: typeof slides) => {
    setSaving(true)
    try {
      // Update the variant notes with the new slides
      const text = newSlides.map((s, i) => `Slide ${i + 1}: ${s.text}`).join('\n---\n')
      const notes = JSON.stringify({ storiesSlides: newSlides })
      await fetch(`/api/posts/${postId}/variant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, text, notes }),
      })
      setSlides(newSlides)
      setEditingSlide(null)
      onUpdate?.()
    } catch { /* */ }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Story Slides ({slides.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {slides.map((slide, i) => (
          <div key={i} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gm-cream/40">Slide {i + 1}</span>
              <button
                onClick={() => setEditingSlide(editingSlide === i ? null : i)}
                className="text-xs text-gm-sage/60 hover:text-gm-sage transition-colors"
              >
                {editingSlide === i ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingSlide === i ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gm-cream/30 block mb-1">Text overlay (what appears on the slide)</label>
                  <input
                    value={slide.text}
                    onChange={(e) => {
                      const updated = [...slides]
                      updated[i] = { ...updated[i], text: e.target.value }
                      setSlides(updated)
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-white/20 rounded-xl text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gm-sage/60"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gm-cream/30 block mb-1">Visual direction (what the image/video should show)</label>
                  <input
                    value={slide.visual || ''}
                    onChange={(e) => {
                      const updated = [...slides]
                      updated[i] = { ...updated[i], visual: e.target.value }
                      setSlides(updated)
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-white/20 rounded-xl text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gm-sage/60"
                  />
                </div>
                <Button variant="primary" size="sm" loading={saving} onClick={() => saveSlides(slides)}>Save</Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gm-cream/90 font-medium mb-1">"{slide.text}"</p>
                {slide.visual && (
                  <p className="text-xs text-gm-cream/35 italic">{slide.visual}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FirstCommentEditor({ postId, variantId, initialValue, isLinkedIn, onCopy, copied, postText, platform, market }: {
  postId: string; variantId: string; initialValue: string; isLinkedIn: boolean; onCopy: (text: string) => void; copied: boolean
  postText?: string; platform?: string; market?: string
}) {
  const [editingFC, setEditingFC] = useState(false)
  const [fcValue, setFcValue] = useState(initialValue)
  const [savingFC, setSavingFC] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ text: string; approach: string }>>([])

  useEffect(() => { setFcValue(initialValue) }, [initialValue])

  const saveFC = async () => {
    if (!postId || !variantId) return
    setSavingFC(true)
    try {
      await fetch(`/api/posts/${postId}/variant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, firstComment: fcValue }),
      })
      setEditingFC(false)
      setSuggestions([])
    } catch { /* */ }
    setSavingFC(false)
  }

  const generateSuggestions = async () => {
    if (!postText) return
    setGenerating(true)
    setSuggestions([])
    try {
      const res = await fetch(`/api/posts/${postId}/first-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: postText, platform, market }),
      })
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.data.suggestions || [])
        if (!editingFC) setEditingFC(true)
      }
    } catch { /* */ }
    setGenerating(false)
  }

  const useSuggestion = (text: string) => {
    setFcValue(text)
    setSuggestions([])
  }

  return (
    <div className={`rounded-xl p-4 border ${
      fcValue ? 'bg-sky-500/5 border-sky-500/15' : isLinkedIn ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.02] border-white/[0.05]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">First Comment</span>
          {isLinkedIn && <Badge variant="warning" size="sm">Required for LinkedIn</Badge>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" loading={generating} onClick={generateSuggestions} disabled={!postText}>
            {generating ? 'Generating...' : '✨ AI Suggest'}
          </Button>
          {!editingFC && <Button variant="ghost" size="sm" onClick={() => setEditingFC(true)}>{fcValue ? 'Edit' : 'Add'}</Button>}
          {fcValue && !editingFC && (
            <Button variant="ghost" size="sm" onClick={() => onCopy(fcValue)}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2 mb-3">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gm-sage/60 font-semibold uppercase tracking-wider">{s.approach}</span>
                <Button variant="primary" size="sm" onClick={() => useSuggestion(s.text)}>Use this</Button>
              </div>
              <p className="text-sm text-gm-cream/70 leading-relaxed whitespace-pre-wrap">{s.text}</p>
            </div>
          ))}
        </div>
      )}

      {editingFC ? (
        <div className="space-y-2">
          <textarea
            value={fcValue}
            onChange={(e) => setFcValue(e.target.value)}
            placeholder={isLinkedIn ? 'Put the link here — never in the post body' : 'Link or additional context...'}
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-white/20 rounded-xl text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gm-sage/60 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" loading={savingFC} onClick={saveFC}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditingFC(false); setFcValue(initialValue); setSuggestions([]) }}>Cancel</Button>
          </div>
        </div>
      ) : fcValue ? (
        <p className="text-sm text-gm-cream/70 leading-relaxed">{fcValue}</p>
      ) : (
        <p className="text-xs text-gm-cream/25 italic">
          {isLinkedIn ? 'No first comment — LinkedIn posts should have the link here (not in the post body).' : 'No first comment. Click Add to include a link or extra context.'}
        </p>
      )}
    </div>
  )
}

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
    isCarousel?: boolean
    platform?: string
    variants: { id: string; text: string; hashtags: string | null; firstComment: string | null; notes: string | null; timing: string | null; imageUrl: string | null }[]
  } | null
}

interface PostDetailModalProps {
  slot: PostDetail | null
  open: boolean
  onClose: () => void
  onUpdate?: () => void
  onDelete?: () => void
  siblingSlots?: PostDetail[]
  onSwitchSlot?: (slot: PostDetail) => void
}

const DUPLICATE_TARGETS = [
  { market: 'hq', label: 'IG BE' },
  { market: 'us', label: 'IG US' },
  { market: 'ae', label: 'IG UAE' },
  { market: 'uk', label: 'IG UK' },
  { market: 'fr', label: 'IG FR' },
  { market: 'pl', label: 'IG PL' },
  { market: 'kr', label: 'IG KR' },
  { market: 'de', label: 'IG DE' },
]

export function PostDetailModal({ slot, open, onClose, onUpdate, onDelete, siblingSlots = [], onSwitchSlot }: PostDetailModalProps) {
  const [copied, setCopied] = useState('')
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [mediaItems, setMediaItems] = useState<Array<{ id: string; url: string; media_type: string; sort_order: number }>>([])
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [showCloudinaryPicker, setShowCloudinaryPicker] = useState(false)
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
  const [localCarousel, setLocalCarousel] = useState<boolean | null>(null)

  // Reset local state when slot changes
  useEffect(() => {
    setLocalStatus(null)
    setLocalCarousel(null)
  }, [slot?.post?.id])
  const [rejectComment, setRejectComment] = useState('')
  const [showRewrite, setShowRewrite] = useState(false)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [rewriting, setRewriting] = useState(false)
  const [rewriteVersions, setRewriteVersions] = useState<Array<{ text: string; reasoning: string }>>([])
  const [showRejectInput, setShowRejectInput] = useState(false)

  // Image Director state
  const [loadingVisual, setLoadingVisual] = useState(false)
  const [visualBrief, setVisualBrief] = useState<any>(null)

  // Schedule edit state
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  const isStory = slot?.platform === 'stories'

  const RECOMMENDED_SIZES: Record<string, string> = {
    instagram: '1080 × 1350 px (4:5) or 1080 × 1080 px (1:1)',
    linkedin: '1080 × 1080 px (1:1) recommended',
    stories: '1080 × 1920 px (9:16)',
    facebook: '1080 × 1350 px (4:5) or 1080 × 1080 px (1:1)',
    tiktok: '1080 × 1920 px (9:16)',
  }

  // Fetch real imageUrl + multi-media when opening a post
  useEffect(() => {
    setImageUrl(null)
    setMediaItems([])
    if (!slot?.post?.id) return

    const variantId = slot.post.variants?.[0]?.id
    const hasImageFlag = slot.post.variants?.[0]?.imageUrl

    // If calendar API returned HAS_IMAGE flag, fetch the real URL
    if (hasImageFlag && variantId) {
      fetch(`/api/posts/${slot.post.id}/variant?variantId=${variantId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.imageUrl) {
            setImageUrl(d.data.imageUrl)
          }
        })
        .catch(() => {})
    } else if (hasImageFlag && hasImageFlag !== 'HAS_IMAGE') {
      // It's an actual URL (not the flag)
      setImageUrl(hasImageFlag)
    }

    // Fetch multi-media items
    fetch(`/api/posts/${slot.post.id}/media`)
      .then(r => r.json())
      .then(d => { if (d.success) setMediaItems(d.data || []) })
      .catch(() => {})
  }, [slot?.id, slot?.post?.id])

  const handleImageUpload = async (file: File) => {
    if (!slot?.post?.id) return
    setUploading(true)
    const variant = slot.post.variants?.[0]
    if (!variant) { setUploading(false); return }

    try {
      // Upload directly to Cloudinary from browser (no server size limits)
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzbbql3do'
      const platform = slot.platform || 'instagram'
      const market = slot.market || 'hq'
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_ ]/g, '-')
      const folder = `greenmood/social/${platform}/${market}`

      const form = new FormData()
      form.append('file', file)
      form.append('upload_preset', 'greenmood_upload')
      form.append('folder', folder)
      form.append('tags', `greenmood,${platform},${market},post:${slot.post.id}`)
      form.append('context', `original_name=${file.name}|post_id=${slot.post.id}|market=${market}|platform=${platform}`)
      form.append('public_id', `${folder}/${cleanName}-${Date.now()}`)

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: form })
      const cloudData = await cloudRes.json()

      if (cloudData.secure_url) {
        const url = cloudData.secure_url
        setImageUrl(url)
        await fetch(`/api/posts/${slot.post.id}/variant`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId: variant.id, imageUrl: url }),
        })
        onUpdate?.()
      } else {
        console.error('Cloudinary upload failed:', cloudData.error?.message)
      }
    } catch (e) {
      console.error('Image upload failed:', e)
    }

    setUploading(false)
  }

  const handleMultiUpload = async (files: FileList) => {
    if (!slot?.post?.id) return
    setUploading(true)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzbbql3do'
    const platform = slot.platform || 'other'
    const market = slot.market || 'hq'
    const folder = platform === 'stories'
      ? `greenmood/social/stories/${market}`
      : `greenmood/social/${platform}/${market}`

    for (const file of Array.from(files)) {
      try {
        // Upload directly to Cloudinary from browser (no server size limit)
        const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_ ]/g, '-')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'greenmood_upload')
        formData.append('folder', folder)
        formData.append('tags', `${platform},${market},post:${slot.post.id}`)
        formData.append('context', `original_name=${file.name}|post_id=${slot.post.id}|market=${market}|platform=${platform}`)
        formData.append('public_id', `${folder}/${cleanName}-${Date.now()}`)

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: 'POST', body: formData }
        )
        const cloudData = await cloudRes.json()

        if (cloudData.secure_url) {
          // Register in our DB
          const isVideo = file.type.startsWith('video/')
          const maxOrder = mediaItems.length
          await prisma_register(slot.post.id, cloudData.secure_url, isVideo ? 'video' : 'image', maxOrder)
        }
      } catch (e) {
        console.error('Upload failed:', e)
      }
    }
    // Refresh media list
    const res = await fetch(`/api/posts/${slot.post.id}/media`)
    const data = await res.json()
    if (data.success) setMediaItems(data.data || [])
    setUploading(false)
  }

  // Register uploaded media in our DB
  const prisma_register = async (postId: string, url: string, mediaType: string, sortOrder: number) => {
    await fetch(`/api/posts/${postId}/media/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mediaType, sortOrder }),
    })
  }

  const removeMedia = async (mediaId: string) => {
    if (!slot?.post?.id) return
    await fetch(`/api/posts/${slot.post.id}/media?mediaId=${mediaId}`, { method: 'DELETE' })
    setMediaItems(prev => prev.filter(m => m.id !== mediaId))
  }

  const multiInputRef = useRef<HTMLInputElement>(null)
  const [dragMediaIdx, setDragMediaIdx] = useState<number | null>(null)

  const handleMediaReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || !slot?.post?.id) return
    const reordered = [...mediaItems]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setMediaItems(reordered)
    setDragMediaIdx(null)
    // Persist new order via API
    await fetch(`/api/posts/${slot.post.id}/media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds: reordered.map(m => m.id) }),
    })
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

  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    if (!slot?.post?.id) return
    if (!confirm('Publish this post now?')) return
    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: slot.post.id }),
      })
      const data = await res.json()
      if (data.success) {
        setLocalStatus('PUBLISHED')
        onUpdate?.()
      } else {
        alert('Publish failed: ' + data.error)
      }
    } catch { alert('Publish failed') }
    setPublishing(false)
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

  // Determine available actions based on status — simplified flow
  const getAvailableActions = () => {
    const actions: { action: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'outline'; nextStatus: string }[] = []
    switch (postStatus) {
      case 'DRAFT':
      case 'AI_GENERATED':
      case 'FACT_CHECKED':
      case 'BRAND_APPROVED':
        actions.push({ action: 'APPROVE', label: 'Approve', variant: 'primary', nextStatus: 'READY_TO_SCHEDULE' })
        actions.push({ action: 'SCHEDULE', label: 'Approve & Schedule', variant: 'primary', nextStatus: 'SCHEDULED' })
        actions.push({ action: 'DELETE', label: 'Delete', variant: 'danger', nextStatus: 'DELETED' })
        break
      case 'READY_TO_SCHEDULE':
        actions.push({ action: 'APPROVE', label: 'Schedule', variant: 'primary', nextStatus: 'SCHEDULED' })
        break
      case 'SCHEDULED':
        actions.push({ action: 'PUBLISH_NOW', label: 'Publish Now', variant: 'primary', nextStatus: 'PUBLISHED' })
        actions.push({ action: 'UNSCHEDULE', label: 'Unschedule', variant: 'outline', nextStatus: 'READY_TO_SCHEDULE' })
        break
      case 'REJECTED':
        actions.push({ action: 'APPROVE', label: 'Move to Draft', variant: 'secondary', nextStatus: 'DRAFT' })
        break
    }
    return actions
  }

  const availableActions = getAvailableActions()

  return (
    <Modal open={open} onClose={() => { setEditing(false); setShowRejectInput(false); onClose() }} title="" size="xl">
      {/* Status Bar — prominent at top */}
      {!editing && availableActions.length > 0 && (
        <div className="flex items-center gap-3 p-4 -mx-8 -mt-8 mb-6 bg-white/[0.03] border-b border-white/[0.08]">
          <SocialIcon platform={slot.platform} size="lg" />
          <span className="text-sm font-semibold text-gm-cream/60 capitalize">{slot.platform}</span>
          <span className="text-gm-cream/15">|</span>
          <Badge variant="info" size="md">{postStatus?.replace(/_/g, ' ')}</Badge>
          <span className="text-gm-cream/20">→</span>
          <div className="flex items-center gap-2 ml-auto">
            {availableActions.map(({ action, label, variant: btnVariant }) => (
              <Button
                key={action + '-top'}
                variant={btnVariant}
                size="md"
                loading={approving === action || (action === 'PUBLISH_NOW' && publishing)}
                onClick={() => {
                  if (action === 'REJECT' || action === 'REQUEST_CHANGES') {
                    setShowRejectInput(true)
                  } else if (action === 'PUBLISH_NOW') {
                    handlePublish()
                  } else if (action === 'UNSCHEDULE') {
                    if (confirm('Unschedule this post? It will go back to Ready to Schedule.')) {
                      handleApproval('UNSCHEDULE')
                    }
                  } else {
                    handleApproval(action)
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Market tabs for grouped posts */}
      {siblingSlots.length > 1 && (
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/[0.06]">
          <span className="text-xs text-gm-cream/30 uppercase tracking-wider font-semibold mr-2">Markets</span>
          {siblingSlots.map(s => {
            const m = MARKETS[s.market]
            const isActive = s.id === slot.id
            return (
              <button
                key={s.id}
                onClick={() => onSwitchSlot?.(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-gm-sage/20 text-gm-sage border-gm-sage/30'
                    : 'bg-white/[0.03] text-gm-cream/50 border-white/[0.08] hover:border-white/20 hover:text-gm-cream/70'
                }`}
              >
                <FlagIcon market={s.market} size="md" />
                {m?.name || s.market}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-5 gap-8">
        {/* LEFT COLUMN — Media (2/5) */}
        <div className="col-span-2 space-y-5">
          {/* Media — single for posts, multi for stories */}
          <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
          <input ref={multiInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleMultiUpload(e.target.files) }} />

          {isStory ? (
            /* STORIES: Multi-media grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-gm-cream/35 font-semibold">Story Slides ({mediaItems.length})</span>
                <Button variant="outline" size="sm" onClick={() => multiInputRef.current?.click()}>
                  + Add slides
                </Button>
              </div>
              {mediaItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((m, i) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => setDragMediaIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragMediaIdx !== null) handleMediaReorder(dragMediaIdx, i) }}
                      onDragEnd={() => setDragMediaIdx(null)}
                      className={`relative rounded-lg overflow-hidden border border-white/[0.08] aspect-[9/16] bg-black/20 group cursor-grab active:cursor-grabbing transition-opacity ${dragMediaIdx === i ? 'opacity-40' : ''}`}
                    >
                      <div className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[10px] text-white font-bold">{i + 1}</div>
                      {m.media_type === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(m.id)}
                        className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  <button
                    onClick={() => multiInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-white/[0.08] hover:border-gm-sage/30 aspect-[9/16] flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                  >
                    <span className="text-xl opacity-20">+</span>
                    <span className="text-[10px] text-gm-cream/20">Add</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => multiInputRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-64 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-gm-sage/30 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-all"
                >
                  {uploading ? (
                    <span className="text-sm text-gm-cream/40 animate-pulse">Uploading...</span>
                  ) : (
                    <>
                      <span className="text-3xl opacity-15">+</span>
                      <span className="text-sm text-gm-cream/25">Add story slides</span>
                      <span className="text-xs text-gm-cream/15">Images & videos</span>
                      <span className="text-[10px] text-gm-sage/30 mt-1">1080 × 1920 px (9:16)</span>
                    </>
                  )}
                </button>
              )}
              {uploading && <p className="text-xs text-gm-cream/40 animate-pulse text-center">Uploading...</p>}
            </div>
          ) : (
            /* REGULAR POST: Single or Carousel */
            <div className="space-y-3">
              {/* Carousel toggle */}
              {(() => {
                const isCarousel = localCarousel !== null ? localCarousel : !!slot?.post?.isCarousel
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          if (!slot?.post?.id) return
                          const newVal = !isCarousel
                          setLocalCarousel(newVal)
                          await fetch(`/api/posts/${slot.post.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isCarousel: newVal }),
                          })
                          onUpdate?.()
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          isCarousel
                            ? 'bg-gm-sage/20 border-gm-sage/40 text-gm-sage'
                            : 'bg-white/[0.03] border-white/[0.08] text-gm-cream/40 hover:text-gm-cream/60'
                        }`}
                      >
                        {isCarousel ? 'Carousel ON' : 'Carousel OFF'}
                      </button>
                      {isCarousel && (
                        <span className="text-xs text-gm-cream/30">Upload multiple images, drag to reorder</span>
                      )}
                    </div>

                    {/* Carousel editor or single image */}
                    {isCarousel ? (
                <CarouselEditor postId={slot.post!.id} onUpdate={onUpdate} />
              ) : (
                <>
                  {(imageUrl || variant?.imageUrl) ? (() => {
                    const mediaUrl = imageUrl || variant?.imageUrl || ''
                    const isVideoFile = mediaUrl.match(/\.(mp4|mov|webm|avi)/i) || mediaUrl.includes('video')
                    return (
                    <div
                      className="rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer group relative bg-black/20"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {isVideoFile ? (
                        <video src={mediaUrl} className="w-full max-h-56 object-contain bg-black" controls muted />
                      ) : (
                        <img src={mediaUrl} alt="Post media" className="w-full max-h-56 object-contain bg-black/40" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <span className="text-sm text-white font-medium bg-black/50 px-4 py-2 rounded-xl cursor-pointer hover:bg-black/70 transition-colors">Change</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageUrl(null)
                            if (variant?.id && slot?.post?.id) {
                              fetch(`/api/posts/${slot.post.id}/variant`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ variantId: variant.id, imageUrl: null }),
                              }).then(() => onUpdate?.())
                            }
                          }}
                          className="text-sm text-white font-medium bg-red-500/70 px-4 py-2 rounded-xl hover:bg-red-500 transition-colors"
                        >Delete</button>
                      </div>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-sm text-white animate-pulse">Uploading...</span>
                        </div>
                      )}
                    </div>
                    )})() : (
                    <div className="space-y-2">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full h-32 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-gm-sage/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.02]"
                      >
                        {uploading ? (
                          <span className="text-sm text-gm-cream/40 animate-pulse">Uploading...</span>
                        ) : (
                          <>
                            <span className="text-2xl opacity-15">+</span>
                            <span className="text-xs text-gm-cream/25">Upload image or video</span>
                            <span className="text-[10px] text-gm-sage/30 mt-1">{RECOMMENDED_SIZES[slot?.platform || 'instagram'] || '1080 × 1080 px'}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowCloudinaryPicker(true)}
                        className="w-full py-2.5 rounded-xl border border-white/[0.08] hover:border-gm-sage/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.02]"
                      >
                        <span className="text-xs text-gm-cream/40">Browse Library</span>
                      </button>
                    </div>
                  )}
                </>
              )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Schedule + Meta Info */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-gm-cream/35 font-semibold">Schedule</span>
              {!editingSchedule && (
                <button onClick={startEditingSchedule} className="text-xs text-gm-sage/50 hover:text-gm-sage transition-colors">Edit</button>
              )}
            </div>
            {editingSchedule ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                    className="bg-white text-sm text-gray-900 rounded-xl px-3 py-2 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 focus:outline-none" />
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-white text-sm text-gray-900 rounded-xl px-3 py-2 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 focus:outline-none" />
                </div>
                <p className="text-[10px] text-gm-cream/25">Timezone: {market?.timezone || 'Europe/Brussels'}</p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" loading={savingSchedule} onClick={saveSchedule}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-semibold text-gm-cream">{slot.date?.split('T')[0]}</p>
                  <p className="text-sm text-gm-cream/50">{slot.time || 'No time set'} <span className="text-gm-cream/25 text-xs">({market?.timezone || 'Europe/Brussels'})</span></p>
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.06] pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gm-cream/30 w-16">Market</span>
                <span className="text-sm text-gm-cream/80">{market?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gm-cream/30 w-16">Platform</span>
                <Badge variant="default">{slot.platform}</Badge>
              </div>
              {meta.type && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gm-cream/30 w-16">Format</span>
                  <Badge variant="info">{meta.type}</Badge>
                </div>
              )}
              {slot.campaign && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gm-cream/30 w-16">Campaign</span>
                  <span className="text-sm text-gm-sage/60">{slot.campaign.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowDuplicate(!showDuplicate)}>
                Duplicate to...
              </Button>
              {showDuplicate && (
                <div className="absolute top-10 left-0 z-50 bg-[#0f1a0f] border border-white/[0.1] rounded-xl shadow-2xl py-2 min-w-[160px]">
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
                        className="w-full text-left px-4 py-2 text-sm text-gm-cream/70 hover:bg-white/[0.05] hover:text-gm-cream transition-colors disabled:opacity-40"
                      >
                        {duplicating === t.market ? 'Duplicating...' : t.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
            {onDelete && (
              <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Content (3/5) */}
        <div className="col-span-3 space-y-5">

        {/* Caption — View or Edit */}
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Caption</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="w-full bg-white text-sm text-gray-900 rounded-xl p-4 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 focus:outline-none resize-none font-sans leading-relaxed"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Hashtags</label>
              <textarea
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                rows={3}
                className="w-full bg-white text-sm text-gray-700 rounded-xl p-3 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">
                First Comment
                {slot.platform === 'linkedin' && <Badge variant="warning" size="sm" className="ml-2">Required for LinkedIn</Badge>}
              </label>
              <textarea
                value={editFirstComment}
                onChange={(e) => setEditFirstComment(e.target.value)}
                rows={2}
                placeholder={slot.platform === 'linkedin' ? 'Put the link here — never in the post body' : 'Optional first comment'}
                className="w-full bg-white text-sm text-gray-900 rounded-xl p-3 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 focus:outline-none resize-none placeholder:text-gray-400"
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
                  <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">
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

                {/* AI Rewrite */}
                <div className="mt-3 space-y-2">
                  {!showRewrite ? (
                    <button
                      onClick={() => setShowRewrite(true)}
                      className="text-xs text-gm-sage/60 hover:text-gm-sage transition-colors flex items-center gap-1.5"
                    >
                      <span>✨</span> Rewrite with AI
                    </button>
                  ) : (
                    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={rewriteInstruction}
                          onChange={(e) => setRewriteInstruction(e.target.value)}
                          placeholder="Optional: make it shorter, more punchy, different angle..."
                          className="flex-1 bg-white text-sm text-gray-900 rounded-xl px-3 py-2 border border-white/20 shadow-sm focus:ring-2 focus:ring-gm-sage/60 focus:outline-none placeholder:text-gray-400"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          loading={rewriting}
                          onClick={async () => {
                            if (!slot?.post?.id) return
                            setRewriting(true)
                            setRewriteVersions([])
                            try {
                              const res = await fetch(`/api/posts/${slot.post.id}/rewrite`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  text: postText,
                                  instruction: rewriteInstruction || undefined,
                                  platform: slot.platform,
                                  market: slot.market,
                                }),
                              })
                              const data = await res.json()
                              if (data.success) setRewriteVersions(data.data.versions || [])
                              else alert('Rewrite failed: ' + data.error)
                            } catch { alert('Rewrite failed') }
                            setRewriting(false)
                          }}
                        >
                          Generate
                        </Button>
                        <button onClick={() => { setShowRewrite(false); setRewriteVersions([]) }} className="text-xs text-gm-cream/30 hover:text-gm-cream/50">x</button>
                      </div>

                      {rewriteVersions.map((v, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs text-gm-sage/60 font-semibold shrink-0">Version {i + 1}</span>
                            <span className="text-xs text-gm-cream/25 italic">{v.reasoning}</span>
                          </div>
                          <pre className="text-sm text-gm-cream/70 whitespace-pre-wrap font-sans leading-relaxed">{v.text}</pre>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => copy(v.text, `v${i}`)}>
                              {copied === `v${i}` ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button variant="primary" size="sm" onClick={async () => {
                              if (!variant?.id || !slot?.post?.id) return
                              await fetch(`/api/posts/${slot.post.id}/variant`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ variantId: variant.id, text: v.text }),
                              })
                              setShowRewrite(false)
                              setRewriteVersions([])
                              onUpdate?.()
                            }}>
                              Use this version
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {hashtags && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Hashtags</span>
                  <Button variant="ghost" size="sm" onClick={() => copy(hashtags, 'hash')}>
                    {copied === 'hash' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-sm text-gm-sage/60 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] leading-relaxed">
                  {hashtags}
                </p>
              </div>
            )}

            {/* First Comment — inline editable */}
            <FirstCommentEditor
              postId={slot.post?.id || ''}
              variantId={variant?.id || ''}
              initialValue={firstComment}
              isLinkedIn={slot.platform === 'linkedin'}
              onCopy={(text) => copy(text, 'fc')}
              copied={copied === 'fc'}
              postText={postText}
              platform={slot.platform}
              market={slot.market}
            />
          </>
        )}

        {/* Image Suggestion — from notes field or meta */}
        {!editing && (() => {
          const notesRaw = variant?.notes || ''
          const imageSuggestion = meta.pomelliPrompt || meta.visualDirection || meta.image_suggestion
            || (notesRaw.startsWith('Image:') ? notesRaw : notesRaw.match(/Image:\s*(.+)/)?.[1])
          if (!imageSuggestion) return null
          const displayText = typeof imageSuggestion === 'string'
            ? imageSuggestion.replace(/^Image:\s*/i, '')
            : imageSuggestion
          return (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-amber-400/70 font-semibold">Image Suggestion</span>
                <Button variant="ghost" size="sm" onClick={() => copy(displayText, 'img-suggestion')}>
                  {copied === 'img-suggestion' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-amber-400/70 leading-relaxed">{displayText}</p>
            </div>
          )
        })()}

        {/* Stories Slides — editable inline */}
        {meta.storiesSlides && meta.storiesSlides.length > 0 && (
          <StorySlideEditor
            postId={slot.post?.id || ''}
            variantId={variant?.id || ''}
            initialSlides={meta.storiesSlides}
            onUpdate={onUpdate}
          />
        )}

        {/* Image Check */}
        {!editing && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Image Check</span>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) analyzeImage(f) }}
                />
                <Button variant="outline" size="sm" loading={analyzing} onClick={() => fileInputRef.current?.click()}>
                  {analyzing ? 'Analyzing...' : 'Check Image'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gm-cream/25 mb-2">Upload an image to verify it matches this post (product, dimensions, quality, brand).</p>

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
                    <span className="text-xs text-gm-cream/40">Quality: {imageAnalysis.quality_score}/10</span>
                  )}
                  {imageAnalysis.brand_alignment && (
                    <span className="text-xs text-gm-cream/40">Brand: {imageAnalysis.brand_alignment}/10</span>
                  )}
                </div>

                {imageAnalysis.product_identified && (
                  <p className="text-sm text-gm-cream/60 mb-1">
                    <span className="text-gm-cream/40">Product:</span> {imageAnalysis.product_identified}
                    {imageAnalysis.product_correct === false && (
                      <Badge variant="danger" size="sm" className="ml-2">Wrong product</Badge>
                    )}
                  </p>
                )}

                {imageAnalysis.dimensions_check && !imageAnalysis.dimensions_check.suitable && (
                  <p className="text-xs text-amber-400/80 mb-1">
                    Dimensions: {imageAnalysis.dimensions_check.recommendation}
                  </p>
                )}

                {imageAnalysis.issues?.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {imageAnalysis.issues.map((issue: any, i: number) => (
                      <p key={i} className={`text-xs ${issue.severity === 'critical' ? 'text-red-400' : 'text-amber-400/70'}`}>
                        {issue.severity === 'critical' ? '✕' : '△'} {issue.detail}
                      </p>
                    ))}
                  </div>
                )}

                {imageAnalysis.suggestions?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {imageAnalysis.suggestions.map((s: string, i: number) => (
                      <p key={i} className="text-xs text-gm-sage/60">→ {s}</p>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gm-cream/50 mt-2">{imageAnalysis.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* AI Visual Brief */}
        {!editing && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">AI Visual Brief</span>
              <Button variant="outline" size="sm" loading={loadingVisual} onClick={async () => {
                if (!slot?.post?.id) return
                setLoadingVisual(true)
                setVisualBrief(null)
                try {
                  const res = await fetch('/api/agents/image-director', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: slot.post.id }),
                  })
                  const data = await res.json()
                  if (data.success) setVisualBrief(data)
                } catch { /* ignore */ }
                setLoadingVisual(false)
              }}>
                {loadingVisual ? 'Generating...' : '✨ Suggest Visual'}
              </Button>
            </div>
            <p className="text-xs text-gm-cream/25 mb-2">AI suggests visual direction, image source, and an AI generation prompt.</p>

            {visualBrief && (
              <div className="space-y-3 bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                {/* Visual Direction */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold mb-1">Direction</p>
                  <p className="text-sm text-gm-cream/70">{visualBrief.visualDirection?.mood}</p>
                  <p className="text-xs text-gm-cream/40 mt-1">Lighting: {visualBrief.visualDirection?.lighting} — Angle: {visualBrief.visualDirection?.angle}</p>
                </div>

                {/* Image Source */}
                {visualBrief.cloudinarySuggestion && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold mb-1">Image Source</p>
                    <p className="text-xs text-gm-sage/70 font-medium">{visualBrief.cloudinarySuggestion.primaryFolder}</p>
                    {visualBrief.cloudinarySuggestion.notes && (
                      <p className="text-xs text-gm-cream/40 mt-0.5">{visualBrief.cloudinarySuggestion.notes}</p>
                    )}
                  </div>
                )}

                {/* Pommeli Prompt */}
                {visualBrief.pomelliPrompt && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold mb-1">AI Image Prompt (Pommeli)</p>
                    <div className="relative group">
                      <p className="text-xs text-gm-cream/50 bg-black/20 rounded-lg p-3 leading-relaxed">{visualBrief.pomelliPrompt}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(visualBrief.pomelliPrompt)}
                        className="absolute top-2 right-2 text-[10px] text-gm-cream/30 hover:text-gm-cream/60 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-2 py-1 rounded"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Dimensions */}
                {visualBrief.dimensions && (
                  <p className="text-xs text-gm-cream/30">
                    Recommended: {visualBrief.dimensions.width}x{visualBrief.dimensions.height} ({visualBrief.dimensions.aspectRatio})
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reject input */}
        {showRejectInput && (
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Reason for rejection (required)..."
              rows={2}
              className="w-full bg-white text-sm text-gray-900 rounded-xl p-3 border border-red-300 shadow-sm focus:ring-2 focus:ring-red-400/30 focus:border-red-400 focus:outline-none resize-none placeholder:text-gray-400"
            />
            <div className="flex gap-2 mt-3">
              <Button variant="danger" size="sm" loading={approving === 'REJECT'}
                onClick={() => { if (!rejectComment.trim()) { alert('Comment is required'); return }; handleApproval('REJECT', rejectComment) }}>
                Confirm Rejection
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowRejectInput(false); setRejectComment('') }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Copy All */}
        {!editing && (
          <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
            <Button variant="secondary" size="sm"
              onClick={() => { const full = [postText, hashtags ? `\n.\n.\n.\n${hashtags}` : ''].filter(Boolean).join(''); copy(full, 'all') }}>
              {copied === 'all' ? 'Copied!' : 'Copy Caption + Hashtags'}
            </Button>
            {firstComment && (
              <Button variant="secondary" size="sm" onClick={() => copy(firstComment, 'fc2')}>
                {copied === 'fc2' ? 'Copied!' : 'Copy First Comment'}
              </Button>
            )}
          </div>
        )}

        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* Cloudinary Library Picker */}
      <CloudinaryPicker
        open={showCloudinaryPicker}
        onClose={() => setShowCloudinaryPicker(false)}
        defaultFolder="recent"
        onSelect={async (url) => {
          setImageUrl(url)
          if (variant?.id && slot?.post?.id) {
            await fetch(`/api/posts/${slot.post.id}/variant`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ variantId: variant.id, imageUrl: url }),
            })
            onUpdate?.()
          }
        }}
      />
    </Modal>
  )
}
