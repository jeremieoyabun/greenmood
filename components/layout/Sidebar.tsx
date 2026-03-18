'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, PenTool, Image, CheckCircle,
  Database, Radar, BarChart3, Bot, Settings,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Calendar, PenTool, Image, CheckCircle,
  Database, Radar, BarChart3, Bot, Settings,
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
  { href: '/calendar', label: 'Calendar', icon: 'Calendar', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/composer', label: 'Composer', icon: 'PenTool', roles: ['OPERATOR'] },
  { href: '/assets', label: 'Assets', icon: 'Image', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/approvals', label: 'Approvals', icon: 'CheckCircle', roles: ['OPERATOR', 'COORDINATOR'] },
  { href: '/knowledge-base', label: 'Knowledge Base', icon: 'Database', roles: ['OPERATOR'] },
  { href: '/intelligence', label: 'Intelligence', icon: 'Radar', roles: ['OPERATOR'] },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['OPERATOR', 'COORDINATOR', 'VIEWER'] },
  { href: '/agent-runs', label: 'Agent Runs', icon: 'Bot', roles: ['OPERATOR'] },
  { href: '/settings', label: 'Settings', icon: 'Settings', roles: ['OPERATOR'] },
]

interface SidebarProps {
  userRole: string
  userName: string
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-gm-dark/80 border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gm-sage/20 flex items-center justify-center">
            <span className="text-gm-sage text-sm font-bold">G</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gm-cream tracking-tight">Greenmood</h1>
            <p className="text-[10px] text-gm-cream/40 font-medium">Marketing OS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-gm-sage/15 text-gm-sage'
                  : 'text-gm-cream/50 hover:text-gm-cream/80 hover:bg-white/[0.03]'
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — User info */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gm-copper/30 flex items-center justify-center">
            <span className="text-[10px] text-gm-copper font-semibold">
              {userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gm-cream/70 font-medium truncate">{userName}</p>
            <p className="text-[9px] text-gm-cream/30">{userRole.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
