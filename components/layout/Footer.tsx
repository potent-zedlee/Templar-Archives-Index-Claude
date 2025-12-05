"use client"

import Link from "next/link"
import { CookieSettingsDialog } from "@/components/dialogs/CookieSettingsDialog"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const navigationLinks = [
    { href: "/search", label: "Search" },
    { href: "/archive", label: "Archive" },
    { href: "/players", label: "Players" },
  ]

  const aboutLinks = [
    { href: "/about", label: "About Us" },
  ]

  const legalLinks = [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/cookies", label: "Cookie Policy" },
    { href: "/legal/dmca", label: "DMCA Policy" },
    { href: "/legal/affiliate", label: "Affiliate Disclosure" },
  ]

  return (
    <footer className="border-t border-border bg-background">
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600">
                <span className="font-mono text-lg font-bold text-white dark:text-background">TA</span>
              </div>
              <span className="text-lg font-bold text-foreground">Templar Archives Index</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The ultimate poker hand history archive. Analyze, learn, and improve your game.
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} Templar Archives Index. All rights reserved.
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">About</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Navigation</h3>
            <ul className="space-y-2">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Legal & Resources</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/templar-archives"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                  aria-label="Templar Archives GitHub (새 탭에서 열림)"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="mailto:legal@templararchives.com"
                  className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                >
                  Contact Legal
                </a>
              </li>
              <li>
                <CookieSettingsDialog>
                  <button className="text-sm text-muted-foreground hover:text-gold-400 dark:hover:text-gold-300 transition-colors text-left">
                    Cookie Settings
                  </button>
                </CookieSettingsDialog>
              </li>
            </ul>
          </div>
        </div>

        {/* Open Source Credits */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Built with{" "}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
              Next.js
            </a>
            {", "}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
              React
            </a>
            {", "}
            <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
              Firebase
            </a>
            {", and "}
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
              Tailwind CSS
            </a>
            . Powered by{" "}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
              Claude AI
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
