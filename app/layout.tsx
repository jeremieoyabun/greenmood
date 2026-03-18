import type { Metadata } from 'next'
import { Poppins, Spectral } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-spectral',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Greenmood Marketing OS',
  description: 'AI-powered marketing operating system for Greenmood biophilic design',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${spectral.variable}`}>
      <body className="font-sans antialiased bg-gm-dark text-gm-cream">
        {children}
      </body>
    </html>
  )
}
