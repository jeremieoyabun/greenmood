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
    <header className="h-16 border-b border-white/[0.06] bg-[#0d180d]/80 backdrop-blur-md flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 w-80 hover:border-white/[0.12] transition-colors focus-within:border-gm-sage/30">
        <Search className="w-4 h-4 text-gm-cream/30" />
        <input
          type="text"
          placeholder="Search posts, campaigns, assets..."
          className="bg-transparent text-sm text-gm-cream placeholder:text-gm-cream/25 focus:outline-none w-full"
        />
        <kbd className="text-xs text-gm-cream/20 bg-white/[0.06] px-2 py-0.5 rounded-md font-mono">⌘K</kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        <button className="relative text-gm-cream/40 hover:text-gm-cream/70 transition-colors p-2 rounded-xl hover:bg-white/[0.04]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gm-sage rounded-full border-2 border-[#0d180d]" />
        </button>

        <div className="flex items-center gap-3 pl-5 border-l border-white/[0.08]">
          <div className="text-right">
            <p className="text-sm text-gm-cream/80 font-medium">{userName}</p>
            <p className="text-xs text-gm-cream/30 capitalize">{userRole.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gm-cream/30 hover:text-gm-cream/60 transition-colors p-2 rounded-xl hover:bg-white/[0.04]"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
