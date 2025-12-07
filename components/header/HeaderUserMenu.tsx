"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { User, LogOut, LayoutDashboard, Bookmark } from "lucide-react"
import type { AuthUser } from "@/lib/auth/auth"
import type { UserProfile } from "@/lib/user-profile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderUserMenuProps {
  user: AuthUser
  profile: UserProfile | null
  isUserAdmin: boolean
  onSignOut: () => void
  getUserInitials: () => string
  getDisplayName: () => string
  getAvatarUrl: () => string | undefined
}

export function HeaderUserMenu({
  user,
  isUserAdmin,
  onSignOut,
  getUserInitials,
  getDisplayName,
  getAvatarUrl,
}: HeaderUserMenuProps) {
  const router = useRouter()
  const avatarUrl = getAvatarUrl()
  const displayName = getDisplayName()
  const initials = getUserInitials()

  return (
    <div className="relative hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex text-sm bg-muted rounded-full focus:ring-4 focus:ring-border transition-all hover:ring-2 hover:ring-border"
          >
            <span className="sr-only">Open user menu</span>
            {avatarUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden relative">
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center">
                <span className="text-sm font-semibold text-background">{initials}</span>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end">
          {/* User Info */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Main Menu - 모든 사용자에게 표시 */}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/bookmarks")}>
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmarks
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {/* Admin Menu */}
          {isUserAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
