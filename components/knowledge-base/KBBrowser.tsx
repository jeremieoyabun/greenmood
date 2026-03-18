'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { KBEntryForm } from './KBEntryForm'

interface KBEntry {
  id: string
  category: string
  key: string
  value: string
  source: string | null
  createdAt: string
  updatedAt: string
}

const CATEGORY_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'; description: string }> = {
  PRODUCT_FACT: { label: 'Product Facts', variant: 'success', description: 'Verified product specs, materials, dimensions' },
  BRAND_RULE: { label: 'Brand Rules', variant: 'info', description: 'Tone, formatting, and content rules' },
  MARKET_TONE: { label: 'Market Tones', variant: 'purple', description: 'Regional voice and positioning guidance' },
  PLATFORM_RULE: { label: 'Platform Rules', variant: 'warning', description: 'Platform-specific formatting rules' },
  APPROVED_CLAIM: { label: 'Approved Claims', variant: 'success', description: 'Claims verified and safe to use' },
  RESTRICTED_CLAIM: { label: 'Restricted Claims', variant: 'danger', description: 'Claims that must NOT be used' },
  RESOURCE_LINK: { label: 'Resource Links', variant: 'info', description: 'Links to brand assets and documentation' },
  COLOR_PALETTE: { label: 'Colors', variant: 'default', description: 'Brand color definitions' },
}

interface KBBrowserProps {
  entries: KBEntry[]
  categoryCounts: Record<string, number>
}

export function KBBrowser({ entries, categoryCounts }: KBBrowserProps) {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const tabs = useMemo(() => [
    { id: 'ALL', label: 'All', count: entries.length },
    ...Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({
      id,
      label: config.label,
      count: categoryCounts[id] || 0,
    })),
  ], [entries.length, categoryCounts])

  const filtered = useMemo(() => {
    let result = entries
    if (activeCategory !== 'ALL') {
      result = result.filter(e => e.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.key.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q)
      )
    }
    return result
  }, [entries, activeCategory, search])

  return (
    <div className="space-y-4">
      {/* Category Stats */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([catId, config]) => (
          <button
            key={catId}
            onClick={() => setActiveCategory(catId === activeCategory ? 'ALL' : catId)}
            className={`text-left rounded-xl p-4 border transition-all duration-150 ${
              activeCategory === catId
                ? 'bg-gm-sage/10 border-gm-sage/30'
                : 'bg-white/[0.035] border-white/[0.08] hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <Badge variant={config.variant} size="sm">{config.label}</Badge>
              <span className="text-lg font-semibold text-gm-cream">{categoryCounts[catId] || 0}</span>
            </div>
            <p className="text-[10px] text-gm-cream/30">{config.description}</p>
          </button>
        ))}
      </div>

      {/* Search + Tabs + Add */}
      <div className="flex items-center gap-4">
        <Button size="sm" onClick={() => setShowAddForm(true)}>Add Entry</Button>
        <div className="flex-1">
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs
          tabs={tabs.slice(0, 5)}
          activeTab={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-center text-sm text-gm-cream/40 py-8">No entries found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((entry) => {
            const config = CATEGORY_CONFIG[entry.category]
            return (
              <Card key={entry.id}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={config?.variant || 'default'} size="sm">
                        {config?.label || entry.category}
                      </Badge>
                      <span className="text-xs font-mono text-gm-cream/40">{entry.key}</span>
                      {entry.source && (
                        <span className="text-[9px] text-gm-cream/20 ml-auto">{entry.source}</span>
                      )}
                    </div>
                    <p className="text-sm text-gm-cream/80 leading-relaxed">{entry.value}</p>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <p className="text-[10px] text-gm-cream/20 text-center pt-2">
        {filtered.length} of {entries.length} entries shown
      </p>

      <KBEntryForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
