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

  const handleImageUpload = async (file: File) => {
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Analyze
    setAnalyzing(true)
    setImageAnalysis(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedPost?.id) formData.append('postId', selectedPost.id)
      const res = await fetch('/api/assets/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) setImageAnalysis(data.data)
      else setImageAnalysis({ status: 'error', summary: data.error })
    } catch {
      setImageAnalysis({ status: 'error', summary: 'Analysis failed' })
    }
    setAnalyzing(false)
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
      case 'AI_GENERATED': return [
        { action: 'APPROVE', label: 'Mark as Fact-Checked', variant: 'primary' as const },
        { action: 'REJECT', label: 'Reject', variant: 'danger' as const },
      ]
      case 'FACT_CHECKED': return [
        { action: 'APPROVE', label: 'Brand Approve', variant: 'primary' as const },
        { action: 'REJECT', label: 'Reject', variant: 'danger' as const },
      ]
      case 'BRAND_APPROVED': return [
        { action: 'APPROVE', label: 'Ready to Schedule', variant: 'primary' as const },
        { action: 'REJECT', label: 'Reject', variant: 'danger' as const },
      ]
      case 'READY_TO_SCHEDULE': return [
        { action: 'APPROVE', label: 'Mark Scheduled', variant: 'primary' as const },
      ]
      case 'SCHEDULED': return [
        { action: 'APPROVE', label: 'Mark Published', variant: 'primary' as const },
      ]
      case 'REJECTED': return [
        { action: 'APPROVE', label: 'Back to Draft', variant: 'secondary' as const },
      ]
      default: return []
    }
  }

  return (
    <div className="flex gap-4">
      {/* Post List */}
      <div className="w-1/2 space-y-2">
        {posts.length === 0 ? (
          <Card>
            <EmptyState title="No pending approvals" description="Generate content in the Composer to start the workflow." />
          </Card>
        ) : (
          posts.map((post) => {
            const config = POST_STATUS_CONFIG[post.status as keyof typeof POST_STATUS_CONFIG]
            const isSelected = selectedPost?.id === post.id
            return (
              <Card
                key={post.id}
                hover
                className={`cursor-pointer transition-all ${isSelected ? 'ring-1 ring-gm-sage/30 bg-white/[0.03]' : ''}`}
                onClick={() => { setSelectedPost(post); setEditing(false); setShowReject(false); setImagePreview(null); setImageAnalysis(null) }}
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
                  <span className="text-[10px] text-gm-cream/50">
                    {MARKETS[post.market]?.emoji} {MARKETS[post.market]?.name} — {post.platform}
                  </span>
                  {post.date && (
                    <span className="text-[9px] text-gm-cream/25">
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {post.variant && (
                  <p className="text-[10px] text-gm-cream/50 line-clamp-2">{post.variant.text}</p>
                )}
                {post.lastStep?.comment && (
                  <p className="text-[9px] text-amber-400/50 mt-1 italic">&quot;{post.lastStep.comment}&quot;</p>
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
                    <span className="text-[9px] text-gm-cream/40 flex-1">
                      {step.fromStatus} → {step.toStatus}
                      {step.post && ` — ${MARKETS[step.post.market]?.emoji || ''} ${step.post.platform}`}
                    </span>
                    <Badge variant={step.action === 'APPROVE' ? 'success' : 'danger'} size="sm">{step.action}</Badge>
                    <span className="text-[8px] text-gm-cream/15">{new Date(step.createdAt).toLocaleDateString()}</span>
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
            <p className="text-xs text-gm-cream/20">Select a post to preview and review</p>
          </Card>
        ) : (
          <Card>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-lg">{MARKETS[selectedPost.market]?.emoji}</span>
              <span className="text-sm font-medium text-gm-cream">{MARKETS[selectedPost.market]?.name}</span>
              <Badge variant="default">{selectedPost.platform}</Badge>
              <StatusDot status={selectedPost.status} />
              <span className="text-[10px] text-gm-cream/30 ml-auto">
                {selectedPost.date && new Date(selectedPost.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {selectedPost.time || ''}
              </span>
            </div>

            {editing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Caption</label>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6}
                    className="w-full bg-white/[0.05] text-sm text-gm-cream/90 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none font-sans leading-relaxed" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Hashtags</label>
                  <textarea value={editHashtags} onChange={(e) => setEditHashtags(e.target.value)} rows={2}
                    className="w-full bg-white/[0.05] text-xs text-gm-sage/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">
                    First Comment {selectedPost.platform === 'linkedin' && <Badge variant="warning" size="sm" className="ml-1">Required</Badge>}
                  </label>
                  <textarea value={editFirstComment} onChange={(e) => setEditFirstComment(e.target.value)} rows={2}
                    placeholder={selectedPost.platform === 'linkedin' ? 'Link goes here — never in the post body' : 'Optional'}
                    className="w-full bg-white/[0.05] text-xs text-gm-cream/70 rounded-lg p-3 border border-white/[0.1] focus:border-gm-sage/40 focus:outline-none resize-none placeholder:text-gm-cream/10" />
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
                      <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Caption</span>
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
                      <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Hashtags</span>
                      <Button variant="ghost" size="sm" onClick={() => copy(selectedPost.variant!.hashtags!, 'hash')}>
                        {copied === 'hash' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs text-gm-sage/60 bg-white/[0.02] rounded p-3 border border-white/[0.05]">
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
                    <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">First Comment</span>
                    {!selectedPost.variant?.firstComment && <Button variant="ghost" size="sm" onClick={startEditing}>Add</Button>}
                    {selectedPost.variant?.firstComment && (
                      <Button variant="ghost" size="sm" onClick={() => copy(selectedPost.variant!.firstComment!, 'fc')}>
                        {copied === 'fc' ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </div>
                  {selectedPost.variant?.firstComment ? (
                    <p className="text-xs text-gm-cream/70">{selectedPost.variant.firstComment}</p>
                  ) : (
                    <p className="text-[10px] text-gm-cream/20 italic">
                      {selectedPost.platform === 'linkedin' ? 'Missing — put the link here, not in the post body' : 'No first comment'}
                    </p>
                  )}
                </div>

                {/* Image */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">Image</span>
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
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
                    <p className="text-[10px] text-gm-cream/30 animate-pulse">Analyzing image with AI...</p>
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
                        {imageAnalysis.quality_score && <span className="text-[9px] text-gm-cream/30">Quality: {imageAnalysis.quality_score}/10</span>}
                        {imageAnalysis.brand_alignment && <span className="text-[9px] text-gm-cream/30">Brand: {imageAnalysis.brand_alignment}/10</span>}
                      </div>
                      {imageAnalysis.product_identified && (
                        <p className="text-[10px] text-gm-cream/50 mb-1">Product: {imageAnalysis.product_identified}</p>
                      )}
                      {imageAnalysis.issues?.map((issue: any, i: number) => (
                        <p key={i} className={`text-[9px] ${issue.severity === 'critical' ? 'text-red-400' : 'text-amber-400/70'}`}>
                          {issue.severity === 'critical' ? '✕' : '△'} {issue.detail}
                        </p>
                      ))}
                      <p className="text-[10px] text-gm-cream/40 mt-1">{imageAnalysis.summary}</p>
                    </div>
                  )}

                  {!imagePreview && !analyzing && (
                    <p className="text-[9px] text-gm-cream/15">Upload an image to preview and verify with AI</p>
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
                  <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Actions</span>

                  {showReject ? (
                    <div>
                      <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="Reason for rejection..." rows={2}
                        className="w-full bg-white/[0.05] text-xs text-gm-cream/70 rounded p-3 border border-red-500/20 focus:border-red-500/40 focus:outline-none resize-none placeholder:text-gm-cream/10 mb-2" />
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" loading={approving === 'REJECT'}
                          onClick={() => { if (!rejectComment.trim()) { alert('Comment required'); return }; handleApproval('REJECT', rejectComment) }}>
                          Confirm Rejection
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setShowReject(false); setRejectComment('') }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getActions(selectedPost.status).map(({ action, label, variant }) => (
                        <Button key={action} variant={variant} size="sm" loading={approving === action}
                          onClick={() => action === 'REJECT' ? setShowReject(true) : handleApproval(action)}>
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
