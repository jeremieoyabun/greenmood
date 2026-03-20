'use client'
import { useState, useEffect, useRef } from 'react'

interface MediaItem {
  id: string
  url: string
  media_type: string
  sort_order: number
}

interface CarouselEditorProps {
  postId: string
  onUpdate?: () => void
}

export function CarouselEditor({ postId, onUpdate }: CarouselEditorProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchMedia = async () => {
    const res = await fetch(`/api/posts/${postId}/media`)
    const data = await res.json()
    if (data.success) setMedia(data.data || [])
  }

  useEffect(() => { fetchMedia() }, [postId])

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      await fetch(`/api/posts/${postId}/media`, { method: 'POST', body: form })
    }
    await fetchMedia()
    setUploading(false)
    onUpdate?.()
  }

  const handleDelete = async (mediaId: string) => {
    await fetch(`/api/posts/${postId}/media?mediaId=${mediaId}`, { method: 'DELETE' })
    await fetchMedia()
    onUpdate?.()
  }

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) return
    const reordered = [...media]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(dropIdx, 0, moved)
    setMedia(reordered)
    setDragIdx(null)

    await fetch(`/api/posts/${postId}/media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds: reordered.map(m => m.id) }),
    })
    onUpdate?.()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gm-cream/60">Carousel slides</span>
        <span className="text-xs text-gm-cream/30">{media.length} images</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      <div className="flex gap-2 flex-wrap items-center">
        {media.map((item, idx) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
              dragIdx === idx ? 'opacity-40 border-gm-sage' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <span className="absolute top-1 left-1 text-[10px] font-bold text-white bg-black/60 rounded px-1.5 py-0.5 z-10">
              {idx + 1}
            </span>
            <button
              onClick={() => handleDelete(item.id)}
              className="absolute top-1 right-1 text-[10px] text-white bg-red-500/80 rounded-full w-5 h-5 flex items-center justify-center z-10 hover:bg-red-500 transition-colors"
            >
              x
            </button>
            {item.media_type === 'video' ? (
              <video src={item.url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={item.url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
            )}
          </div>
        ))}

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 rounded-lg border-2 border-dashed border-white/10 hover:border-gm-sage/40 flex flex-col items-center justify-center gap-1 transition-colors"
        >
          {uploading ? (
            <span className="text-xs text-gm-cream/40 animate-pulse">Uploading...</span>
          ) : (
            <>
              <span className="text-2xl text-gm-cream/20">+</span>
              <span className="text-[10px] text-gm-cream/20">Add slides</span>
            </>
          )}
        </button>
      </div>

      {media.length >= 2 && (
        <p className="text-xs text-gm-sage/60 mt-2">Drag to reorder slides.</p>
      )}
    </div>
  )
}
