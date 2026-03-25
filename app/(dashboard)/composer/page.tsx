'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { Textarea } from '@/components/ui/Input'
import { MARKETS, PLATFORMS, CONTENT_TYPES } from '@/lib/constants'
import { FileText, Building2, Leaf, MapPin, GraduationCap, Wrench } from 'lucide-react'

type Step = 'type' | 'brief' | 'generating' | 'results'

interface GeneratedPost {
  text: string
  first_comment: string | null
  hashtags: string | null
  timing: string | null
  notes: string | null
}

interface GenerationResult {
  title: string
  posts: Record<string, GeneratedPost>
  image_prompts?: string[]
  stories?: string[]
}

export default function ComposerPage() {
  const [step, setStep] = useState<Step>('type')
  const [contentType, setContentType] = useState('')
  const [brief, setBrief] = useState('')
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<GenerationResult | null>(null)
  const [error, setError] = useState('')
  const [activePost, setActivePost] = useState('')
  const [copied, setCopied] = useState('')
  const [savingToCalendar, setSavingToCalendar] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const toggleMarket = (id: string) => {
    setSelectedMarkets(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const generate = async () => {
    if (!brief.trim() || !contentType || !selectedMarkets.length || !selectedPlatforms.length) return

    setStep('generating')
    setGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          contentType,
          markets: selectedMarkets,
          platforms: selectedPlatforms,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      setResults(data.data)
      const firstKey = Object.keys(data.data.posts || {})[0]
      if (firstKey) setActivePost(firstKey)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStep('brief')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const reset = () => {
    setStep('type')
    setContentType('')
    setBrief('')
    setSelectedMarkets([])
    setSelectedPlatforms([])
    setResults(null)
    setError('')
    setActivePost('')
  }

  return (
    <>
      <PageHeader
        title="Content Composer"
        description="Create multi-market, multi-platform content with AI assistance"
        actions={
          step !== 'type' && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Start Over
            </Button>
          )
        }
      />

      {/* Step 1: Content Type */}
      {step === 'type' && (
        <div className="grid grid-cols-3 gap-3">
          {CONTENT_TYPES.map((type) => (
            <Card
              key={type.id}
              hover
              className={contentType === type.id ? 'border-gm-sage/40 bg-gm-sage/5' : ''}
              onClick={() => { setContentType(type.id); setStep('brief') }}
            >
              <div className="text-center py-4">
                {(() => {
                  const iconMap: Record<string, React.ElementType> = { FileText, Building2, Leaf, MapPin, GraduationCap, Wrench }
                  const Icon = iconMap[type.icon] || FileText
                  return <Icon className={`w-8 h-8 mx-auto mb-3 ${contentType === type.id ? 'text-gm-sage' : 'text-gm-cream/40'}`} />
                })()}
                <p className="text-sm font-medium text-gm-cream">{type.label}</p>
                <p className="text-xs text-gm-cream/40 mt-1">{type.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Brief */}
      {step === 'brief' && (
        <div className="space-y-5 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Content Brief</CardTitle>
              <Badge variant="info">{CONTENT_TYPES.find(t => t.id === contentType)?.label}</Badge>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe what you want to create. Be specific about the topic, angle, key messages, and any product references..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Markets</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MARKETS).map(([id, market]) => (
                  <Chip
                    key={id}
                    label={market.name}
                    emoji={market.emoji}
                    selected={selectedMarkets.includes(id)}
                    onClick={() => toggleMarket(id)}
                    color={market.color}
                  />
                ))}
              </div>
              <button
                className="text-xs text-gm-sage/60 hover:text-gm-sage mt-2"
                onClick={() => setSelectedMarkets(
                  selectedMarkets.length === Object.keys(MARKETS).length ? [] : Object.keys(MARKETS)
                )}
              >
                {selectedMarkets.length === Object.keys(MARKETS).length ? 'Deselect all' : 'Select all'}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Platforms</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLATFORMS).map(([id, platform]) => (
                  <Chip
                    key={id}
                    label={platform.name}
                    selected={selectedPlatforms.includes(id)}
                    onClick={() => togglePlatform(id)}
                    color={platform.color}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 font-medium">
              {error}
            </div>
          )}

          <Button
            size="lg"
            onClick={generate}
            disabled={!brief.trim() || !selectedMarkets.length || !selectedPlatforms.length}
            className="w-full"
          >
            Generate Content ({selectedMarkets.length} markets × {selectedPlatforms.length} platforms)
          </Button>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 'generating' && (
        <Card className="max-w-lg mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gm-sage/30 border-t-gm-sage rounded-full animate-spin mb-4" />
            <p className="text-sm text-gm-cream/70 mb-1">Generating content...</p>
            <p className="text-xs text-gm-cream/30">
              {selectedMarkets.length} markets × {selectedPlatforms.length} platforms
            </p>
          </div>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 'results' && results && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{results.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="success">{Object.keys(results.posts).length} variants generated</Badge>
                {(results as any).postsCreated && (
                  <Badge variant="info">{(results as any).postsCreated} saved to DB</Badge>
                )}
              </div>
            </CardHeader>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" size="sm" onClick={() => window.location.href = '/approvals'}>
                Review in Approvals
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/calendar'}>
                View in Calendar
              </Button>
            </div>
          </Card>

          {/* Post Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(results.posts).map((key) => {
              const [market, platform] = key.split('--')
              const marketConfig = MARKETS[market]
              return (
                <button
                  key={key}
                  onClick={() => setActivePost(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activePost === key
                      ? 'bg-gm-sage/20 text-gm-sage border border-gm-sage/30'
                      : 'bg-white/[0.03] text-gm-cream/50 border border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  {marketConfig?.emoji} {marketConfig?.name || market} — {platform}
                </button>
              )
            })}
          </div>

          {/* Active Post */}
          {activePost && results.posts[activePost] && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  {/* Post Text */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-medium">Post</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(results.posts[activePost].text, `${activePost}-text`)}
                      >
                        {copied === `${activePost}-text` ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <pre className="text-sm text-gm-cream/80 whitespace-pre-wrap font-sans leading-relaxed bg-white/[0.02] rounded-lg p-4 border border-white/[0.05]">
                      {results.posts[activePost].text}
                    </pre>
                  </div>

                  {/* First Comment */}
                  {results.posts[activePost].first_comment && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-medium">First Comment</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(results.posts[activePost].first_comment!, `${activePost}-fc`)}
                        >
                          {copied === `${activePost}-fc` ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <p className="text-sm text-gm-cream/60 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
                        {results.posts[activePost].first_comment}
                      </p>
                    </div>
                  )}

                  {/* Hashtags */}
                  {results.posts[activePost].hashtags && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-gm-cream/40 font-medium">Hashtags</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(results.posts[activePost].hashtags!, `${activePost}-hash`)}
                        >
                          {copied === `${activePost}-hash` ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <p className="text-sm text-gm-sage/70 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05]">
                        {results.posts[activePost].hashtags}
                      </p>
                    </div>
                  )}

                  {/* Timing & Notes */}
                  <div className="flex gap-4 pt-2 border-t border-white/[0.05]">
                    {results.posts[activePost].timing && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-gm-cream/30">Timing</span>
                        <p className="text-sm text-gm-cream/60 mt-0.5">{results.posts[activePost].timing}</p>
                      </div>
                    )}
                    {results.posts[activePost].notes && (
                      <div>
                        <span className="text-xs uppercase tracking-wider text-gm-cream/30">Notes</span>
                        <p className="text-sm text-gm-cream/60 mt-0.5">{results.posts[activePost].notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Prompts */}
          {results.image_prompts && results.image_prompts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Image Generation Prompts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.image_prompts.map((prompt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-gm-cream/30 mt-1">{i + 1}.</span>
                      <p className="text-sm text-gm-cream/60">{prompt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
