'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MARKETS } from '@/lib/constants'

interface SocialAccount {
  id: string
  platform: string
  handle: string
  market: string
  status: 'connected' | 'pending' | 'disconnected'
}

const INITIAL_ACCOUNTS: SocialAccount[] = [
  { id: '1', platform: 'instagram', handle: '@greenmood.be', market: 'hq', status: 'disconnected' },
  { id: '2', platform: 'instagram', handle: '@greenmood.usa', market: 'us', status: 'disconnected' },
  { id: '3', platform: 'instagram', handle: '@greenmood.uae', market: 'ae', status: 'disconnected' },
  { id: '4', platform: 'instagram', handle: '@greenmood.fr', market: 'fr', status: 'disconnected' },
  { id: '5', platform: 'instagram', handle: '@greenmood.pl', market: 'pl', status: 'disconnected' },
  { id: '6', platform: 'instagram', handle: '@greenmood.co.uk', market: 'uk', status: 'disconnected' },
  { id: '7', platform: 'linkedin', handle: 'Greenmood', market: 'hq', status: 'disconnected' },
  { id: '9', platform: 'tiktok', handle: '@greenmood.uae', market: 'ae', status: 'disconnected' },
  { id: '10', platform: 'facebook', handle: 'GreenmoodPoland', market: 'pl', status: 'disconnected' },
]

const PLATFORM_ICONS: Record<string, { icon: string; label: string }> = {
  instagram: { icon: '📸', label: 'Instagram' },
  linkedin: { icon: '💼', label: 'LinkedIn' },
  tiktok: { icon: '🎵', label: 'TikTok' },
  facebook: { icon: '📘', label: 'Facebook' },
}

