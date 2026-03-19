'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface SignalActionsProps {
  signalId: string
  title: string
  summary: string
  whyItMatters: string
  recommendedAction: string
  recommendedFormat?: string | null
  recommendedChannel?: string | null
  sourceUrl?: string | null
  country?: string | null
}

export function SignalActions({
  signalId, title, summary, whyItMatters,
  recommendedAction, recommendedFormat, recommendedChannel,
  sourceUrl, country,
}: SignalActionsProps) {
  const [generating, setGenerating] = useState(false)
  const [showPosts, setShowPosts] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [saving, setSaving] = useState<number | null>(null)

  const generatePosts = async () => {
    setGenerating(true)
    setPosts([])
    try {
      const res = await fetch('/api/intelligence/generate-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signalId,
          title,
          summary,
          whyItMatters,
          recommendedAction,
          recommendedFormat,
          recommendedChannel,
          country,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts(data.data.posts)
        setShowPosts(true)
      } else {
        alert('Generation failed: ' + data.error)
      }
    } catch {
      alert('Generation failed')
    }
    setGenerating(false)
  }

  const savePost = async (index: number) => {
    const post = posts[index]
    if (!post) return
    setSaving(index)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: post.platform === 'linkedin' ? '09:00' : '12:00',
          market: post.market || 'hq',
          platform: post.platform || 'instagram',
          text: post.caption,
          hashtags: post.hashtags || null,
          firstComment: post.firstComment || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.map((p, i) => i === index ? { ...p, saved: true } : p))
      } else {
        alert('Save failed: ' + data.error)
      }
    } catch { alert('Save failed') }
    setSaving(null)
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-gm-cream/50 hover:text-gm-cream/80 transition-colors"
          >
            View source
          </a>
        )}
        <button
          onClick={generatePosts}
          disabled={generating}
          className="text-sm font-semibold px-4 py-2 bg-gm-sage hover:bg-gm-sage/80 rounded-lg text-gm-dark shadow-md shadow-gm-sage/20 hover:shadow-lg hover:shadow-gm-sage/30 transition-all disabled:opacity-40 disabled:shadow-none"
        >
          {generating ? 'Generating...' : '+ Create Posts'}
        </button>
      </div>

      <Modal open={showPosts} onClose={() => setShowPosts(false)} title="Generated Post Proposals" size="lg">
        <p className="text-xs text-gm-cream/40 mb-4">
          Based on: <span className="text-gm-cream/60">{title}</span>
        </p>
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300">
                  {post.platform === 'linkedin' ? 'LinkedIn' : `IG ${(post.market || 'BE').toUpperCase()}`}
                </span>
                <span className="text-xs text-gm-cream/30">{post.format || 'post'}</span>
                {post.saved && <span className="text-xs text-emerald-400 ml-auto">Saved to calendar</span>}
              </div>

              <div className="mb-3">
                <p className="text-sm text-gm-cream/80 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
              </div>

              {post.hashtags && (
                <p className="text-xs text-gm-cream/30 mb-3">{post.hashtags}</p>
              )}

              {post.firstComment && (
                <div className="bg-white/[0.02] rounded p-2 mb-3 border border-white/[0.04]">
                  <p className="text-xs text-gm-cream/40">
                    <span className="text-gm-cream/60 font-medium">First comment: </span>
                    {post.firstComment}
                  </p>
                </div>
              )}

              {post.visualDirection && (
                <p className="text-xs text-gm-sage/50 mb-3">Visual: {post.visualDirection}</p>
              )}

              {!post.saved && (
                <Button
                  size="sm"
                  loading={saving === i}
                  onClick={() => savePost(i)}
                >
                  Add to Calendar
                </Button>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
