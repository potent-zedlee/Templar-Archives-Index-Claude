"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  Archive,
  FileCheck,
  ShieldAlert,
  Settings,
  Keyboard,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  subItems?: {
    title: string
    href: string
    icon: LucideIcon
  }[]
}

const adminMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Archive",
    href: "/admin/archive",
    icon: Archive,
  },
  {
    title: "Hand Input",
    href: "/admin/hand-input",
    icon: Keyboard,
  },
  {
    title: "Edit Requests",
    href: "/admin/edit-requests",
    icon: FileCheck,
  },
  {
    title: "Claims",
    href: "/admin/claims",
    icon: ShieldAlert,
  },
  {
    title: "Content",
    href: "/admin/content",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarContent>
        {/* Admin Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    {/* 일반 서브메뉴 */}
                    {item.subItems && item.subItems.length > 0 && (
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon
                          return (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Link
          href="/"
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Public Site
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
