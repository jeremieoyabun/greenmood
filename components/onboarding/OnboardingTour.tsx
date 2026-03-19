'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface TourStep {
  title: string
  description: string
  tip?: string
  page: string // which page to navigate to
  highlight?: string // element description to look for
  arrow?: 'left' | 'right' | 'top' | 'bottom'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Greenmood Marketing OS',
    description: 'Your AI-powered marketing command center. Let me show you around.',
    page: '/',
  },
  {
    title: 'Dashboard',
    description: 'Your daily overview. See pending approvals, scheduled posts, intelligence signals, and today\'s actions at a glance.',
    tip: 'Check this every morning — the AI agents populate it overnight.',
    page: '/',
    highlight: 'dashboard-metrics',
    arrow: 'top',
  },
  {
    title: 'Editorial Calendar',
    description: 'Your content planning hub. See all posts across every market and platform. Month view, week view, or agenda.',
    tip: 'Drag posts between days to reschedule. Green glow = scheduled. Grey = published.',
    page: '/calendar',
    highlight: 'calendar-grid',
    arrow: 'top',
  },
  {
    title: 'Create a Post',
    description: 'Click any day or "Add Slot" to create content. Choose market, platform, write your caption, add image.',
    tip: 'Select "Stories" for the slide-by-slide editor with text overlay per slide.',
    page: '/calendar',
    highlight: 'add-slot-button',
    arrow: 'right',
  },
  {
    title: 'Post Detail & Editing',
    description: 'Click any post in the calendar to open the detail view. Edit caption, change image, adjust schedule, duplicate to other markets.',
    tip: 'The First Comment is editable inline — click "Edit" next to it. Essential for LinkedIn links.',
    page: '/calendar',
    highlight: 'post-detail',
  },
  {
    title: 'Approval Workflow',
    description: 'Every post follows a pipeline: AI Generated → Fact-Checked → Brand Approved → Scheduled → Published. Action buttons are at the top of each post.',
    tip: 'Posts ready to publish appear with a green border in the calendar.',
    page: '/approvals',
    highlight: 'approval-queue',
    arrow: 'left',
  },
  {
    title: 'Intelligence Hub',
    description: 'AI monitors the biophilic design market daily — competitor moves, trends, opportunities. Click "+ Create Posts" on any signal to turn it into content.',
    tip: 'New signals every morning at 7h. Great for content inspiration.',
    page: '/intelligence',
    highlight: 'signals-feed',
    arrow: 'top',
  },
  {
    title: 'Knowledge Base',
    description: '200+ verified facts about Greenmood products, certifications, projects, and brand rules. The AI uses this to generate accurate content.',
    tip: 'Everything the AI writes is grounded in this data. No invented facts.',
    page: '/knowledge-base',
    highlight: 'kb-entries',
  },
  {
    title: 'AI Agents Work For You',
    description: 'Every morning, autonomous AI agents propose posts, fact-check them, adapt for multiple platforms, and monitor comments. You just review and approve.',
    tip: 'Go to Agent Control Center to see all 11 agents and trigger them manually.',
    page: '/agent-runs',
    highlight: 'agent-panel',
  },
  {
    title: 'You\'re Ready!',
    description: 'Start by checking today\'s calendar, reviewing proposed posts in Approvals, and browsing Intelligence signals for inspiration. The AI handles the rest.',
    tip: 'Click the "?" button at the bottom right to restart this tour anytime.',
    page: '/',
  },
]

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const seen = localStorage.getItem('gm-onboarding-seen')
    if (!seen) {
      setTimeout(() => setActive(true), 1500)
    } else {
      setDismissed(true)
    }
  }, [])

  const navigateToStep = (stepIndex: number) => {
    const targetPage = TOUR_STEPS[stepIndex].page
    if (pathname !== targetPage) {
      router.push(targetPage)
    }
    setStep(stepIndex)
  }

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      navigateToStep(step + 1)
    } else {
      complete()
    }
  }

  const back = () => {
    if (step > 0) {
      navigateToStep(step - 1)
    }
  }

  const complete = () => {
    setActive(false)
    setDismissed(true)
    localStorage.setItem('gm-onboarding-seen', 'true')
  }

  const restart = () => {
    setStep(0)
    setActive(true)
    setDismissed(false)
    localStorage.removeItem('gm-onboarding-seen')
    router.push('/')
  }

  if (!active) {
    return dismissed ? (
      <button
        onClick={restart}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gm-sage text-gm-dark flex items-center justify-center text-lg font-bold shadow-lg shadow-gm-sage/30 hover:shadow-xl hover:shadow-gm-sage/40 transition-all hover:scale-105"
        title="Restart tour"
      >
        ?
      </button>
    ) : null
  }

  const currentStep = TOUR_STEPS[step]

  // Position the card based on arrow direction
  const cardPosition = currentStep.arrow === 'left'
    ? 'left-72 top-1/3'
    : currentStep.arrow === 'right'
    ? 'right-8 top-24'
    : currentStep.arrow === 'top'
    ? 'left-1/2 -translate-x-1/2 top-24'
    : currentStep.arrow === 'bottom'
    ? 'left-1/2 -translate-x-1/2 bottom-24'
    : 'left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Semi-transparent overlay — click-through except on card */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto" onClick={complete} />

      {/* Arrow indicator */}
      {currentStep.arrow && (
        <div className={`absolute pointer-events-none ${
          currentStep.arrow === 'left' ? 'left-64 top-1/3 mt-12' :
          currentStep.arrow === 'right' ? 'right-[420px] top-28' :
          currentStep.arrow === 'top' ? 'left-1/2 -translate-x-1/2 top-16' :
          'left-1/2 -translate-x-1/2 bottom-32'
        }`}>
          <div className={`text-gm-sage text-4xl animate-bounce ${
            currentStep.arrow === 'left' ? 'rotate-180' :
            currentStep.arrow === 'right' ? '' :
            currentStep.arrow === 'top' ? 'rotate-90' :
            '-rotate-90'
          }`}>
            →
          </div>
        </div>
      )}

      {/* Tour card */}
      <div className={`absolute ${cardPosition} pointer-events-auto`}>
        <div className="bg-[#0f1a0f] border border-gm-sage/20 rounded-2xl shadow-2xl shadow-black/50 w-[400px] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-white/[0.05]">
            <div
              className="h-full bg-gm-sage transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gm-sage/20 flex items-center justify-center text-xs font-bold text-gm-sage">{step + 1}</span>
                <span className="text-xs text-gm-cream/30">of {TOUR_STEPS.length}</span>
              </div>
              <button onClick={complete} className="text-xs text-gm-cream/30 hover:text-gm-cream/60 transition-colors">
                Skip tour ×
              </button>
            </div>

            {/* Content */}
            <h2 className="text-lg font-bold text-gm-cream mb-2 tracking-tight">{currentStep.title}</h2>
            <p className="text-sm text-gm-cream/60 leading-relaxed mb-4">{currentStep.description}</p>

            {/* Tip */}
            {currentStep.tip && (
              <div className="bg-gm-sage/10 border border-gm-sage/15 rounded-xl p-3 mb-5">
                <p className="text-xs text-gm-sage/80 leading-relaxed">
                  <span className="font-bold text-gm-sage">Pro tip:</span> {currentStep.tip}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={back}>← Back</Button>
              )}
              <Button variant="primary" size="md" onClick={next} className="flex-1">
                {step === TOUR_STEPS.length - 1 ? 'Get Started →' : 'Next →'}
              </Button>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigateToStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-gm-sage w-4' : i < step ? 'bg-gm-sage/40' : 'bg-white/[0.1]'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
