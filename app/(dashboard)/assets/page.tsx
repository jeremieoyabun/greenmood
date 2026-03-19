'use client'

import { useState, useEffect, useRef } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

interface Asset {
  url: string
  publicId: string
  width: number
  height: number
  format: string
  tags: string[]
  createdAt: string
}

const FOLDERS = [
  { id: 'greenmood/products/ball-moss', label: 'Ball Moss' },
  { id: 'greenmood/products/cork-tiles', label: 'Cork Tiles' },
  { id: 'greenmood/products/g-circle', label: 'G-Circle' },
  { id: 'greenmood/products/cascade', label: 'Cascade' },
  { id: 'greenmood/products/hoverlight', label: 'Hoverlight' },
  { id: 'greenmood/products/modulor', label: 'Modulor' },
  { id: 'greenmood/products/framed', label: 'Framed' },
  { id: 'greenmood/products/perspective-lines', label: 'Perspective Lines' },
  { id: 'greenmood/products/rings', label: 'Rings' },
  { id: 'greenmood/products/green-walls', label: 'Green Walls' },
  { id: 'greenmood/projects', label: 'Projects' },
  { id: 'greenmood/factory', label: 'Factory / Craft' },
  { id: 'greenmood/events', label: 'Events' },
  { id: 'greenmood/team', label: 'Team' },
  { id: 'greenmood/showrooms', label: 'Showrooms' },
  { id: 'greenmood/textures', label: 'Textures' },
  { id: 'greenmood/social', label: 'Social Media' },
]

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [selectedFolder, setSelectedFolder] = useState('greenmood/')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFolder, setUploadFolder] = useState('greenmood/products/ball-moss')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (selectedFolder && selectedFolder !== 'greenmood/') params.set('folder', selectedFolder)
      params.set('limit', '50')
      const res = await fetch(`/api/assets/search?${params}`)
      const data = await res.json()
      if (data.success) setAssets(data.data || [])
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { fetchAssets() }, [selectedFolder])

  const handleSearch = () => { fetchAssets() }

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    setUploadTotal(files.length)
    setUploadCount(0)

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', uploadFolder)
        await fetch('/api/assets/upload', { method: 'POST', body: formData })
        setUploadCount(prev => prev + 1)
      } catch { /* continue */ }
    }

    setUploading(false)
    setShowUpload(false)
    fetchAssets()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  return (
    <>
      <PageHeader
        title="Asset Library"
        description={`${assets.length} assets in Cloudinary`}
        actions={
          <Button onClick={() => setShowUpload(true)}>Upload Assets</Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 flex gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by tag, product, project..."
            className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30"
          />
          <Button variant="secondary" onClick={handleSearch}>Search</Button>
        </div>

        {/* Folder filter */}
        <select
          value={selectedFolder}
          onChange={e => setSelectedFolder(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream focus:outline-none [&>option]:bg-[#0f1a0f] [&>option]:text-gm-cream"
        >
          <option value="greenmood/">All Assets</option>
          {FOLDERS.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="text-center py-20 text-gm-cream/30">Loading assets...</div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-16">
              <p className="text-lg text-gm-cream/40 mb-2">No assets found</p>
              <p className="text-sm text-gm-cream/25 mb-6">Upload your first images or change the folder filter</p>
              <Button onClick={() => setShowUpload(true)}>Upload Assets</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {assets.map(asset => (
            <div
              key={asset.publicId}
              onClick={() => setSelectedAsset(asset)}
              className="cursor-pointer group rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all hover:shadow-lg"
            >
              <div className="aspect-square bg-black/20 relative overflow-hidden">
                {asset.format === 'mp4' || asset.format === 'mov' ? (
                  <video src={asset.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={asset.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
              </div>
              <div className="p-2.5 bg-white/[0.02]">
                <p className="text-xs text-gm-cream/50 truncate">{asset.publicId.split('/').pop()}</p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {asset.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gm-sage/10 text-gm-sage/60">{tag}</span>
                  ))}
                  {asset.tags.length > 3 && (
                    <span className="text-[10px] text-gm-cream/20">+{asset.tags.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Modal */}
      <Modal open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title="Asset Detail" size="lg">
        {selectedAsset && (
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden bg-black/20">
              {selectedAsset.format === 'mp4' || selectedAsset.format === 'mov' ? (
                <video src={selectedAsset.url} className="w-full" controls />
              ) : (
                <img src={selectedAsset.url} alt="" className="w-full" />
              )}
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">File</span>
                <p className="text-sm text-gm-cream/80">{selectedAsset.publicId.split('/').pop()}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Dimensions</span>
                <p className="text-sm text-gm-cream/80">{selectedAsset.width} x {selectedAsset.height}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Format</span>
                <p className="text-sm text-gm-cream/80">{selectedAsset.format.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-1">Folder</span>
                <p className="text-sm text-gm-cream/80">{selectedAsset.publicId.split('/').slice(0, -1).join('/')}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAsset.tags.map(tag => (
                    <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                  ))}
                  {selectedAsset.tags.length === 0 && (
                    <span className="text-xs text-gm-cream/25 italic">No tags yet</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">URL</span>
                <div className="flex gap-2">
                  <input value={selectedAsset.url} readOnly className="flex-1 px-3 py-2 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-gm-cream/50" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(selectedAsset.url) }}>Copy</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Assets" size="md">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gm-cream/70 block mb-3">Destination Folder</label>
            <select
              value={uploadFolder}
              onChange={e => setUploadFolder(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream focus:outline-none [&>option]:bg-[#0f1a0f] [&>option]:text-gm-cream"
            >
              {FOLDERS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleUpload(e.target.files) }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-white/[0.1] hover:border-gm-sage/30 transition-all p-12 flex flex-col items-center gap-3 cursor-pointer hover:bg-white/[0.02] disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <div className="text-2xl animate-spin">↻</div>
                  <span className="text-sm text-gm-cream/50">Uploading {uploadCount}/{uploadTotal}...</span>
                  <div className="w-48 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gm-sage transition-all" style={{ width: `${(uploadCount / uploadTotal) * 100}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-4xl opacity-20">+</span>
                  <span className="text-sm text-gm-cream/40">Click to select images and videos</span>
                  <span className="text-xs text-gm-cream/20">You can select multiple files. AI will auto-tag them.</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gm-cream/25 text-center">
            Files are uploaded to Cloudinary with automatic AI tagging. Supported: JPG, PNG, WebP, MP4, MOV.
          </p>
        </div>
      </Modal>
    </>
  )
}
