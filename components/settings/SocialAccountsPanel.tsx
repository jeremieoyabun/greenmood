'use client'

import { useState } from 'react'
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
  accessToken?: string
}

// Pre-configured accounts from Greenmood data
const KNOWN_ACCOUNTS: SocialAccount[] = [
  { id: '1', platform: 'instagram', handle: '@greenmood.be', market: 'hq', status: 'disconnected' },
  { id: '2', platform: 'instagram', handle: '@greenmood.usa', market: 'us', status: 'disconnected' },
  { id: '3', platform: 'instagram', handle: '@greenmood.uae', market: 'ae', status: 'disconnected' },
  { id: '4', platform: 'instagram', handle: '@greenmood.fr', market: 'fr', status: 'disconnected' },
  { id: '5', platform: 'instagram', handle: '@greenmood.pl', market: 'pl', status: 'disconnected' },
  { id: '6', platform: 'instagram', handle: '@greenmood.co.uk', market: 'uk', status: 'disconnected' },
  { id: '7', platform: 'linkedin', handle: 'Greenmood HQ', market: 'hq', status: 'disconnected' },
  { id: '8', platform: 'linkedin', handle: 'Greenmood France', market: 'fr', status: 'disconnected' },
  { id: '9', platform: 'tiktok', handle: '@greenmood.uae', market: 'ae', status: 'disconnected' },
  { id: '10', platform: 'facebook', handle: 'GreenmoodPoland', market: 'pl', status: 'disconnected' },
]

const PLATFORM_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  instagram: { icon: '📸', color: 'text-pink-400', label: 'Instagram' },
  linkedin: { icon: '💼', color: 'text-sky-400', label: 'LinkedIn' },
  tiktok: { icon: '🎵', color: 'text-gm-cream', label: 'TikTok' },
  facebook: { icon: '📘', color: 'text-blue-400', label: 'Facebook' },
}

export function SocialAccountsPanel() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(KNOWN_ACCOUNTS)
  const [showConnect, setShowConnect] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ platform: 'instagram', handle: '', market: 'ae' })

  const handleConnect = async (accountId: string) => {
    setConnecting(accountId)
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    // For Instagram/Facebook: redirect to Meta OAuth
    // For TikTok: redirect to TikTok OAuth
    // For LinkedIn: redirect to LinkedIn OAuth
    // For now, simulate the flow
    if (account.platform === 'instagram') {
      // New Instagram API (direct, not via Facebook Graph)
      const igAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID
      if (!igAppId) {
        alert('Instagram API not configured yet.')
        setConnecting(null)
        return
      }
      const scopes = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_content_publish'
      window.open(
        `https://www.instagram.com/oauth/authorize?client_id=${igAppId}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/instagram')}&scope=${scopes}&response_type=code&state=${accountId}`,
        'instagram-oauth', 'width=600,height=700'
      )
    } else if (account.platform === 'facebook') {
      const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
      if (!metaAppId) {
        alert('Meta API not configured yet.')
        setConnecting(null)
        return
      }
      window.open(
        `https://www.facebook.com/v25.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/meta')}&scope=pages_show_list,pages_read_engagement,pages_manage_posts&response_type=code&state=${accountId}`,
        'meta-oauth', 'width=600,height=700'
      )
    } else if (account.platform === 'tiktok') {
      window.open(
        `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_KEY'}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/tiktok')}&state=${accountId}`,
        'tiktok-oauth', 'width=600,height=700'
      )
    } else if (account.platform === 'linkedin') {
      const linkedinClientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID
      if (!linkedinClientId) {
        alert('LinkedIn API not configured yet. Contact Jeremie to set up LinkedIn Developer App credentials.')
        setConnecting(null)
        return
      }
      window.open(
        `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/linkedin')}&scope=w_member_social%20r_organization_social%20w_organization_social&state=${accountId}`,
        'linkedin-oauth', 'width=600,height=700'
      )
    }

    // In production, the OAuth callback would update the status
    // For beta testing, we'll show the manual token entry
    setShowConnect(true)
    setConnecting(null)
  }

  const handleManualConnect = (accountId: string, token: string) => {
    setAccounts(prev => prev.map(a =>
      a.id === accountId ? { ...a, status: 'connected' as const, accessToken: token } : a
    ))
    setShowConnect(false)
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
          {/* Connected */}
          {connected.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-gm-cream/30 font-semibold mb-2">Connected</p>
              <div className="space-y-2">
                {connected.map(account => {
                  const p = PLATFORM_ICONS[account.platform]
                  return (
                    <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{p?.icon}</span>
                        <div>
                          <p className="text-xs text-gm-cream/80 font-medium">{account.handle}</p>
                          <p className="text-[10px] text-gm-cream/30">{p?.label} · {MARKETS[account.market]?.emoji} {MARKETS[account.market]?.name}</p>
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
            <p className="text-[10px] uppercase tracking-wider text-gm-cream/30 font-semibold mb-2">
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
                        <p className="text-xs text-gm-cream/60">{account.handle}</p>
                        <p className="text-[10px] text-gm-cream/25">{p?.label} · {MARKETS[account.market]?.emoji} {MARKETS[account.market]?.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(account.id)}
                      loading={connecting === account.id}
                    >
                      Connect
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-[9px] text-gm-cream/20 mt-4">
            Connecting accounts enables auto-publishing. Instagram & Facebook require a Meta Business account. TikTok requires a TikTok for Business account.
          </p>
        </CardContent>
      </Card>

      {/* Manual Token Entry (for beta testing) */}
      <Modal open={showConnect} onClose={() => setShowConnect(false)} title="Connect Account" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gm-cream/60">
            To connect this account, you need an access token from the platform's developer portal.
            During beta testing, you can paste the token here manually.
          </p>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <p className="text-[10px] text-gm-cream/40 mb-2">How to get your token:</p>
            <ol className="text-[10px] text-gm-cream/30 space-y-1 list-decimal list-inside">
              <li>Go to Meta Business Suite → Settings → Integrations</li>
              <li>Create or select your app</li>
              <li>Generate a long-lived page access token</li>
              <li>Paste it below</li>
            </ol>
          </div>
          <Input
            label="Access Token"
            placeholder="Paste your access token here..."
            type="password"
          />
          <Button className="w-full">Save Token</Button>
        </div>
      </Modal>

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
    </>
  )
}
