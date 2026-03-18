'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'

const CATEGORIES = [
  { value: 'PRODUCT_FACT', label: 'Product Fact' },
  { value: 'APPROVED_CLAIM', label: 'Approved Claim' },
  { value: 'RESTRICTED_CLAIM', label: 'Restricted Claim' },
  { value: 'BRAND_RULE', label: 'Brand Rule' },
  { value: 'MARKET_TONE', label: 'Market Tone' },
  { value: 'PLATFORM_RULE', label: 'Platform Rule' },
  { value: 'RESOURCE_LINK', label: 'Resource Link' },
  { value: 'COLOR_PALETTE', label: 'Color Palette' },
]

interface KBEntryFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function KBEntryForm({ open, onClose, onSaved }: KBEntryFormProps) {
  const [category, setCategory] = useState('PRODUCT_FACT')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [source, setSource] = useState('manual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!key.trim() || !value.trim()) {
      setError('Key and value are required')
      return
    }
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, key: key.trim(), value: value.trim(), source }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setKey('')
      setValue('')
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Knowledge Base Entry" size="md">
      <div className="space-y-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={CATEGORIES}
        />
        <Input
          label="Key"
          placeholder="unique_identifier (snake_case)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Textarea
          label="Value"
          placeholder="The content of this entry. Be precise and factual..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[120px]"
        />
        <Input
          label="Source"
          placeholder="Where this info comes from"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Entry</Button>
        </div>
      </div>
    </Modal>
  )
}
