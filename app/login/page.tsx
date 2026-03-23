'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Login failed')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gm-dark via-gm-forest to-gm-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gm-sage/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-gm-sage text-2xl font-bold">G</span>
          </div>
          <h1 className="text-xl font-semibold text-gm-cream tracking-tight">Greenmood</h1>
          <p className="text-xs text-gm-cream/40 mt-1">Marketing Operating System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white/[0.035] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="your@greenmood.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-300 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-[10px] text-gm-cream/15 text-center mt-6">
          Greenmood Marketing OS v2.0
        </p>
      </div>
    </div>
  )
}
