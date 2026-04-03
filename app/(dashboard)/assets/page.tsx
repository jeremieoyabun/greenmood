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
  displayName?: string
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

interface FolderNode {
  id: string
  label: string
  children?: FolderNode[]
}

const FOLDER_TREE: FolderNode[] = [
  { id: 'greenmood', label: 'All Assets' },
  { id: 'greenmood/products', label: 'Design Collection', children: [
    { id: 'greenmood/products/angled-pillars', label: 'Angled Pillars' },
    { id: 'greenmood/products/belt', label: 'Belt' },
    { id: 'greenmood/products/cascade', label: 'Cascade' },
    { id: 'greenmood/products/cork-tiles', label: 'Cork Tiles' },
    { id: 'greenmood/products/cruz-planters', label: 'Cruz Planters' },
    { id: 'greenmood/products/framed', label: 'Framed' },
    { id: 'greenmood/products/g-circle', label: 'G-Circle' },
    { id: 'greenmood/products/g-divider', label: 'G-Divider' },
    { id: 'greenmood/products/g-screens', label: 'G-Screens' },
    { id: 'greenmood/products/hoverlight', label: 'Hoverlight' },
    { id: 'greenmood/products/hyphen', label: 'Hyphen' },
    { id: 'greenmood/products/mario', label: 'Mario (All)' },
    { id: 'greenmood/products/pouf/mario-pouf/expanded-cork', label: 'Mario - Expanded Cork' },
    { id: 'greenmood/products/pouf/mario-pouf/compressed-cork', label: 'Mario - Compressed Cork' },
    { id: 'greenmood/products/pouf/mario-pouf/sneaker-white', label: 'Mario - Sneaker White' },
    { id: 'greenmood/products/pouf/mario-pouf/sneaker-black', label: 'Mario - Sneaker Black' },
    { id: 'greenmood/products/modulor', label: 'Modulor' },
    { id: 'greenmood/products/modulor-cork', label: 'Modulor Cork' },
    { id: 'greenmood/products/moony', label: 'Moony' },
    { id: 'greenmood/products/moss-frames', label: 'Moss Frames' },
    { id: 'greenmood/products/origami', label: 'Origami' },
    { id: 'greenmood/products/perspective-lines', label: 'Perspective Lines' },
    { id: 'greenmood/products/pillars', label: 'Pillars' },
    { id: 'greenmood/products/planters', label: 'Planters' },
    { id: 'greenmood/products/pouf', label: 'Pouf (All)' },
    { id: 'greenmood/products/rings', label: 'Rings' },
    { id: 'greenmood/products/tail', label: 'Tails' },
    { id: 'greenmood/products/terra', label: 'Terra' },
    { id: 'greenmood/products/green-walls', label: 'Green Walls' },
    { id: 'greenmood/products/ball-moss', label: 'Ball Moss' },
    { id: 'greenmood/products/semi-natural-trees', label: 'Semi-natural Trees' },
    { id: 'greenmood/products/custom-logos', label: 'Custom Logos' },
    { id: 'greenmood/products/sample-box', label: 'Sample Box' },
  ]},
  { id: 'greenmood/projects', label: 'Projects', children: [
    { id: 'greenmood/projects/cloud-ix-budapest', label: 'Cloud IX Budapest' },
    { id: 'greenmood/projects/uc-davis', label: 'UC Davis' },
    { id: 'greenmood/projects/loreal-paris', label: "L'Oreal Paris" },
    { id: 'greenmood/projects/ap-rooftop-nj', label: 'AP Rooftop NJ' },
    { id: 'greenmood/projects/ci3-yorkshire', label: 'Ci3 Yorkshire' },
    { id: 'greenmood/projects/jll-brussels', label: 'JLL Brussels' },
    { id: 'greenmood/projects/athora-brussels', label: 'Athora Brussels' },
    { id: 'greenmood/projects/saltire-edinburgh', label: 'Saltire Court Edinburgh' },
  ]},
  { id: 'greenmood/factory', label: 'Factory / Craft' },
  { id: 'greenmood/events', label: 'Events', children: [
    { id: 'greenmood/events/neocon', label: 'NeoCon' },
    { id: 'greenmood/events/workspace-expo', label: 'Workspace Expo' },
    { id: 'greenmood/events/icff-2024', label: 'ICFF 2024' },
  ]},
  { id: 'greenmood/team', label: 'Team' },
  { id: 'greenmood/showrooms', label: 'Showrooms' },
  { id: 'greenmood/social', label: 'Social Media', children: [
    { id: 'greenmood/social/instagram', label: 'Instagram' },
    { id: 'greenmood/social/stories', label: 'Stories' },
    { id: 'greenmood/social/linkedin', label: 'LinkedIn' },
  ]},
  { id: 'greenmood/textures', label: 'Textures' },
  { id: 'greenmood/press-kit', label: 'Press Kit' },
]

// Flatten for upload dropdown (recursive)
function flattenFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap(f => f.children ? [f, ...flattenFolders(f.children)] : [f])
}
const ALL_FOLDERS = flattenFolders(FOLDER_TREE).filter(f => f.id !== 'greenmood')

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

      {/* Layout: Sidebar + Grid */}
      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="w-56 shrink-0">
          <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-3 sticky top-24">
            <p className="text-xs uppercase tracking-wider text-gm-cream/30 font-semibold mb-3 px-2">Folders</p>
            <nav className="space-y-0.5">
              {FOLDER_TREE.map(folder => (
                <div key={folder.id}>
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedFolder === folder.id
                        ? 'bg-gm-sage/15 text-gm-sage font-medium'
                        : 'text-gm-cream/50 hover:text-gm-cream/80 hover:bg-white/[0.03]'
                    }`}
                  >
                    {folder.children ? '📁' : '📄'} {folder.label}
                  </button>
                  {folder.children && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {folder.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedFolder(child.id)}
                          className={`w-full text-left px-3 py-1 rounded-lg text-xs transition-all ${
                            selectedFolder === child.id
                              ? 'bg-gm-sage/15 text-gm-sage font-medium'
                              : 'text-gm-cream/35 hover:text-gm-cream/60 hover:bg-white/[0.02]'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Search bar */}
          <div className="flex gap-2 mb-5">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by tag, product, project..."
              className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30"
            />
            <Button variant="secondary" onClick={handleSearch}>Search</Button>
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
                <p className="text-xs text-gm-cream/70 truncate font-medium">
                  {asset.displayName || asset.context?.originalName || asset.publicId.split('/').pop()?.replace(/[_-]/g, ' ')}
                </p>
                <p className="text-[10px] text-gm-cream/30 truncate mt-0.5">
                  {asset.width}x{asset.height} · {asset.format.toUpperCase()} · {asset.bytes < 1048576 ? `${(asset.bytes / 1024).toFixed(0)}KB` : `${(asset.bytes / 1048576).toFixed(1)}MB`}
                </p>
                {asset.tags.filter(t => !t.startsWith('post:')).length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {asset.tags.filter(t => !t.startsWith('post:')).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gm-sage/10 text-gm-sage/60">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Modal */}
        </div>{/* end main content */}
      </div>{/* end flex layout */}

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
              {ALL_FOLDERS.map(f => (
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
