'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'

const OBJECTIVES = [
  { value: 'LEAD_GENERATION', label: 'Lead Generation', desc: 'Collect leads via forms' },
  { value: 'LINK_CLICKS', label: 'Traffic', desc: 'Drive traffic to your website' },
  { value: 'POST_ENGAGEMENT', label: 'Engagement', desc: 'Boost post engagement' },
  { value: 'BRAND_AWARENESS', label: 'Brand Awareness', desc: 'Increase brand visibility' },
]

const COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function CreateCampaignModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('LEAD_GENERATION')
  const [dailyBudget, setDailyBudget] = useState(25)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')

  // Step 2
  const [countries, setCountries] = useState<string[]>(['US'])
  const [ageMin, setAgeMin] = useState(28)
  const [ageMax, setAgeMax] = useState(55)
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')

  // Step 3
  const [headlines, setHeadlines] = useState<string[]>(['', '', ''])
  const [bodies, setBodies] = useState<string[]>(['', '', ''])
  const [selectedHeadline, setSelectedHeadline] = useState(0)
  const [selectedBody, setSelectedBody] = useState(0)
  const [linkUrl, setLinkUrl] = useState('https://greenmood.be')

  // Step 4
  const [result, setResult] = useState<any>(null)

  if (!open) return null

  const toggleCountry = (code: string) => {
    setCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests(prev => [...prev, interestInput.trim()])
      setInterestInput('')
    }
  }

  const generateCopy = async () => {
    setGenerating(true)
    try {
      const product = name.split(' ').slice(0, 3).join(' ') || 'Greenmood biophilic design'
      const res = await fetch('/api/ads/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          objective,
          targetAudience: interests.join(', ') || 'architects and interior designers',
          market: countries[0]?.toLowerCase() || 'global',
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setHeadlines(data.data.headlines || ['', '', ''])
        setBodies(data.data.bodies || ['', '', ''])
        if (data.data.interests) setInterests(prev => [...new Set([...prev, ...data.data.interests])])
      }
    } catch { /* silent */ }
    setGenerating(false)
  }

  const launchCampaign = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objective,
          dailyBudget,
          startDate,
          endDate: endDate || undefined,
          targeting: { countries, ageMin, ageMax, interests },
          adCopy: {
            headline: headlines[selectedHeadline],
            body: bodies[selectedBody],
            linkUrl,
          },
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) {
        setStep(5) // Success step
        onCreated?.()
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1f0f] border border-white/[0.1] rounded-2xl w-[640px] max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-semibold text-gm-cream">Create Campaign</h2>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4].map(s => (
                <div key={s} className={`h-1 w-12 rounded-full ${s <= step ? 'bg-gm-sage' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gm-cream/30 hover:text-gm-cream/60"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gm-cream/70 mb-4">Campaign Details</h3>
              <div>
                <label className="text-sm text-gm-cream/50 mb-1 block">Campaign Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cork Tiles Spring 2026"
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:border-gm-sage/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-gm-cream/50 mb-2 block">Objective</label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(o => (
                    <button key={o.value} onClick={() => setObjective(o.value)}
                      className={`text-left p-3 rounded-xl border transition-all ${objective === o.value ? 'border-gm-sage bg-gm-sage/10' : 'border-white/[0.08] hover:border-white/[0.15]'}`}>
                      <p className="text-sm font-medium text-gm-cream">{o.label}</p>
                      <p className="text-xs text-gm-cream/40 mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gm-cream/50 mb-1 block">Daily Budget (EUR)</label>
                  <input type="number" value={dailyBudget} onChange={e => setDailyBudget(Number(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:border-gm-sage/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gm-cream/50 mb-1 block">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:border-gm-sage/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gm-cream/50 mb-1 block">End Date (opt.)</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:border-gm-sage/40 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Targeting */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gm-cream/70 mb-4">Audience Targeting</h3>
              <div>
                <label className="text-sm text-gm-cream/50 mb-2 block">Countries</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map(c => (
                    <button key={c.code} onClick={() => toggleCountry(c.code)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${countries.includes(c.code) ? 'border-gm-sage bg-gm-sage/10 text-gm-cream' : 'border-white/[0.08] text-gm-cream/50 hover:border-white/[0.15]'}`}>
                      {c.flag} {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gm-cream/50 mb-1 block">Min Age</label>
                  <input type="number" value={ageMin} onChange={e => setAgeMin(Number(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gm-cream/50 mb-1 block">Max Age</label>
                  <input type="number" value={ageMax} onChange={e => setAgeMax(Number(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gm-cream/50 mb-1 block">Interests</label>
                <div className="flex gap-2 mb-2">
                  <input value={interestInput} onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addInterest()}
                    placeholder="e.g. interior design, architecture..."
                    className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2 text-sm text-gm-cream focus:outline-none" />
                  <Button variant="ghost" size="sm" onClick={addInterest}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-white/[0.06] text-xs text-gm-cream/70 flex items-center gap-1">
                      {i}
                      <button onClick={() => setInterests(prev => prev.filter(x => x !== i))} className="text-gm-cream/30 hover:text-red-400">x</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Creative */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gm-cream/70">Ad Creative</h3>
                <Button variant="primary" size="sm" onClick={generateCopy} loading={generating}>
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate with AI
                </Button>
              </div>
              <div>
                <label className="text-sm text-gm-cream/50 mb-2 block">Headlines (pick one or edit)</label>
                <div className="space-y-2">
                  {headlines.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button onClick={() => setSelectedHeadline(i)}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selectedHeadline === i ? 'border-gm-sage bg-gm-sage' : 'border-white/20'}`} />
                      <input value={h} onChange={e => { const n = [...headlines]; n[i] = e.target.value; setHeadlines(n) }}
                        placeholder={`Headline ${i + 1}`} maxLength={40}
                        className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-gm-cream focus:outline-none" />
                      <span className="text-xs text-gm-cream/20">{h.length}/40</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gm-cream/50 mb-2 block">Body Text (pick one or edit)</label>
                <div className="space-y-2">
                  {bodies.map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <button onClick={() => setSelectedBody(i)}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-2 ${selectedBody === i ? 'border-gm-sage bg-gm-sage' : 'border-white/20'}`} />
                      <textarea value={b} onChange={e => { const n = [...bodies]; n[i] = e.target.value; setBodies(n) }}
                        placeholder={`Body text ${i + 1}`} maxLength={125} rows={2}
                        className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-gm-cream focus:outline-none resize-none" />
                      <span className="text-xs text-gm-cream/20 mt-2">{b.length}/125</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gm-cream/50 mb-1 block">Link URL</label>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-gm-cream focus:outline-none" />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gm-cream/70 mb-4">Review & Launch</h3>
              <div className="bg-white/[0.03] rounded-xl p-4 space-y-3 border border-white/[0.06]">
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Campaign</span><span className="text-sm text-gm-cream">{name}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Objective</span><span className="text-sm text-gm-cream">{OBJECTIVES.find(o => o.value === objective)?.label}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Budget</span><span className="text-sm text-gm-cream">{dailyBudget} EUR/day</span></div>
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Countries</span><span className="text-sm text-gm-cream">{countries.join(', ')}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Age</span><span className="text-sm text-gm-cream">{ageMin} - {ageMax}</span></div>
                {interests.length > 0 && <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Interests</span><span className="text-sm text-gm-cream">{interests.slice(0, 3).join(', ')}{interests.length > 3 ? '...' : ''}</span></div>}
                <hr className="border-white/[0.06]" />
                <div><span className="text-sm text-gm-cream/40">Headline</span><p className="text-sm text-gm-cream mt-1">{headlines[selectedHeadline]}</p></div>
                <div><span className="text-sm text-gm-cream/40">Body</span><p className="text-sm text-gm-cream mt-1">{bodies[selectedBody]}</p></div>
                <div className="flex justify-between"><span className="text-sm text-gm-cream/40">Link</span><span className="text-sm text-gm-sage">{linkUrl}</span></div>
              </div>
              <p className="text-xs text-gm-cream/30">The campaign will be created in PAUSED state. You can activate it from the Ads dashboard when ready.</p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && result?.success && (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🎯</span>
              <h3 className="text-lg font-semibold text-gm-cream mb-2">Campaign Created</h3>
              <p className="text-sm text-gm-cream/50 mb-4">Your campaign "{name}" is ready in PAUSED state.</p>
              <p className="text-xs text-gm-cream/30">Campaign ID: {result.data?.campaignId}</p>
              <Button variant="primary" className="mt-6" onClick={onClose}>Done</Button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step < 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}
            {step < 4 ? (
              <Button variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 && !name}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : step === 4 ? (
              <Button variant="primary" onClick={launchCampaign} loading={loading}>
                Launch Campaign
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
