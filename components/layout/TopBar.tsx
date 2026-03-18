'use client'

import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut } from 'lucide-react'

interface TopBarProps {
  userName: string
  userRole: string
}

export function TopBar({ userName, userRole }: TopBarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-white/[0.06] bg-gm-dark/60 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 w-72">
        <Search className="w-3.5 h-3.5 text-gm-cream/30" />
        <input
          type="text"
          placeholder="Search posts, campaigns, assets..."
          className="bg-transparent text-xs text-gm-cream placeholder:text-gm-cream/25 focus:outline-none w-full"
        />
        <kbd className="text-[9px] text-gm-cream/20 bg-white/[0.05] px-1.5 py-0.5 rounded">⌘K</kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative text-gm-cream/40 hover:text-gm-cream/70 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gm-sage rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
          <div className="text-right">
            <p className="text-[11px] text-gm-cream/70 font-medium">{userName}</p>
            <p className="text-[9px] text-gm-cream/25">{userRole.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gm-cream/25 hover:text-gm-cream/60 transition-colors p-1"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
