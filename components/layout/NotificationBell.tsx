'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle2, CalendarCheck, Send, MessageCircle, BellRing, Pin } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string, link?: string | null) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    if (link) window.location.href = link
  }

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return t.notifications.now
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.floor(mins / 60)}h`
    return `${Math.floor(mins / 1440)}d`
  }

  const typeIcon = (type: string) => {
    const cls = 'w-4 h-4'
    switch (type) {
      case 'post_approved': return <CheckCircle2 className={`${cls} text-emerald-400`} />
      case 'post_scheduled': return <CalendarCheck className={`${cls} text-indigo-400`} />
      case 'post_published': return <Send className={`${cls} text-sky-400`} />
      case 'comment': return <MessageCircle className={`${cls} text-amber-400`} />
      case 'system': return <BellRing className={`${cls} text-gm-sage`} />
      default: return <Pin className={`${cls} text-gm-cream/40`} />
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
      >
        <Bell className="w-5 h-5 text-gm-cream/50" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a2a1a] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-gm-cream">{t.notifications.title}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-gm-sage hover:text-gm-sage/80">
                {t.notifications.markAllRead}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gm-cream/30">{t.notifications.noNotifications}</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id, n.link)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                    !n.is_read ? 'bg-gm-sage/[0.05]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!n.is_read ? 'font-semibold text-gm-cream' : 'text-gm-cream/60'}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-gm-cream/20 ml-auto whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.message && (
                        <p className="text-xs text-gm-cream/40 truncate mt-0.5">{n.message}</p>
                      )}
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-gm-sage mt-1.5 shrink-0" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
