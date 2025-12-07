"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { signOut } from "@/lib/auth/auth"
import { NotificationBell } from "@/components/common/NotificationBell"
import { HeaderLogo } from "./HeaderLogo"
import { HeaderDesktopNav } from "./HeaderDesktopNav"
import { HeaderUserMenu } from "./HeaderUserMenu"
import { HeaderMobileMenu } from "./HeaderMobileMenu"
import { ThemeToggle } from "./ThemeToggle"
import type { NavLink } from "./HeaderDesktopNav"

export function Header() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // profile.role에서 직접 권한 확인 (추가 Firestore 호출 불필요)
  const isUserAdmin = useMemo(() => {
    return profile?.role === 'admin' || profile?.role === 'high_templar'
  }, [profile?.role])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getUserInitials = (): string => {
    if (profile?.nickname) {
      return profile.nickname.charAt(0).toUpperCase()
    }
    if (!user?.user_metadata?.full_name && !user?.email) return "U"
    const name = user.user_metadata?.full_name || user.email || "U"
    return name.charAt(0).toUpperCase()
  }

  const getDisplayName = (): string => {
    if (profile?.nickname) return profile.nickname
    return user?.user_metadata?.full_name || "User"
  }

  const getAvatarUrl = (): string | undefined => {
    if (profile?.avatarUrl) return profile.avatarUrl
    return user?.user_metadata?.avatar_url || undefined
  }

  const navLinks: NavLink[] = [
    { href: "/search", label: "SEARCH" },
    { href: "/archive/tournament", label: "TOURNAMENT" },
    { href: "/archive/cash-game", label: "CASH GAME" },
    { href: "/players", label: "PLAYER" },
  ]

  return (
    <>
      {/* Floating Glass Navbar */}
      <nav className="sticky top-0 z-[100] w-full glass border-b border-gold-500/30 supports-[backdrop-filter]:bg-background/60" role="banner">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + Navigation Menu */}
          <div className="flex items-center gap-8">
            <HeaderLogo />
            <HeaderDesktopNav navLinks={navLinks} />
          </div>

          {/* Right: Theme Toggle, Notification, Profile */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />

            {/* Login/Profile UI */}
            {!authLoading && (
              <>
                {user ? (
                  <HeaderUserMenu
                    user={user}
                    profile={profile}
                    isUserAdmin={isUserAdmin}
                    onSignOut={handleSignOut}
                    getUserInitials={getUserInitials}
                    getDisplayName={getDisplayName}
                    getAvatarUrl={getAvatarUrl}
                  />
                ) : (
                  <button
                    type="button"
                    data-testid="login-button"
                    className="hidden md:inline-flex text-foreground bg-transparent border border-border hover:bg-gold-50 hover:border-gold-300 hover:text-gold-700 dark:hover:bg-gold-900/20 dark:hover:text-gold-400 focus:ring-4 focus:outline-none focus:ring-ring font-medium rounded-lg text-sm px-4 py-2 transition-colors"
                    onClick={() => router.push("/auth/login")}
                  >
                    LOGIN
                  </button>
                )}
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center p-2 w-9 h-9 justify-center text-muted-foreground rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Toggle menu</span>
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <HeaderMobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          navLinks={navLinks}
          user={user}
          profile={profile}
          isUserAdmin={isUserAdmin}
          authLoading={authLoading}
          onSignOut={handleSignOut}
          getUserInitials={getUserInitials}
          getDisplayName={getDisplayName}
          getAvatarUrl={getAvatarUrl}
        />
      </nav>
    </>
  )
}
