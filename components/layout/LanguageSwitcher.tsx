'use client'

import { useState, useRef, useEffect } from 'react'
import { useI18n, LOCALE_CONFIG, type Locale } from '@/lib/i18n'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { ChevronDown } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = LOCALE_CONFIG[locale]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all text-sm"
      >
        <FlagIcon market={current.flag === 'gb' ? 'uk' : current.flag} size="sm" />
        <span className="text-gm-cream/70 text-xs font-medium">{locale.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-gm-cream/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a2a1a] border border-white/[0.12] rounded-xl overflow-hidden shadow-xl shadow-black/40 z-50 min-w-[140px]">
          {(Object.entries(LOCALE_CONFIG) as [Locale, typeof current][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => { setLocale(key); setOpen(false) }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors ${
                locale === key
                  ? 'bg-gm-sage/10 text-gm-sage'
                  : 'text-gm-cream/60 hover:bg-white/[0.04] hover:text-gm-cream'
              }`}
            >
              <FlagIcon market={config.flag === 'gb' ? 'uk' : config.flag} size="sm" />
              <span className="font-medium">{config.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
