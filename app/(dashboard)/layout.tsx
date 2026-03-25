import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { I18nProvider } from '@/lib/i18n'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <I18nProvider>
      <div className="min-h-screen bg-[#0d180d]">
        <Sidebar userRole={user.role} userName={user.name} />
        <div className="ml-60">
          <TopBar userName={user.name} userRole={user.role} />
          <main className="p-6">{children}</main>
          <OnboardingTour />
        </div>
      </div>
    </I18nProvider>
  )
}
