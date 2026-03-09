import Link from 'next/link'
import { HeaderLogo } from '@/components/header/HeaderLogo'
import {
  Github,
  Twitter,
  Youtube,
  Mail,
  ExternalLink,
  Shield,
  FileText,
  Lock,
} from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'Platform',
      links: [
        { label: 'Archive', href: '/archive' },
        { label: 'Hands', href: '/hands' },
        { label: 'Players', href: '/players' },
        { label: 'Search', href: '/search' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Strategy', href: '/community?category=strategy' },
        { label: 'News', href: '/community?category=news' },
        { label: 'Bookmarks', href: '/bookmarks' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '/legal/terms', icon: FileText },
        { label: 'Privacy Policy', href: '/legal/privacy', icon: Shield },
        { label: 'Cookie Policy', href: '/legal/cookies', icon: Lock },
        { label: 'DMCA', href: '/legal/dmca', icon: Shield },
      ],
    },
  ]

  return (
    <footer className="bg-black-100 border-t-2 border-gold-700/20 pt-12 pb-8">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo & Info */}
          <div className="col-span-2 lg:col-span-2">
            <HeaderLogo />
            <p className="mt-4 text-sm text-text-muted max-w-xs leading-relaxed">
              Professional poker hand history archive. Manage, share, and study high-stakes tournament play from around the world.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-text-muted hover:text-gold-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-gold-400 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-gold-400 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="mailto:jhng.mov@gmail.com" className="text-text-muted hover:text-gold-400 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-caption text-gold-400 font-bold mb-4 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.icon && <link.icon className="h-3 w-3" />}
                      {link.label}
                      <ExternalLink className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gold-700/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted font-mono">
            &copy; {currentYear} TEMPLAR ARCHIVES INDEX. ALL RIGHTS RESERVED.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Built with{" "}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-medium">
              Next.js
            </a>
            {", "}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-medium">
              React
            </a>
            {", "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-medium">
              Supabase
            </a>
            {", and "}
            <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold-500 dark:hover:text-gold-400 transition-colors font-medium">
              Tailwind CSS
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
