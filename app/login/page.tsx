'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Load saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem('gm-remember-email')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Save or clear remembered email
    if (rememberMe) {
      localStorage.setItem('gm-remember-email', email)
    } else {
      localStorage.removeItem('gm-remember-email')
    }

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

          {/* Password with eye toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gm-cream/80 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-white/20 rounded-xl shadow-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gm-sage/60 focus:border-gm-sage/60 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 text-gm-sage focus:ring-gm-sage/40 cursor-pointer"
            />
            <span className="text-xs text-gm-cream/50">Remember me</span>
          </label>

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
