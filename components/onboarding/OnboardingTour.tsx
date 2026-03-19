'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface TourStep {
  target: string // CSS selector or description
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  tip?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'sidebar',
    title: 'Welcome to Greenmood Marketing OS',
    description: 'This is your marketing command center. Everything you need to manage Greenmood\'s content across all markets and platforms.',
    position: 'center',
    tip: 'Use the sidebar to navigate between modules.',
  },
  {
    target: 'calendar',
    title: 'Editorial Calendar',
    description: 'See all your scheduled posts across every market and platform. Drag posts between days, click to edit, and track status at a glance.',
    position: 'center',
    tip: 'Green glow = scheduled and ready to publish. Grey = already published.',
  },
  {
    target: 'create-post',
    title: 'Create Posts',
    description: 'Click any day or use "Add Slot" to create a new post. Choose your market, platform, add your caption, image, and hashtags.',
    position: 'center',
    tip: 'Select "Stories" as platform for the slide-by-slide story editor.',
  },
  {
    target: 'approvals',
    title: 'Approval Workflow',
    description: 'Every post goes through a validation pipeline: AI Generated → Fact-Checked → Brand Approved → Scheduled → Published.',
    position: 'center',
    tip: 'You can fast-track posts by clicking the action buttons directly in the calendar post detail.',
  },
  {
    target: 'duplicate',
    title: 'Duplicate & Cross-post',
    description: 'Found a great post on @greenmood.be? Click "Duplicate to..." to copy it to UAE, US, UK, or any other market with one click.',
    position: 'center',
    tip: 'Duplicated posts start as Draft so you can adapt the caption and hashtags for the local market.',
  },
  {
    target: 'first-comment',
    title: 'First Comment',
    description: 'For LinkedIn: NEVER put links in the post body (kills reach). Use the First Comment field instead. The system posts it automatically after publishing.',
    position: 'center',
    tip: 'The platform warns you if a LinkedIn post is missing its first comment.',
  },
  {
    target: 'image-check',
    title: 'AI Image Analysis',
    description: 'Upload an image on any post and the AI will verify: correct product, right dimensions, brand quality, and suggest improvements.',
    position: 'center',
    tip: 'Always use real project photos from Nextcloud first. Pomelli AI images as backup.',
  },
  {
    target: 'auto-publish',
    title: 'Auto-Publishing',
    description: 'Once a post is Scheduled with a date and time, it publishes automatically to the right Instagram or LinkedIn account. No manual posting needed.',
    position: 'center',
    tip: 'The system checks every 5 minutes and publishes posts whose time has arrived.',
  },
  {
    target: 'intelligence',
    title: 'Intelligence Hub',
    description: 'AI agents monitor the biophilic design market daily — competitor moves, industry trends, content opportunities. Click "Create Posts" on any signal to turn it into content.',
    position: 'center',
    tip: 'New signals appear every morning at 7h. Check them for content inspiration.',
  },
  {
    target: 'agents',
    title: 'AI Agents Work For You',
    description: 'Every morning at 8h, AI agents propose 2-3 posts, fact-check them, and adapt them for multiple platforms. You just review and approve.',
    position: 'center',
    tip: 'Go to Agent Control Center to see all agents and trigger them manually.',
  },
]

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('gm-onboarding-seen')
    if (!seen) {
      setTimeout(() => setActive(true), 1500)
    } else {
      setDismissed(true)
    }
  }, [])

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      complete()
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
  }

  if (!active) {
    return dismissed ? (
      <button
        onClick={restart}
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-gm-sage/20 hover:bg-gm-sage/30 flex items-center justify-center text-gm-sage transition-all shadow-lg"
        title="Restart tour"
      >
        ?
      </button>
    ) : null
  }

  const currentStep = TOUR_STEPS[step]

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={complete} />

      {/* Tour card */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="bg-[#0f1a0f] border border-white/[0.1] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-white/[0.05]">
            <div
              className="h-full bg-gm-sage transition-all duration-500"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gm-cream/30 font-medium">{step + 1} / {TOUR_STEPS.length}</span>
              <button onClick={complete} className="text-xs text-gm-cream/30 hover:text-gm-cream/60 transition-colors">
                Skip tour
              </button>
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-gm-cream mb-3">{currentStep.title}</h2>
            <p className="text-sm text-gm-cream/60 leading-relaxed mb-4">{currentStep.description}</p>

            {/* Tip */}
            {currentStep.tip && (
              <div className="bg-gm-sage/10 border border-gm-sage/20 rounded-xl p-3 mb-6">
                <p className="text-sm text-gm-sage/80">
                  <span className="font-semibold text-gm-sage">Tip:</span> {currentStep.tip}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button variant="primary" size="md" onClick={next} className="flex-1">
                {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
