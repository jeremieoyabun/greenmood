'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/StatusDot'
import { EmptyState } from '@/components/ui/EmptyState'
import { MARKETS, POST_STATUS_CONFIG } from '@/lib/constants'

interface PostData {
  id: string
  status: string
  market: string
  platform: string
  campaign: { title: string } | null
  variant: {
    id: string
    text: string
    hashtags: string | null
    firstComment: string | null
    notes: string | null
    timing: string | null
    imageUrl: string | null
  } | null
  lastStep: { comment: string | null; action: string } | null
  date: string | null
  time: string | null
}

interface HistoryItem {
  id: string
  fromStatus: string
  toStatus: string
  action: string
  comment: string | null
  createdAt: string
  post: { market: string; platform: string } | null
  reviewer: { name: string } | null
}

interface ApprovalQueueProps {
  posts: PostData[]
  history: HistoryItem[]
}

export function ApprovalQueue({ posts, history }: ApprovalQueueProps) {
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [editFirstComment, setEditFirstComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [copied, setCopied] = useState('')
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Filters
  const [filterMarket, setFilterMarket] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')
  // Scheduling
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')
  const [showScheduler, setShowScheduler] = useState(false)

  const markets = Array.from(new Set(posts.map(p => p.market)))
  const statuses = Array.from(new Set(posts.map(p => p.status)))
  const platforms = Array.from(new Set(posts.map(p => p.platform)))

  // Priority order: ready to publish first, then by status
  const STATUS_PRIORITY: Record<string, number> = {
    SCHEDULED: 0, READY_TO_SCHEDULE: 1, BRAND_APPROVED: 2,
    FACT_CHECKED: 3, DRAFT: 4, AI_GENERATED: 5, REJECTED: 6,
  }

  const filteredPosts = posts
    .filter(p => {
      if (filterMarket !== 'all' && p.market !== filterMarket) return false
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false
      return true
    })
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9))

  const handleImageUpload = async (file: File) => {
    // Upload to Vercel Blob for persistent URL
    const uploadData = new FormData()
    uploadData.append('file', file)
    if (selectedPost?.id) uploadData.append('postId', selectedPost.id)
    try {
      const uploadRes = await fetch('/api/assets/upload', { method: 'POST', body: uploadData })
      const uploadJson = await uploadRes.json()
      if (uploadJson.success) {
        setImagePreview(uploadJson.data.url)
        if (selectedPost?.variant) {
          await saveImageUrl(uploadJson.data.url)
        }
      } else {
        // Fallback to data URL
        const reader = new FileReader()
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string
          setImagePreview(dataUrl)
          if (selectedPost?.variant) await saveImageUrl(dataUrl)
        }
        reader.readAsDataURL(file)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        setImagePreview(dataUrl)
        if (selectedPost?.variant) await saveImageUrl(dataUrl)
      }
      reader.readAsDataURL(file)
    }

    // Analyze in background (non-blocking — image is already saved)
    setAnalyzing(true)
    setImageAnalysis(null)
    const analyzeData = new FormData()
    analyzeData.append('file', file)
    if (selectedPost?.id) analyzeData.append('postId', selectedPost.id)
    fetch('/api/assets/analyze', { method: 'POST', body: analyzeData })
      .then(res => res.json())
      .then(data => {
        if (data.success) setImageAnalysis(data.data)
        else setImageAnalysis({ status: 'info', summary: 'Image saved. AI analysis unavailable.' })
      })
      .catch(() => setImageAnalysis({ status: 'info', summary: 'Image saved. AI analysis unavailable.' }))
      .finally(() => setAnalyzing(false))
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const startEditing = () => {
    if (!selectedPost?.variant) return
    setEditText(selectedPost.variant.text)
    setEditHashtags(selectedPost.variant.hashtags || '')
    setEditFirstComment(selectedPost.variant.firstComment || '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!selectedPost?.variant) return
    setSaving(true)
    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/variant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedPost.variant.id,
          text: editText,
          hashtags: editHashtags,
          firstComment: editFirstComment,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEditing(false)
        window.location.reload()
      } else alert('Save failed: ' + data.error)
    } catch { alert('Save failed') }
    setSaving(false)
  }

  const handleApproval = async (action: string, comment?: string) => {
    if (!selectedPost) return
    setApproving(action)
    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment || undefined, reviewerId: 'user-jeremie' }),
      })
      const data = await res.json()
      if (data.success) {
        setShowReject(false)
        setRejectComment('')
        window.location.reload()
      } else alert('Action failed: ' + data.error)
    } catch { alert('Action failed') }
    setApproving(null)
  }

  const getActions = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'AI_GENERATED':
      case 'FACT_CHECKED':
      case 'BRAND_APPROVED':
        return [
          { action: 'APPROVE', label: 'Approve', variant: 'primary' as const },
          { action: 'SCHEDULE', label: 'Approve & Schedule', variant: 'primary' as const },
          { action: 'DELETE', label: 'Delete', variant: 'danger' as const },
        ]
      case 'READY_TO_SCHEDULE':
        return [
          { action: 'SCHEDULE', label: 'Schedule Post', variant: 'primary' as const },
          { action: 'DELETE', label: 'Delete', variant: 'danger' as const },
        ]
      case 'SCHEDULED':
        return [
          { action: 'PUBLISH', label: 'Publish Now', variant: 'primary' as const },
          { action: 'DELETE', label: 'Delete', variant: 'danger' as const },
        ]
      default: return []
    }
  }

  // Save image URL to DB when uploaded
  const saveImageUrl = async (url: string) => {
    if (!selectedPost?.variant) return
    await fetch(`/api/posts/${selectedPost.id}/variant`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: selectedPost.variant.id, imageUrl: url }),
    })
  }

  const handlePublish = async () => {
    if (!selectedPost) return
    setApproving('PUBLISH')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost.id }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Published successfully! Platform ID: ${data.data?.platformId || 'OK'}`)
        window.location.reload()
      } else alert('Publish failed: ' + data.error)
    } catch { alert('Publish failed') }
    setApproving(null)
  }

  const handleSchedule = async () => {
    if (!selectedPost || !scheduleDate) { alert('Pick a date first'); return }
    setApproving('SCHEDULE')
    try {
      // Update calendar slot date/time
      const res = await fetch(`/api/posts/${selectedPost.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: scheduleDate, time: scheduleTime }),
      })
      const data = await res.json()
      if (data.success) {
        // Also advance status
        await handleApproval('APPROVE')
        setShowScheduler(false)
      } else alert('Schedule failed: ' + data.error)
    } catch { alert('Schedule failed') }
    setApproving(null)
  }

  return (
    <div className="flex gap-4">
      {/* Filters */}
      <div className="w-1/2 space-y-2">
        <div className="flex gap-2 mb-3 flex-wrap">
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)}
            className="bg-[#1a2a1a] text-sm text-gm-cream/70 rounded-lg px-3 py-1.5 border border-white/[0.1] focus:outline-none [&>option]:bg-[#1a2a1a] [&>option]:text-gm-cream/90">
            <option value="all">All Markets</option>
            {markets.map(m => (
              <option key={m} value={m}>{MARKETS[m]?.emoji} {MARKETS[m]?.name || m}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#1a2a1a] text-sm text-gm-cream/70 rounded-lg px-3 py-1.5 border border-white/[0.1] focus:outline-none [&>option]:bg-[#1a2a1a] [&>option]:text-gm-cream/90">
            <option value="all">All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{POST_STATUS_CONFIG[s as keyof typeof POST_STATUS_CONFIG]?.label || s}</option>
            ))}
          </select>
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
            className="bg-[#1a2a1a] text-sm text-gm-cream/70 rounded-lg px-3 py-1.5 border border-white/[0.1] focus:outline-none [&>option]:bg-[#1a2a1a] [&>option]:text-gm-cream/90">
            <option value="all">All Platforms</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="text-xs text-gm-cream/25 self-center ml-auto">{filteredPosts.length} posts</span>
        </div>

        {filteredPosts.length === 0 ? (
          <Card>
            <EmptyState title="No posts match filters" description="Try changing your filters or generate new content." />
          </Card>
        ) : (
          filteredPosts.map((post) => {
            const config = POST_STATUS_CONFIG[post.status as keyof typeof POST_STATUS_CONFIG]
            const isSelected = selectedPost?.id === post.id
            return (
              <Card
                key={post.id}
                hover
                className={`cursor-pointer transition-all ${isSelected ? 'ring-1 ring-gm-sage/30 bg-white/[0.03]' : ''} ${post.status === 'SCHEDULED' || post.status === 'READY_TO_SCHEDULE' ? 'border-l-2 border-l-gm-sage' : ''}`}
                onClick={() => { setSelectedPost(post); setEditing(false); setShowReject(false); setShowScheduler(false); setImagePreview(post.variant?.imageUrl || null); setImageAnalysis(null) }}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={
                    post.status === 'REJECTED' ? 'danger' :
                    post.status === 'AI_GENERATED' ? 'purple' :
                    post.status === 'FACT_CHECKED' ? 'info' :
                    post.status === 'BRAND_APPROVED' ? 'success' :
                    post.status === 'READY_TO_SCHEDULE' ? 'warning' :
                    post.status === 'SCHEDULED' ? 'info' : 'default'
                  } size="sm">{config?.label || post.status}</Badge>
                  <span className="text-xs text-gm-cream/50">
                    {MARKETS[post.market]?.emoji} {MARKETS[post.market]?.name} — {post.platform}
                  </span>
                  {post.date && (
                    <span className="text-xs text-gm-cream/25">
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {post.variant && (
                  <p className="text-xs text-gm-cream/50 line-clamp-2">{post.variant.text}</p>
                )}
                {post.lastStep?.comment && (
                  <p className="text-xs text-amber-400/50 mt-1 italic">&quot;{post.lastStep.comment}&quot;</p>
                )}
              </Card>
            )
          })
        )}

        {/* Recent Activity */}
        {history.length > 0 && (
          <Card className="mt-4">
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {history.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 py-1 border-b border-white/[0.03] last:border-0">
                    <StatusDot status={step.toStatus} />
                    <span className="text-xs text-gm-cream/40 flex-1">
                      {step.fromStatus} → {step.toStatus}
                      {step.post && ` — ${MARKETS[step.post.market]?.emoji || ''} ${step.post.platform}`}
                    </span>
                    <Badge variant={step.action === 'APPROVE' ? 'success' : 'danger'} size="sm">{step.action}</Badge>
                    <span className="text-[11px] text-gm-cream/15">{new Date(step.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Post Detail / Preview Panel */}
      <div className="w-1/2 sticky top-4">
        {!selectedPost ? (
          <Card className="h-96 flex items-center justify-center">
            <p className="text-sm text-gm-cream/20">Select a post to preview and review</p>
          </Card>
        ) : (
          <Card>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-lg">{MARKETS[selectedPost.market]?.emoji}</span>
              <span className="text-sm font-medium text-gm-cream">{MARKETS[selectedPost.market]?.name}</span>
              <Badge variant="default">{selectedPost.platform}</Badge>
              <StatusDot status={selectedPost.status} />
              <span className="text-xs text-gm-cream/30 ml-auto">
                {selectedPost.date && new Date(selectedPost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {selectedPost.time || ''}
              </span>
            </div>

            {editing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Caption</label>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6}
                    className="w-full bg-white/[0.05] text-sm text-gm-cream/90 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none font-sans leading-relaxed" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Hashtags</label>
                  <textarea value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} rows={2}
                    className="w-full bg-white/[0.05] text-sm text-gm-sage/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">
                    First Comment {selectedPost.platform === 'linkedin' && <Badge variant="warning" size="sm" className="ml-1">Required</Badge>}
                  </label>
                  <textarea value={editFirstComment} onChange={(e) => setEditFirstComment(e.target.value)} rows={2}
                    placeholder={selectedPost.platform === 'linkedin' ? 'Link goes here — never in the post body' : 'Optional'}
                    className="w-full bg-white/[0.05] text-sm text-gm-cream/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none placeholder:text-gm-cream/10" />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" loading={saving} onClick={saveEdit}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-3">
                {/* Caption */}
                {selectedPost.variant?.text && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Caption</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={startEditing}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => copy(selectedPost.variant!.text, 'cap')}>
                          {copied === 'cap' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <pre className="text-sm text-gm-cream/80 whitespace-pre-wrap font-sans leading-relaxed bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                      {selectedPost.variant.text}
                    </pre>
                  </div>
                )}

                {/* Hashtags */}
                {selectedPost.variant?.hashtags && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Hashtags</span>
                      <Button variant="ghost" size="sm" onClick={() => copy(selectedPost.variant!.hashtags!, 'hash')}>
                        {copied === 'hash' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-sm text-gm-sage/60 bg-white/[0.02] rounded p-3 border border-white/[0.05]">
                      {selectedPost.variant.hashtags}
                    </p>
                  </div>
                )}

                {/* First Comment */}
                <div className={`rounded-lg p-3 border ${
                  selectedPost.variant?.firstComment ? 'bg-sky-500/5 border-sky-500/15' :
                  selectedPost.platform === 'linkedin' ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.02] border-white/[0.05]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">First Comment</span>
                    {!selectedPost.variant?.firstComment && <Button variant="ghost" size="sm" onClick={startEditing}>Add</Button>}
                    {selectedPost.variant?.firstComment && (
                      <Button variant="ghost" size="sm" onClick={() => copy(selectedPost.variant!.firstComment!, 'fc')}>
                        {copied === 'fc' ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </div>
                  {selectedPost.variant?.firstComment ? (
                    <p className="text-sm text-gm-cream/70">{selectedPost.variant.firstComment}</p>
                  ) : (
                    <p className="text-xs text-gm-cream/20 italic">
                      {selectedPost.platform === 'linkedin' ? 'Missing — put the link here, not in the post body' : 'No first comment'}
                    </p>
                  )}
                </div>

                {/* Image */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Image</span>
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                      <Button variant="outline" size="sm" loading={analyzing}
                        onClick={() => fileInputRef.current?.click()}>
                        {imagePreview ? 'Change Image' : 'Add Image'}
                      </Button>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/[0.06]">
                      <img src={imagePreview} alt="Post image" className="w-full h-48 object-cover" />
                    </div>
                  )}

                  {analyzing && (
                    <p className="text-xs text-gm-cream/30 animate-pulse">Analyzing image with AI...</p>
                  )}

                  {imageAnalysis && !analyzing && (
                    <div className={`rounded-lg p-3 border ${
                      imageAnalysis.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20' :
                      imageAnalysis.status === 'needs_adjustment' ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-red-500/10 border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          imageAnalysis.status === 'approved' ? 'success' :
                          imageAnalysis.status === 'needs_adjustment' ? 'warning' : 'danger'
                        }>{imageAnalysis.status?.toUpperCase()}</Badge>
                        {imageAnalysis.quality_score && <span className="text-xs text-gm-cream/30">Quality: {imageAnalysis.quality_score}/10</span>}
                        {imageAnalysis.brand_alignment && <span className="text-xs text-gm-cream/30">Brand: {imageAnalysis.brand_alignment}/10</span>}
                      </div>
                      {imageAnalysis.product_identified && (
                        <p className="text-xs text-gm-cream/50 mb-1">Product: {imageAnalysis.product_identified}</p>
                      )}
                      {imageAnalysis.issues?.map((issue: any, i: number) => (
                        <p key={i} className={`text-xs ${issue.severity === 'critical' ? 'text-red-400' : 'text-amber-400/70'}`}>
                          {issue.severity === 'critical' ? '✕' : '△'} {issue.detail}
                        </p>
                      ))}
                      <p className="text-xs text-gm-cream/40 mt-1">{imageAnalysis.summary}</p>
                    </div>
                  )}

                  {!imagePreview && !analyzing && (
                    <p className="text-xs text-gm-cream/15">Upload an image to preview and verify with AI</p>
                  )}
                </div>

                {/* Copy All */}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => {
                    const full = [selectedPost.variant?.text, selectedPost.variant?.hashtags ? `\n.\n.\n.\n${selectedPost.variant.hashtags}` : ''].filter(Boolean).join('')
                    copy(full, 'all')
                  }}>
                    {copied === 'all' ? 'Copied!' : 'Copy All'}
                  </Button>
                </div>

                {/* Approval Actions */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Actions</span>

                  {showReject ? (
                    <div>
                      <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="Reason for rejection..." rows={2}
                        className="w-full bg-white/[0.05] text-sm text-gm-cream/70 rounded p-3 border border-red-500/20 focus:border-red-500/40 focus:outline-none resize-none placeholder:text-gm-cream/10 mb-2" />
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" loading={approving === 'REJECT'}
                          onClick={() => { if (!rejectComment.trim()) { alert('Comment required'); return }; handleApproval('REJECT', rejectComment) }}>
                          Confirm Rejection
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setShowReject(false); setRejectComment('') }}>Cancel</Button>
                      </div>
                    </div>
                  ) : showScheduler ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs uppercase tracking-wider text-gm-cream/40 block mb-1">Date</label>
                            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full bg-white/[0.05] text-xs text-gm-cream/80 rounded-lg px-3 py-2 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none" />
                          </div>
                          <div className="w-24">
                            <label className="text-xs uppercase tracking-wider text-gm-cream/40 block mb-1">Time</label>
                            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                              className="w-full bg-white/[0.05] text-xs text-gm-cream/80 rounded-lg px-3 py-2 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" loading={approving === 'SCHEDULE'} onClick={handleSchedule}>
                            Confirm Schedule
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowScheduler(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {getActions(selectedPost.status).map(({ action, label, variant }) => (
                          <Button key={action} variant={variant} size="sm" loading={approving === action}
                            onClick={() => {
                              if (action === 'DELETE') {
                                if (!confirm('Delete this post?')) return
                                fetch(`/api/posts/${selectedPost.id}`, { method: 'DELETE' })
                                  .then(() => window.location.reload())
                              }
                              else if (action === 'SCHEDULE') {
                                setScheduleDate(selectedPost.date ? selectedPost.date.split('T')[0] : new Date().toISOString().split('T')[0])
                                setScheduleTime(selectedPost.time || '12:00')
                                setShowScheduler(true)
                              }
                              else if (action === 'PUBLISH') handlePublish()
                              else handleApproval(action)
                            }}>
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
