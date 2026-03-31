'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Search } from 'lucide-react'

interface CloudinaryAsset {
  url: string
  publicId: string
  displayName: string
  width: number
  height: number
  format: string
  bytes: number
  folder: string
}

interface CloudinaryPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

const QUICK_FOLDERS = [
  { id: 'greenmood', label: 'All' },
  { id: 'greenmood/products', label: 'Products' },
  { id: 'greenmood/products/pouf', label: 'Pouf' },
  { id: 'greenmood/products/pouf/mario-pouf', label: 'Mario Pouf' },
  { id: 'greenmood/products/green-walls', label: 'Green Walls' },
  { id: 'greenmood/products/g-circle', label: 'G-Circle' },
  { id: 'greenmood/products/cascade', label: 'Cascade' },
  { id: 'greenmood/products/hoverlight', label: 'Hoverlight' },
  { id: 'greenmood/products/modulor', label: 'Modulor' },
  { id: 'greenmood/projects', label: 'Projects' },
  { id: 'greenmood/social/instagram', label: 'Instagram' },
  { id: 'greenmood/textures', label: 'Textures' },
  { id: 'greenmood/showrooms', label: 'Showrooms' },
  { id: 'greenmood/factory', label: 'Factory' },
]

export function CloudinaryPicker({ open, onClose, onSelect }: CloudinaryPickerProps) {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [folder, setFolder] = useState('greenmood')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const fetchAssets = async (folderPath: string, query?: string) => {
    setLoading(true)
    setSelected(null)
    try {
      const params = new URLSearchParams({ folder: folderPath, limit: '50' })
      if (query) params.set('q', query)
      const res = await fetch(`/api/assets/search?${params}`)
      const data = await res.json()
      if (data.success) setAssets(data.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    if (open) fetchAssets(folder)
  }, [open, folder])

  const handleSearch = () => {
    if (search.trim()) fetchAssets(folder, search.trim())
    else fetchAssets(folder)
  }

  const handleSelect = () => {
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Select from Library" size="xl">
      {/* Search + Folders */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gm-cream/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by tag, product..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {/* Quick folder tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {QUICK_FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFolder(f.id); setSearch('') }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              folder === f.id
                ? 'bg-gm-sage/20 text-gm-sage border border-gm-sage/30'
                : 'bg-white/[0.03] text-gm-cream/40 border border-white/[0.06] hover:text-gm-cream/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-gm-cream/30 text-sm">Loading...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-gm-cream/25 text-sm">No images in this folder</div>
      ) : (
        <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {assets.filter(a => a.format !== 'mp4' && a.format !== 'mov').map((asset) => (
            <button
              key={asset.publicId}
              onClick={() => setSelected(asset.url)}
              className={`rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                selected === asset.url
                  ? 'border-gm-sage ring-2 ring-gm-sage/40 scale-[0.97]'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              <img src={asset.url} alt={asset.displayName} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Selected info + confirm */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
        <div>
          {selected && (
            <p className="text-xs text-gm-cream/40">
              {assets.find(a => a.url === selected)?.displayName || 'Selected'}
              {' - '}
              {assets.find(a => a.url === selected)?.width}x{assets.find(a => a.url === selected)?.height}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!selected} onClick={handleSelect}>
            Use This Image
          </Button>
        </div>
      </div>
    </Modal>
  )
}