export function SocialAccountsPanel() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after hydration to avoid React #418
  useEffect(() => {
    const saved = localStorage.getItem('gm-social-accounts')
    if (saved) {
      try { setAccounts(JSON.parse(saved)) } catch { /* ignore */ }
    }
    setHydrated(true)
  }, [])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ platform: 'instagram', handle: '', market: 'ae' })
  const [successMessage, setSuccessMessage] = useState('')
  const [tokenModal, setTokenModal] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  const saveToken = async () => {
    if (!tokenInput.trim() || !tokenModal) return
    setSavingToken(true)
    const account = accounts.find(a => a.id === tokenModal)
    // Map account ID to market code
    const marketMap: Record<string, string> = {
      '1': 'hq', '2': 'us', '3': 'uk', '4': 'ae', '5': 'fr', '6': 'pl', '7': 'linkedin-hq',
    }
    const market = account?.market || marketMap[tokenModal] || 'hq'
    const platform = account?.platform || 'instagram'
    try {
      const res = await fetch('/api/auth/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, market, platform }),
      })
      const data = await res.json()
      if (data.success) {
        setAccounts(prev => {
          const updated = prev.map(a => a.id === tokenModal ? { ...a, status: 'connected' as const } : a)
          localStorage.setItem('gm-social-accounts', JSON.stringify(updated))
          return updated
        })
        setSuccessMessage(`${data.username || 'Account'} connected!`)
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        setSuccessMessage(`Error: ${data.error}`)
        setTimeout(() => setSuccessMessage(''), 8000)
      }
    } catch {
      setSuccessMessage('Failed to save token')
      setTimeout(() => setSuccessMessage(''), 5000)
    }
    setSavingToken(false)
    setTokenModal(null)
    setTokenInput('')
  }

  // Handle OAuth callback success
  useEffect(() => {
    const connected = searchParams.get('connected')
    const username = searchParams.get('username')
    const error = searchParams.get('error')

    if (connected === 'instagram' && username) {
      // Mark the matching instagram account as connected
      setAccounts(prev => {
        const updated = prev.map(a =>
          a.platform === 'instagram' && a.handle === `@${username}`
            ? { ...a, status: 'connected' as const }
            : a
        )
        localStorage.setItem('gm-social-accounts', JSON.stringify(updated))
        return updated
      })
      setSuccessMessage(`@${username} connected successfully!`)
      setTimeout(() => setSuccessMessage(''), 5000)
      // Clean URL
      window.history.replaceState({}, '', '/settings')
    } else if (connected === 'linkedin') {
      setAccounts(prev => {
        // Mark first disconnected linkedin account as connected
        let found = false
        const updated = prev.map(a => {
          if (!found && a.platform === 'linkedin' && a.status !== 'connected') {
            found = true
            return { ...a, status: 'connected' as const }
          }
          return a
        })
        localStorage.setItem('gm-social-accounts', JSON.stringify(updated))
        return updated
      })
      setSuccessMessage(`LinkedIn ${username || ''} connected!`)
      setTimeout(() => setSuccessMessage(''), 5000)
      window.history.replaceState({}, '', '/settings')
    } else if (connected === 'tiktok') {
      setSuccessMessage('TikTok account connected!')
      setTimeout(() => setSuccessMessage(''), 5000)
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      setSuccessMessage(`Connection error: ${error}`)
      setTimeout(() => setSuccessMessage(''), 8000)
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem('gm-social-accounts', JSON.stringify(accounts))
  }, [accounts])

  const handleConnect = (accountId: string) => {
    setConnecting(accountId)
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    const baseUrl = window.location.origin

    if (account.platform === 'instagram') {
      const scopes = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_content_publish'
      window.location.href = `https://www.instagram.com/oauth/authorize?client_id=3228543280657809&redirect_uri=${encodeURIComponent('https://app.greenmood.be/api/auth/callback/instagram')}&scope=${scopes}&response_type=code&state=${accountId}`
    } else if (account.platform === 'facebook') {
      const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
      if (!metaAppId) { alert('Meta API not configured yet.'); setConnecting(null); return }
      window.location.href = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback/meta')}&scope=pages_show_list,pages_read_engagement,pages_manage_posts&response_type=code&state=${accountId}`
    } else if (account.platform === 'tiktok') {
      const tiktokKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY
      if (!tiktokKey) { alert('TikTok API not configured yet.'); setConnecting(null); return }
      window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokKey}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${encodeURIComponent(baseUrl + '/api/auth/callback/tiktok')}&state=${accountId}`
    } else if (account.platform === 'linkedin') {
      window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=77cfx3q0hjhjdk&redirect_uri=${encodeURIComponent('https://app.greenmood.be/api/auth/callback/linkedin')}&scope=openid%20profile%20w_member_social&state=${accountId}`
    }
  }

  const addAccount = () => {
    if (!newAccount.handle) return
    setAccounts(prev => [...prev, {
      id: `custom-${Date.now()}`,
      platform: newAccount.platform,
      handle: newAccount.handle,
      market: newAccount.market,
      status: 'disconnected',
    }])
    setNewAccount({ platform: 'instagram', handle: '', market: 'ae' })
    setShowAddAccount(false)
  }

  const connected = accounts.filter(a => a.status === 'connected')
  const disconnected = accounts.filter(a => a.status !== 'connected')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Social Accounts</CardTitle>
          <Button size="sm" onClick={() => setShowAddAccount(true)}>Add Account</Button>
        </CardHeader>
        <CardContent>
          {/* Success/Error Message */}
          {successMessage && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-xs ${
              successMessage.includes('error') || successMessage.includes('Error')
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {successMessage}
            </div>
          )}

          {/* Connected */}
          {connected.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider text-gm-cream/30 font-semibold mb-2">Connected</p>
              <div className="space-y-2">
                {connected.map(account => {
                  const p = PLATFORM_ICONS[account.platform]
                  return (
                    <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{p?.icon}</span>
                        <div>
                          <p className="text-sm text-gm-cream/80 font-medium">{account.handle}</p>
                          <p className="text-xs text-gm-cream/30">{p?.label} · {MARKETS[account.market]?.emoji} {MARKETS[account.market]?.name}</p>
                        </div>
                      </div>
                      <Badge variant="success">Connected</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Disconnected */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gm-cream/30 font-semibold mb-2">
              {connected.length > 0 ? 'Available to connect' : 'Connect your accounts'}
            </p>
            <div className="space-y-1.5">
              {disconnected.map(account => {
                const p = PLATFORM_ICONS[account.platform]
                return (
                  <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{p?.icon}</span>
                      <div>
                        <p className="text-sm text-gm-cream/60">{account.handle}</p>
                        <p className="text-xs text-gm-cream/25">{p?.label} · {MARKETS[account.market]?.emoji} {MARKETS[account.market]?.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(account.id)}
                        loading={connecting === account.id}
                      >
                        Connect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setTokenModal(account.id); setTokenInput('') }}
                      >
                        Paste Token
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-xs text-gm-cream/20 mt-4">
            Connecting accounts enables auto-publishing. Instagram requires Meta App Review approval. TikTok requires TikTok Developer approval. Reviews take 2-5 business days.
          </p>
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <Modal open={showAddAccount} onClose={() => setShowAddAccount(false)} title="Add Social Account" size="sm">
        <div className="space-y-4">
          <Select
            label="Platform"
            value={newAccount.platform}
            onChange={(e) => setNewAccount(p => ({ ...p, platform: e.target.value }))}
            options={[
              { value: 'instagram', label: '📸 Instagram' },
              { value: 'tiktok', label: '🎵 TikTok' },
              { value: 'linkedin', label: '💼 LinkedIn' },
              { value: 'facebook', label: '📘 Facebook' },
            ]}
          />
          <Input
            label="Handle / Page Name"
            placeholder="@greenmood.uae"
            value={newAccount.handle}
            onChange={(e) => setNewAccount(p => ({ ...p, handle: e.target.value }))}
          />
          <Select
            label="Market"
            value={newAccount.market}
            onChange={(e) => setNewAccount(p => ({ ...p, market: e.target.value }))}
            options={Object.entries(MARKETS).map(([id, m]) => ({ value: id, label: `${m.emoji} ${m.name}` }))}
          />
          <Button className="w-full" onClick={addAccount}>Add Account</Button>
        </div>
      </Modal>

      {/* Paste Token Modal */}
      <Modal open={!!tokenModal} onClose={() => setTokenModal(null)} title="Paste Access Token" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gm-cream/50">
            Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-gm-sage hover:underline">Meta Developers</a> → your app → Instagram API → Generate a token. Paste it below.
          </p>
          <Input
            label="Access Token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="IGAAxxxxxxx..."
          />
          <Button
            className="w-full"
            loading={savingToken}
            onClick={saveToken}
            disabled={!tokenInput.trim()}
          >
            Verify & Connect
          </Button>
        </div>
      </Modal>
    </>
  )
}
