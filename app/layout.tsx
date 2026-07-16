/**
 * ============================================================
 * FILE: app/layout.tsx
 * PURPOSE: Root Next.js layout — wraps every page in the app
 * ============================================================
 *
 * WHAT IT DOES:
 * This is the entry point for ALL pages in the Next.js App Router.
 * Every route renders inside this layout. It provides:
 *
 *  1. AUTHENTICATION: ClerkProvider wraps the entire app so any
 *     page can use Clerk hooks (useUser, useAuth, etc.) and
 *     server-side auth() without additional setup.
 *
 *  2. FONTS: Two Google Fonts are loaded:
 *     - Plus Jakarta Sans : Main UI font (weights 400–800)
 *     - Geist Mono        : Monospace font for code/technical text
 *     Both are injected as CSS custom properties (--font-*)
 *     so Tailwind can reference them.
 *
 *  3. ANALYTICS: Vercel Analytics component is included for
 *     production usage tracking.
 *
 *  4. PWA SERVICE WORKER: A small inline script registers the
 *     /sw.js service worker in production only. This enables
 *     offline support, caching, and install-to-homescreen.
 *
 *  5. SEO METADATA: title and description are set here as defaults
 *     and can be overridden per page via `export const metadata`.
 * ============================================================
 */

import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Load Geist Mono: used for monospace/code-style text elements.
// Injected as CSS variable --font-geist-mono for Tailwind reference.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Load Plus Jakarta Sans: the main UI font for all body text, headings, etc.
// Injected as CSS variable --font-plus-jakarta-sans for Tailwind reference.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

/**
 * metadata
 * --------
 * Next.js page metadata exported as a constant.
 * These are the default title and description for all pages.
 * Individual pages can export their own `metadata` to override these.
 */
export const metadata: Metadata = {
  title: 'Intervo - Master Your Interview Skills',
  description: 'Practice mock interviews with AI-powered feedback to ace your job interviews',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

/**
 * RootLayout
 * ----------
 * The root layout component wrapping every page in the app.
 * All pages are rendered as `children` inside this layout.
 *
 * ClerkProvider must wrap the entire tree so auth state is
 * available everywhere (client and server components alike).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      {/* Apply fonts and Tailwind's antialiasing to the body */}
      <body className={`${plusJakartaSans.className} ${plusJakartaSans.variable} ${geistMono.variable} antialiased`}>
        {/* ClerkProvider enables auth hooks and middleware across all routes */}
        <ClerkProvider>
          {children}
          {/* Vercel Analytics: tracks page views in production */}
          <Analytics />
          {/* Register service worker in production for PWA support (offline, caching) */}
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