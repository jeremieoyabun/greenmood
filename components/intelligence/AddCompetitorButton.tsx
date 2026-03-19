'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

export function AddCompetitorButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; signals?: number; error?: string } | null>(null)

  const handleCreate = async () => {
    if (!name.trim() || !website.trim()) return
    setCreating(true)
    setResult(null)
    try {
      const res = await fetch('/api/intelligence/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`,
          country: country.trim() || 'Global',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: true, signals: data.data.signalsGenerated })
        setTimeout(() => {
          setOpen(false)
          setName('')
          setWebsite('')
          setCountry('')
          setResult(null)
          window.location.reload()
        }, 2000)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch {
      setResult({ success: false, error: 'Request failed' })
    }
    setCreating(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ Add Competitor</Button>

      <Modal open={open} onClose={() => { if (!creating) { setOpen(false); setResult(null) } }} title="Add Competitor" size="sm">
        <div className="space-y-4">
          <Input
            label="Company Name"
            placeholder="e.g. MOSS UK, Nordgröna..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Website"
            placeholder="e.g. moss.co.uk"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <Input
            label="Country"
            placeholder="e.g. UK, Sweden, Global..."
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          {result && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {result.success
                ? `Competitor added. AI generated ${result.signals} intelligence signals.`
                : result.error
              }
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !website.trim()}
            loading={creating}
            className="w-full"
          >
            {creating ? 'Scanning competitor...' : 'Add & Scan'}
          </Button>

          {creating && (
            <p className="text-[10px] text-gm-cream/30 text-center animate-pulse">
              AI is analyzing this competitor and generating intelligence signals...
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
