'use client'

import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/StatusDot'
import { MARKETS } from '@/lib/constants'
import { useState, useRef } from 'react'

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
    variants: { text: string; hashtags: string | null; firstComment: string | null; notes: string | null; timing: string | null }[]
  } | null
}

interface PostDetailModalProps {
  slot: PostDetail | null
  open: boolean
  onClose: () => void
}

export function PostDetailModal({ slot, open, onClose }: PostDetailModalProps) {
  const [copied, setCopied] = useState('')
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <Modal open={open} onClose={onClose} title="Post Detail" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg">{market?.emoji}</span>
          <span className="text-sm font-medium text-gm-cream">{market?.name}</span>
          <Badge variant="default">{slot.platform}</Badge>
          {meta.type && <Badge variant="info">{meta.type}</Badge>}
          {pillar && <Badge variant={pillar.color as any}>{pillar.label}</Badge>}
          <StatusDot status={slot.post?.status || slot.status} />
          <span className="text-[10px] text-gm-cream/30 ml-auto">
            {slot.date?.split('T')[0]} {slot.time || ''}
          </span>
        </div>

        {slot.campaign && (
          <p className="text-[10px] text-gm-sage/50">Campaign: {slot.campaign.title}</p>
        )}

        {/* Caption */}
        {postText && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold">
                {slot.platform === 'stories' ? 'Story Slides' : 'Caption'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => copy(postText, 'caption')}>
                {copied === 'caption' ? 'Copied!' : 'Copy'}
              </Button>
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

        {/* First Comment — CRITICAL for LinkedIn */}
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
            {firstComment && (
              <Button variant="ghost" size="sm" onClick={() => copy(firstComment, 'fc')}>
                {copied === 'fc' ? 'Copied!' : 'Copy'}
              </Button>
            )}
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

        {/* Visual Direction */}
        {meta.visualDirection && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Visual Direction</span>
            <p className="text-xs text-gm-cream/50 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
              {meta.visualDirection}
            </p>
          </div>
        )}

        {/* Pomelli Prompt */}
        {meta.pomelliPrompt && (
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
        {meta.storiesSlides && meta.storiesSlides.length > 0 && (
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

        {/* Production Notes */}
        {meta.productionNotes && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Notes</span>
            <p className="text-xs text-gm-cream/40">{meta.productionNotes}</p>
          </div>
        )}

        {/* Image Check */}
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
              <Button
                variant="outline"
                size="sm"
                loading={analyzing}
                onClick={() => fileInputRef.current?.click()}
              >
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

        {/* Copy All Button */}
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
      </div>
    </Modal>
  )
}
