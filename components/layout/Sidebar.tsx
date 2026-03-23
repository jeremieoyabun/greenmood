'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, PenTool, Image, CheckCircle,
  Database, Radar, BarChart3, Megaphone, Bot, Settings,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Calendar, PenTool, Image, CheckCircle,
  Database, Radar, BarChart3, Megaphone, Bot, Settings,
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
  { href: '/calendar', label: 'Calendar', icon: 'Calendar', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/composer', label: 'Composer', icon: 'PenTool', roles: ['OPERATOR'] },
  { href: '/assets', label: 'Assets', icon: 'Image', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/approvals', label: 'Approvals', icon: 'CheckCircle', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: 'Database', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/intelligence', label: 'Intelligence', icon: 'Radar', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
  { href: '/ads', label: 'Ads', icon: 'Megaphone', roles: ['OPERATOR'] },
  { href: '/agent-runs', label: 'Agent Runs', icon: 'Bot', roles: ['OPERATOR'] },
  { href: '/settings', label: 'Settings', icon: 'Settings', roles: ['OPERATOR', 'COORDINATOR'] },
]

interface SidebarProps {
  userRole: string
  userName: string
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0a140a] border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gm-sage/20 flex items-center justify-center shadow-inner">
            <span className="text-gm-sage text-base font-bold">G</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gm-cream tracking-tight">Greenmood</h1>
            <p className="text-xs text-gm-cream/35 font-medium">Marketing OS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gm-sage/20 text-gm-sage shadow-sm shadow-gm-sage/10 border border-gm-sage/25'
                  : 'text-gm-cream/50 hover:text-gm-cream/90 hover:bg-white/[0.06]'
              )}
            >
              {Icon && <Icon className={cn('w-[18px] h-[18px]', isActive ? 'text-gm-sage' : '')} />}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gm-copper/20 border border-gm-copper/20 flex items-center justify-center">
            <span className="text-xs text-gm-copper font-semibold">
              {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gm-cream/80 font-medium truncate">{userName}</p>
            <p className="text-xs text-gm-cream/30">{userRole === 'OPERATOR' ? 'Admin' : userRole === 'COORDINATOR' ? 'Coordinator' : 'Viewer'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
