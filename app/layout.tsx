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
  title: 'Intervoo - Master Your Interview Skills',
  description: 'Practice mock interviews with AI-powered feedback to ace your job interviews',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4058729107300611"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${plusJakartaSans.className} ${plusJakartaSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          {children}
          {/* Tagline — shown at the bottom of every page */}
          <p className="relative select-none py-5 text-center text-sm font-semibold tracking-[0.25em] uppercase md:text-base">
            <a
              href="https://arikalp.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="tagline-reflect transition-opacity hover:opacity-80"
            >
              An imagination , Engineered by Arikalp
            </a>
          </p>
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