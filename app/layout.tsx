import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { WebVitalsReporter } from "@/components/analytics/WebVitals"
import { Footer } from "@/components/layout/Footer"
import { CookieConsentBanner } from "@/components/dialogs/CookieConsentBanner"
import { InstallPWAPrompt, IOSInstallPrompt } from "@/components/common/InstallPWAPrompt"
import "./globals.css"
import { Providers } from "@/components/layout/Providers"

export const metadata: Metadata = {
  metadataBase: new URL('https://templar-archives-index.web.app'),
  title: {
    default: "Templar Archives Index - Poker Hand History Archive & Analysis",
    template: "%s | Templar Archives Index"
  },
  description: "Comprehensive poker hand history archive and analysis platform. Search, analyze, and share professional poker hands from major tournaments worldwide.",
  keywords: ["poker", "hand history", "tournament", "analysis", "archive", "WSOP", "Triton", "EPT", "poker hands"],
  authors: [{ name: "Templar Archives Index Team" }],
  creator: "Templar Archives Index",
  publisher: "Templar Archives Index",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Templar Archives',
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://templar-archives-index.web.app",
    siteName: "Templar Archives Index",
    title: "Templar Archives Index - Poker Hand History Archive & Analysis",
    description: "Comprehensive poker hand history archive and analysis platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Templar Archives Index"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Templar Archives Index - Poker Hand History Archive",
    description: "Comprehensive poker hand history archive and analysis platform",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console verification (추후 추가)
    // google: 'your-verification-code',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F59E0B" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased bg-textured`}>

        <Providers>
          <main id="main-content" role="main">
            {children}
          </main>
          <Footer />
          <CookieConsentBanner />
          <InstallPWAPrompt />
          <IOSInstallPrompt />
        </Providers>
        <WebVitalsReporter />
      </body>
    </html>
  )
}
