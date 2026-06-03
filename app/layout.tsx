import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Intervo - Master Your Interview Skills',
  description: 'Practice mock interviews with AI-powered feedback to ace your job interviews',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.className} ${plusJakartaSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          {children}
          <Analytics />
          {/* Register service worker in production */}
          <script dangerouslySetInnerHTML={{ __html: `(${String(() => {
            if (typeof window === 'undefined') return;
            if (process.env.NODE_ENV !== 'production') return;
            if (!('serviceWorker' in navigator)) return;
            navigator.serviceWorker.register('/sw.js').catch(()=>{});
          })})()` }} />
        </ClerkProvider>
      </body>
    </html>
  )
}