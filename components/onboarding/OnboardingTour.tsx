'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface TourStep {
  title: string
  description: string
  tip?: string
  page: string
  selector?: string // CSS selector to highlight
  cardPosition?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Greenmood Marketing OS',
    description: 'Your AI-powered marketing command center. Let me show you the key features in 60 seconds.',
    page: '/',
    cardPosition: 'center',
  },
  {
    title: 'Sidebar Navigation',
    description: 'Access all modules from here: Calendar, Composer, Assets, Approvals, Intelligence, Analytics, and Settings.',
    tip: 'The green dot next to a menu item means there are pending actions.',
    page: '/',
    selector: 'nav',
    cardPosition: 'bottom-right',
  },
  {
    title: 'Dashboard Overview',
    description: 'Your daily command center. Pending approvals, scheduled posts, intelligence signals, and quick actions at a glance.',
    tip: 'Check this every morning. The AI agents populate it overnight with new content proposals.',
    page: '/',
    selector: '.grid.grid-cols-5',
    cardPosition: 'bottom-left',
  },
  {
    title: 'Editorial Calendar',
    description: 'Your content planning hub. See all posts across every market and platform in month, week, or agenda view.',
    tip: 'Drag and drop posts between days to reschedule instantly.',
    page: '/calendar',
    selector: '.grid.grid-cols-7',
    cardPosition: 'bottom-right',
  },
  {
    title: 'Post Detail',
    description: 'Click any post in the calendar to open it. Edit the caption, hashtags, first comment, change the image, adjust the schedule, or duplicate to another market.',
    tip: 'For LinkedIn, the link goes in the First Comment (not in the post body). The platform reminds you.',
    page: '/calendar',
    cardPosition: 'center',
  },
  {
    title: 'Approval Workflow',
    description: 'Three simple actions for every post: Approve, Approve & Schedule, or Delete. Posts ready to publish appear with a green glow in the calendar.',
    page: '/approvals',
    selector: '.space-y-2',
    cardPosition: 'bottom-right',
  },
  {
    title: 'Asset Library',
    description: 'Your cloud media library powered by Cloudinary. Upload photos and videos, organized by product and project. AI auto-detects Greenmood products and tags them.',
    tip: 'The more assets you upload, the better the AI can suggest visuals for your posts.',
    page: '/assets',
    cardPosition: 'center',
  },
  {
    title: 'Intelligence Hub',
    description: 'Daily market signals about biophilic design trends, competitor moves, and content opportunities. Click "Create Posts" on any signal to turn it into content.',
    tip: 'New signals every morning at 7h. Great for content inspiration.',
    page: '/intelligence',
    cardPosition: 'center',
  },
  {
    title: 'AI Content Composer',
    description: 'Write a brief like "Mario Pouf sustainable cork seating" and the AI generates post proposals for multiple platforms and markets, grounded in Greenmood product data.',
    page: '/composer',
    cardPosition: 'center',
  },
  {
    title: 'You\'re all set!',
    description: 'Start by checking today\'s calendar, reviewing posts in Approvals, and uploading your best photos to the Asset Library. The AI agents handle the rest.',
    tip: 'Click the "?" button at the bottom right to restart this tour anytime.',
    page: '/',
    cardPosition: 'center',
  },
]

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [highlight, setHighlight] = useState<DOMRect | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const highlightTimeout = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    const seen = localStorage.getItem('gm-onboarding-seen')
    if (!seen) {
      setTimeout(() => setActive(true), 1500)
    } else {
      setDismissed(true)
    }
  }, [])

  // Find and highlight the target element
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateHighlight = useCallback(() => {
    const currentStep = TOUR_STEPS[step]
    if (!currentStep?.selector) {
      setHighlight(null)
      return
    }
    // Delay to let page render after navigation
    highlightTimeout.current = setTimeout(() => {
      const el = document.querySelector(currentStep.selector!)
      if (el) {
        const rect = el.getBoundingClientRect()
        setHighlight(rect)
      } else {
        setHighlight(null)
      }
    }, 500)
  }, [step])

  useEffect(() => {
    if (active) updateHighlight()
    return () => { if (highlightTimeout.current) clearTimeout(highlightTimeout.current) }
  }, [active, step, pathname, updateHighlight])

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
    if (step > 0) navigateToStep(step - 1)
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
  const isCenter = !highlight || currentStep.cardPosition === 'center'
  const pad = 12

  // Calculate card position relative to highlighted element
  const getCardStyle = (): React.CSSProperties => {
    if (isCenter) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    const h = highlight!
    const pos = currentStep.cardPosition || 'bottom-right'
    switch (pos) {
      case 'bottom-right':
        return { top: h.bottom + pad + 12, left: Math.min(h.left, window.innerWidth - 440) }
      case 'bottom-left':
        return { top: h.bottom + pad + 12, left: Math.max(h.left - 400, 20) }
      case 'top-right':
        return { bottom: window.innerHeight - h.top + pad + 12, left: h.left }
      case 'top-left':
        return { bottom: window.innerHeight - h.top + pad + 12, right: window.innerWidth - h.right }
      default:
        return { top: h.bottom + pad + 12, left: h.left }
    }
  }

  // Arrow pointing from card to highlighted element
  const getArrowStyle = (): React.CSSProperties | null => {
    if (isCenter || !highlight) return null
    const h = highlight
    const pos = currentStep.cardPosition || 'bottom-right'
    if (pos === 'bottom-right' || pos === 'bottom-left') {
      return {
        position: 'absolute' as const,
        top: h.bottom + pad,
        left: h.left + h.width / 2,
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: '8px solid #A8C49A',
        transform: 'translateX(-50%)',
      }
    }
    return null
  }

  const arrowStyle = getArrowStyle()

  return (
    <div className="fixed inset-0 z-[100]">
      {/* SVG overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={complete}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left - pad}
                y={highlight.top - pad}
                width={highlight.width + pad * 2}
                height={highlight.height + pad * 2}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#spotlight-mask)"
        />
        {/* Highlight border */}
        {highlight && (
          <rect
            x={highlight.left - pad}
            y={highlight.top - pad}
            width={highlight.width + pad * 2}
            height={highlight.height + pad * 2}
            rx="16"
            fill="none"
            stroke="#A8C49A"
            strokeWidth="2"
            strokeDasharray="6 3"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Arrow */}
      {arrowStyle && <div style={arrowStyle} className="pointer-events-none" />}

      {/* Tour card */}
      <div
        className="absolute pointer-events-auto"
        style={getCardStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 w-[420px] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100">
            <div
              className="h-full bg-gm-sage transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gm-sage/20 flex items-center justify-center text-sm font-bold text-gm-sage">{step + 1}</span>
                <span className="text-sm text-gray-400">of {TOUR_STEPS.length}</span>
              </div>
              <button onClick={complete} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Skip tour
              </button>
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">{currentStep.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{currentStep.description}</p>

            {/* Tip */}
            {currentStep.tip && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
                <p className="text-sm text-green-800 leading-relaxed">
                  <span className="font-semibold">Tip:</span> {currentStep.tip}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={back} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  Back
                </button>
              )}
              <button onClick={next} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gm-sage hover:bg-gm-sage/90 rounded-xl transition-colors shadow-sm">
                {step === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigateToStep(i)}
                  className={`h-2 rounded-full transition-all ${i === step ? 'bg-gm-sage w-5' : i < step ? 'bg-gm-sage/40 w-2' : 'bg-gray-200 w-2'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
