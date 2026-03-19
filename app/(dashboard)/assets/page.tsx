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
  bytes: number
  tags: string[]
  createdAt: string
  resourceType?: string
  context?: Record<string, string>
}

function AssetDetailModal({ asset, onClose, onDelete, onTagsUpdate }: {
  asset: Asset | null
  onClose: () => void
  onDelete: (publicId: string) => Promise<void>
  onTagsUpdate: (publicId: string, tags: string[]) => Promise<void>
}) {
  const [editingTags, setEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [savingTags, setSavingTags] = useState(false)

  useEffect(() => {
    if (asset) {
      setTags(asset.tags || [])
      setTagInput((asset.tags || []).join(', '))
      setEditingTags(false)
    }
  }, [asset?.publicId])

  if (!asset) return null

  const filename = asset.publicId.split('/').pop() || ''
  const folder = asset.publicId.split('/').slice(0, -1).join('/')
  const isVideo = asset.format === 'mp4' || asset.format === 'mov' || asset.format === 'webm'
  const sizeStr = asset.bytes ? (asset.bytes < 1048576 ? `${(asset.bytes / 1024).toFixed(0)}KB` : `${(asset.bytes / 1048576).toFixed(1)}MB`) : ''

  return (
    <Modal open={true} onClose={onClose} title="" size="xl">
      <div className="grid grid-cols-5 gap-8">
        {/* Left — Preview */}
        <div className="col-span-3 rounded-xl overflow-hidden bg-black/30 flex items-center justify-center">
          {isVideo ? (
            <video src={asset.url} className="w-full max-h-[70vh] object-contain" controls />
          ) : (
            <img src={asset.url} alt={filename} className="w-full max-h-[70vh] object-contain" />
          )}
        </div>

        {/* Right — Info */}
        <div className="col-span-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gm-cream mb-1">{filename}</h3>
            <p className="text-sm text-gm-cream/40">{folder}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gm-cream">{asset.width}</p>
              <p className="text-xs text-gm-cream/30">Width</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gm-cream">{asset.height}</p>
              <p className="text-xs text-gm-cream/30">Height</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gm-cream">{sizeStr}</p>
              <p className="text-xs text-gm-cream/30">Size</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold">Tags</span>
              <Button variant="ghost" size="sm" onClick={() => setEditingTags(!editingTags)}>
                {editingTags ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            {editingTags ? (
              <div className="space-y-2">
                <textarea
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="moss, ball-moss, office, green-wall..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/15 focus:outline-none focus:ring-1 focus:ring-gm-sage/30 resize-none"
                />
                <Button variant="primary" size="sm" loading={savingTags} onClick={async () => {
                  setSavingTags(true)
                  const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
                  await onTagsUpdate(asset.publicId, newTags)
                  setTags(newTags)
                  setEditingTags(false)
                  setSavingTags(false)
                }}>Save Tags</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.length > 0 ? tags.map(tag => (
                  <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                )) : (
                  <span className="text-xs text-gm-cream/25 italic">No tags. Click Edit to add.</span>
                )}
              </div>
            )}
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-semibold block mb-2">URL</span>
            <div className="flex gap-2">
              <input value={asset.url} readOnly className="flex-1 px-3 py-2 text-xs bg-white/[0.04] border border-white/[0.06] rounded-lg text-gm-cream/40 truncate" />
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(asset.url)}>Copy</Button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex gap-2">
            <Button variant="danger" size="sm" loading={deleting} onClick={async () => {
              if (!confirm('Delete this asset permanently?')) return
              setDeleting(true)
              await onDelete(asset.publicId)
            }}>Delete Asset</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
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
      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onDelete={async (publicId) => {
          await fetch('/api/assets/search', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId }),
          })
          setSelectedAsset(null)
          fetchAssets()
        }}
        onTagsUpdate={async (publicId, tags) => {
          await fetch('/api/assets/search', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId, tags }),
          })
          fetchAssets()
        }}
      />

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
