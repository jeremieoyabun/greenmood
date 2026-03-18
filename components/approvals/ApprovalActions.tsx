'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface ApprovalActionsProps {
  postId: string
  currentStatus: string
}

export function ApprovalActions({ postId, currentStatus }: ApprovalActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState('')
  const router = useRouter()

  const handleAction = async (action: string, actionComment?: string) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/posts/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: actionComment || undefined,
          reviewerId: 'user-jeremie',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowReject(false)
        setComment('')
        // Force full page reload to reflect server-side changes
        window.location.reload()
      } else {
        alert('Action failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Action failed: ' + (err instanceof Error ? err.message : 'Network error'))
    }
    setLoading(null)
  }

  const actions: { action: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'outline' }[] = []
  switch (currentStatus) {
    case 'AI_GENERATED':
      actions.push({ action: 'APPROVE', label: 'Fact-Check', variant: 'primary' })
      actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger' })
      break
    case 'FACT_CHECKED':
      actions.push({ action: 'APPROVE', label: 'Brand Approve', variant: 'primary' })
      actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger' })
      break
    case 'BRAND_APPROVED':
      actions.push({ action: 'APPROVE', label: 'Ready to Schedule', variant: 'primary' })
      actions.push({ action: 'REJECT', label: 'Reject', variant: 'danger' })
      break
    case 'READY_TO_SCHEDULE':
      actions.push({ action: 'APPROVE', label: 'Scheduled', variant: 'primary' })
      break
    case 'SCHEDULED':
      actions.push({ action: 'APPROVE', label: 'Published', variant: 'primary' })
      break
    case 'REJECTED':
      actions.push({ action: 'APPROVE', label: 'Back to Draft', variant: 'secondary' })
      break
  }

  if (actions.length === 0) return null

  return (
    <div>
      {showReject ? (
        <div className="flex items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason..."
            className="flex-1 bg-white/[0.05] text-xs text-gm-cream/70 rounded px-3 py-1.5 border border-red-500/20 focus:border-red-500/40 focus:outline-none placeholder:text-gm-cream/15"
          />
          <Button
            variant="danger"
            size="sm"
            loading={loading === 'REJECT'}
            onClick={() => {
              if (!comment.trim()) { alert('Comment required'); return }
              handleAction('REJECT', comment)
            }}
          >
            Reject
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowReject(false); setComment('') }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          {actions.map(({ action, label, variant }) => (
            <Button
              key={action}
              variant={variant}
              size="sm"
              loading={loading === action}
              onClick={() => {
                if (action === 'REJECT') setShowReject(true)
                else handleAction(action)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
