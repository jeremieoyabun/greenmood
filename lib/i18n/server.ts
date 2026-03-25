import { cookies } from 'next/headers'
import { translations, type Locale, type Translations } from './translations'

export async function getServerTranslations(): Promise<Translations> {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('gm-locale')?.value || 'en') as Locale
  return translations[locale] || translations.en
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return (cookieStore.get('gm-locale')?.value || 'en') as Locale
}
