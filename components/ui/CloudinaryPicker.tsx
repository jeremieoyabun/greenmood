'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Search, Clock, Crop } from 'lucide-react'
import { cloudinaryTransformUrl, getPlatformRatios } from '@/lib/image-validation'

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
  defaultFolder?: string
  platform?: string
}

interface FolderTab {
  id: string
  label: string
  icon?: boolean
}

export function CloudinaryPicker({ open, onClose, onSelect, defaultFolder, platform }: CloudinaryPickerProps) {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [folder, setFolder] = useState(defaultFolder || 'recent')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [quickFolders, setQuickFolders] = useState<FolderTab[]>([{ id: 'recent', label: 'Recent', icon: true }])

  // Platform-specific ratio options
  const ratioOptions = platform ? getPlatformRatios(platform) : []
  const [selectedRatio, setSelectedRatio] = useState<number>(0)

  // Reset ratio when platform changes
  useEffect(() => {
    setSelectedRatio(0)
  }, [platform])

  // Fetch folder list dynamically
  useEffect(() => {
    fetch('/api/assets/folders')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const tabs: FolderTab[] = [{ id: 'recent', label: 'Recent', icon: true }]
        for (const folder of d.data) {
          if (folder.id === 'greenmood') continue
          tabs.push({ id: folder.id, label: folder.label })
          if (folder.children) {
            for (const child of folder.children) {
              tabs.push({ id: child.id, label: child.label })
            }
          }
        }
        setQuickFolders(tabs)
      })
      .catch(() => {})
  }, [])

  const fetchAssets = async (folderPath: string, query?: string) => {
    setLoading(true)
    setSelected(null)
    try {
      if (folderPath === 'recent') {
        // Fetch recent uploads across all folders
        const params = new URLSearchParams({ folder: 'greenmood', limit: '60' })
        const res = await fetch(`/api/assets/search?${params}`)
        const data = await res.json()
        if (data.success) {
          // Sort by most recent
          const sorted = (data.data || []).sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setAssets(sorted)
        }
      } else {
        const params = new URLSearchParams({ folder: folderPath, limit: '50' })
        if (query) params.set('q', query)
        const res = await fetch(`/api/assets/search?${params}`)
        const data = await res.json()
        if (data.success) setAssets(data.data || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      setFolder(defaultFolder || 'recent')
      fetchAssets(defaultFolder || 'recent')
    }
  }, [open, defaultFolder])

  useEffect(() => {
    if (open && folder) fetchAssets(folder)
  }, [folder])

  const handleSearch = () => {
    if (search.trim()) fetchAssets('greenmood', search.trim())
    else fetchAssets(folder)
  }

  const getTransformedUrl = (originalUrl: string): string => {
    if (!platform || ratioOptions.length === 0) return originalUrl
    const ratio = ratioOptions[selectedRatio]
    if (!ratio) return originalUrl
    return cloudinaryTransformUrl(originalUrl, ratio.width, ratio.height)
  }

  const handleSelect = () => {
    if (selected) {
      onSelect(getTransformedUrl(selected))
      onClose()
    }
  }

  // Get selected asset info
  const selectedAsset = selected ? assets.find(a => a.url === selected) : null
  const activeRatio = ratioOptions[selectedRatio]

  return (
    <Modal open={open} onClose={onClose} title="Select from Library" size="xl">
      {/* Search */}
      <div className="flex gap-2 mb-4">
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

      {/* Quick folder tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 max-h-[80px] overflow-y-auto">
        {quickFolders.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFolder(f.id); setSearch('') }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              folder === f.id
                ? 'bg-gm-sage/20 text-gm-sage border border-gm-sage/30'
                : 'bg-white/[0.03] text-gm-cream/40 border border-white/[0.06] hover:text-gm-cream/60'
            }`}
          >
            {'icon' in f && f.icon && <Clock className="w-3 h-3" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Platform resize bar */}
      {platform && ratioOptions.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-gm-sage/[0.08] border border-gm-sage/20">
          <Crop className="w-3.5 h-3.5 text-gm-sage/70 shrink-0" />
          <span className="text-xs text-gm-sage/70 font-medium shrink-0">Auto-resize:</span>
          <div className="flex gap-1.5">
            {ratioOptions.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setSelectedRatio(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedRatio === i
                    ? 'bg-gm-sage/30 text-gm-sage border border-gm-sage/40'
                    : 'bg-white/[0.04] text-gm-cream/40 border border-white/[0.06] hover:text-gm-cream/60'
                }`}
              >
                {r.label} ({r.width}x{r.height})
              </button>
            ))}
            <button
              onClick={() => setSelectedRatio(-1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedRatio === -1
                  ? 'bg-white/[0.1] text-gm-cream/70 border border-white/20'
                  : 'bg-white/[0.04] text-gm-cream/30 border border-white/[0.06] hover:text-gm-cream/50'
              }`}
            >
              Original
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-gm-cream/30 text-sm">Loading...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-gm-cream/25 text-sm">No images found</div>
      ) : (
        <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {assets.filter(a => a.format !== 'mp4' && a.format !== 'mov').map((asset) => (
            <div
              key={asset.publicId}
              onClick={() => setSelected(asset.url)}
              className={`rounded-lg overflow-hidden border-2 transition-all cursor-pointer group relative ${
                selected === asset.url
                  ? 'border-gm-sage ring-2 ring-gm-sage/40 scale-[0.97]'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              <div className="aspect-square">
                <img src={asset.url} alt={asset.displayName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{asset.displayName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected info + crop preview + confirm */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        {/* Crop preview when image is selected and platform resize is active */}
        {selectedAsset && platform && activeRatio && selectedRatio !== -1 && (
          <div className="flex gap-4 mb-4">
            <div className="shrink-0">
              <p className="text-[10px] text-gm-cream/30 mb-1.5 uppercase tracking-wider">Original ({selectedAsset.width}x{selectedAsset.height})</p>
              <div className="w-28 rounded-lg overflow-hidden border border-white/[0.08]">
                <img src={selectedAsset.url} alt="Original" className="w-full aspect-square object-cover" />
              </div>
            </div>
            <div className="flex items-center text-gm-cream/20 text-lg shrink-0 self-center mt-4">→</div>
            <div className="shrink-0">
              <p className="text-[10px] text-gm-sage/60 mb-1.5 uppercase tracking-wider">{activeRatio.label} ({activeRatio.width}x{activeRatio.height})</p>
              <div
                className="w-28 rounded-lg overflow-hidden border border-gm-sage/30"
                style={{ aspectRatio: `${activeRatio.width} / ${activeRatio.height}` }}
              >
                <img
                  src={getTransformedUrl(selectedAsset.url)}
                  alt="Resized preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            {selectedAsset && (
              <p className="text-xs text-gm-cream/40">
                {selectedAsset.displayName} — {selectedAsset.width}x{selectedAsset.height} — {selectedAsset.format.toUpperCase()}
                {platform && activeRatio && selectedRatio !== -1 && (
                  <span className="text-gm-sage/60 ml-1">→ {activeRatio.width}x{activeRatio.height}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!selected} onClick={handleSelect}>
              {platform && activeRatio && selectedRatio !== -1 ? 'Resize & Use' : 'Use This Image'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
