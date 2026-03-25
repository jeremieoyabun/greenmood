'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/lib/i18n'
import { User, Mail, Lock, Check, X } from 'lucide-react'

interface ProfileEditorProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function ProfileEditor({ user }: ProfileEditorProps) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setMessage(null)

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t.settings.passwordMismatch })
      return
    }

    if (newPassword && !currentPassword) {
      setMessage({ type: 'error', text: t.settings.currentPasswordRequired })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: t.settings.profileUpdated })
        setEditing(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Error' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setName(user.name)
    setEmail(user.email)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.yourProfile}</CardTitle>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {t.common.edit}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}>
            {message.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        )}

        {!editing ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-gm-cream/30" />
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{t.settings.name}</p>
              </div>
              <p className="text-sm text-gm-cream">{user.name}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3 h-3 text-gm-cream/30" />
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{t.settings.email}</p>
              </div>
              <p className="text-sm text-gm-cream">{user.email}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3 h-3 text-gm-cream/30" />
                <p className="text-[10px] uppercase tracking-wider text-gm-cream/40 font-medium">{t.settings.role}</p>
              </div>
              <Badge variant={user.role === 'OPERATOR' ? 'success' : 'info'}>
                {t.roles[user.role as keyof typeof t.roles] || user.role}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs text-gm-cream/50 font-medium mb-1.5 block">{t.settings.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gm-cream/50 font-medium mb-1.5 block">{t.settings.email}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="pt-3 border-t border-white/[0.08]">
              <p className="text-xs text-gm-cream/40 font-medium mb-3">{t.settings.changePassword}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gm-cream/50 font-medium mb-1.5 block">{t.settings.currentPassword}</label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-xs text-gm-cream/50 font-medium mb-1.5 block">{t.settings.newPassword}</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-xs text-gm-cream/50 font-medium mb-1.5 block">{t.settings.confirmPassword}</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} loading={saving}>{t.common.save}</Button>
              <Button variant="ghost" onClick={handleCancel}>{t.common.cancel}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
