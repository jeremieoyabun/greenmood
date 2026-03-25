'use client'

import { useRouter } from 'next/navigation'
import { Search, LogOut } from 'lucide-react'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

interface TopBarProps {
  userName: string
  userRole: string
}

export function TopBar({ userName, userRole }: TopBarProps) {
  const router = useRouter()
  const { t } = useI18n()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-white/[0.10] bg-[#0d180d]/80 backdrop-blur-md flex items-center justify-between px-8">
      {/* Search */}
      <div className="flex items-center gap-3 bg-white border border-white/20 rounded-xl px-4 py-2 w-80 shadow-sm transition-all focus-within:ring-2 focus-within:ring-gm-sage/60 focus-within:border-gm-sage/60">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t.common.search}
          className="bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none w-full"
        />
        <kbd className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-mono">⌘K</kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        <LanguageSwitcher />
        <NotificationBell />

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
