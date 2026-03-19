'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

const CRON_AGENTS = [
  { id: 'intelligence', label: 'Intelligence Scraper', schedule: '7h daily', description: 'Scrapes market trends, competitor moves, generates signals', color: 'text-pink-400' },
  { id: 'editorial', label: 'Editorial Proposer', schedule: '8h daily', description: 'Proposes 2-3 posts/day based on KB + signals', color: 'text-purple-400' },
  { id: 'validate', label: 'Fact-Check + Brand Guard', schedule: '8h05 daily', description: 'Auto-validates AI-generated posts', color: 'text-sky-400' },
  { id: 'repurpose', label: 'Repurpose Agent', schedule: '8h10 daily', description: 'Adapts posts cross-platform (LinkedIn→IG, IG→Stories)', color: 'text-amber-400' },
  { id: 'performance', label: 'Performance Learner', schedule: '23h daily', description: 'Analyzes IG insights, learns what works', color: 'text-emerald-400' },
  { id: 'comments', label: 'Comment Monitor', schedule: 'Every 30 min', description: 'Monitors IG comments, flags architects, suggests replies', color: 'text-orange-400' },
]

const ON_DEMAND_AGENTS = [
  { id: 'campaign', label: 'Campaign Planner', description: 'Plan multi-week campaigns around events', fields: ['eventName', 'eventDate', 'market', 'duration'] },
  { id: 'blog', label: 'SEO Blog Generator', description: 'Generate blog articles from posts or topics', fields: ['topic'] },
  { id: 'hashtags', label: 'Hashtag Optimizer', description: 'Generate optimized hashtag sets', fields: ['text', 'platform'] },
  { id: 'image-director', label: 'Image Director', description: 'Suggest images + Pomelli prompts for posts', fields: ['caption', 'platform'] },
]

export function AgentPanel() {
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, any>>({})
  const [campaignInput, setCampaignInput] = useState({ eventName: '', eventDate: '', market: 'us', duration: '14' })
  const [blogTopic, setBlogTopic] = useState('')
  const [hashtagText, setHashtagText] = useState('')

  const triggerCron = async (id: string) => {
    setRunning(id)
    try {
      const res = await fetch(`/api/cron/${id}`, {
        headers: { 'Authorization': 'Bearer ' + (window as any).__CRON_SECRET || '' },
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [id]: data }))
    } catch (err) {
      setResults(prev => ({ ...prev, [id]: { error: 'Failed to trigger' } }))
    }
    setRunning(null)
  }

  const triggerOnDemand = async (id: string, body: any) => {
    setRunning(id)
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [id]: data }))
    } catch (err) {
      setResults(prev => ({ ...prev, [id]: { error: 'Failed to trigger' } }))
    }
    setRunning(null)
  }

  return (
    <div className="space-y-6">
      {/* Autonomous Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Agents</CardTitle>
          <Badge variant="success">Running daily</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {CRON_AGENTS.map(agent => (
              <div key={agent.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${agent.color}`}>{agent.label}</span>
                  <Badge variant="default" size="sm">{agent.schedule}</Badge>
                </div>
                <p className="text-xs text-gm-cream/40 mb-3">{agent.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={running === agent.id}
                    onClick={() => triggerCron(agent.id)}
                  >
                    Trigger Now
                  </Button>
                  {results[agent.id] && (
                    <span className={`text-xs ${results[agent.id].success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {results[agent.id].success ? 'Done' : 'Error'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* On-Demand Agents */}
      <Card>
        <CardHeader>
          <CardTitle>On-Demand Agents</CardTitle>
          <Badge variant="info">Manual trigger</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Campaign Planner */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <span className="text-sm font-semibold text-gm-cream mb-3 block">Campaign Planner</span>
              <p className="text-xs text-gm-cream/40 mb-3">Plan multi-week campaigns around events (NeoCon, Workspace Expo, etc.)</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Input label="Event" value={campaignInput.eventName} onChange={e => setCampaignInput(p => ({ ...p, eventName: e.target.value }))} placeholder="NeoCon 2026" />
                <Input label="Date" type="date" value={campaignInput.eventDate} onChange={e => setCampaignInput(p => ({ ...p, eventDate: e.target.value }))} />
                <Input label="Market" value={campaignInput.market} onChange={e => setCampaignInput(p => ({ ...p, market: e.target.value }))} placeholder="us" />
                <Input label="Days" value={campaignInput.duration} onChange={e => setCampaignInput(p => ({ ...p, duration: e.target.value }))} placeholder="14" />
              </div>
              <Button size="sm" loading={running === 'campaign'} onClick={() => triggerOnDemand('campaign', campaignInput)} disabled={!campaignInput.eventName}>
                Plan Campaign
              </Button>
            </div>

            {/* SEO Blog */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <span className="text-sm font-semibold text-gm-cream mb-3 block">SEO Blog Generator</span>
              <p className="text-xs text-gm-cream/40 mb-3">Generate 800-1200 word blog article from a topic</p>
              <div className="flex gap-2">
                <input value={blogTopic} onChange={e => setBlogTopic(e.target.value)} placeholder="e.g., Cork vs Foam acoustic panels comparison"
                  className="flex-1 px-4 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30" />
                <Button size="sm" loading={running === 'blog'} onClick={() => triggerOnDemand('blog', { topic: blogTopic })} disabled={!blogTopic}>
                  Generate Article
                </Button>
              </div>
            </div>

            {/* Hashtag Optimizer */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <span className="text-sm font-semibold text-gm-cream mb-3 block">Hashtag Optimizer</span>
              <p className="text-xs text-gm-cream/40 mb-3">Get 3 optimized hashtag sets for your caption</p>
              <div className="flex gap-2">
                <input value={hashtagText} onChange={e => setHashtagText(e.target.value)} placeholder="Paste your caption here..."
                  className="flex-1 px-4 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-gm-cream placeholder:text-gm-cream/20 focus:outline-none focus:ring-2 focus:ring-gm-sage/30" />
                <Button size="sm" loading={running === 'hashtags'} onClick={() => triggerOnDemand('hashtags', { text: hashtagText, platform: 'instagram', market: 'hq' })} disabled={!hashtagText}>
                  Optimize
                </Button>
              </div>
            </div>

            {/* Results Display */}
            {Object.entries(results).filter(([k]) => ON_DEMAND_AGENTS.some(a => a.id === k)).map(([key, result]) => (
              <div key={key} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                <span className="text-xs font-semibold text-gm-cream/50 uppercase tracking-wider block mb-2">{key} Result</span>
                <pre className="text-xs text-gm-cream/70 whitespace-pre-wrap overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
