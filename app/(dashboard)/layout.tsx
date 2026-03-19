import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0d180d]">
      <Sidebar userRole={user.role} userName={user.name} />
      <div className="ml-60">
        <TopBar userName={user.name} userRole={user.role} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
