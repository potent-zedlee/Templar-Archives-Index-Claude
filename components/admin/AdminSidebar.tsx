"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
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
  Upload,
  Sparkles,
  Globe,
  AlertCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePipelineStatusCounts, type PipelineStatusCounts } from "@/lib/queries/admin-archive-queries"
import { cn } from "@/lib/utils"
import type { PipelineStatus } from "@/lib/types/archive"

/**
 * Archive 파이프라인 서브메뉴 아이템
 */
interface PipelineSubItem {
  title: string
  status: PipelineStatus
  icon: LucideIcon
  color?: string
}

const pipelineSubItems: PipelineSubItem[] = [
  { title: "Uploaded", status: "uploaded", icon: Upload, color: "text-muted-foreground" },
  { title: "Analyzing", status: "analyzing", icon: Sparkles, color: "text-blue-500" },
  { title: "Published", status: "published", icon: Globe, color: "text-emerald-500" },
  { title: "Failed", status: "failed", icon: AlertCircle, color: "text-red-500" },
]

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
    // subItems는 동적으로 렌더링 (파이프라인 상태별)
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

/**
 * 파이프라인 카운트 배지 컴포넌트
 */
function CountBadge({
  count,
  isActive,
  isFailed
}: {
  count: number
  isActive?: boolean
  isFailed?: boolean
}) {
  if (count === 0) return null

  return (
    <Badge
      variant={isFailed ? "destructive" : isActive ? "default" : "secondary"}
      className={cn(
        "ml-auto h-5 min-w-[20px] px-1.5 text-xs font-medium",
        !isFailed && !isActive && "bg-muted text-muted-foreground"
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  )
}

/**
 * Archive 파이프라인 서브메뉴 컴포넌트
 */
function ArchivePipelineSubMenu() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: counts } = usePipelineStatusCounts()

  const currentStatus = searchParams?.get("status")
  // Pipeline 페이지에서 활성 상태 확인
  const isPipelinePage = pathname === "/admin/archive/pipeline"

  return (
    <SidebarMenuSub>
      {pipelineSubItems.map((item) => {
        const Icon = item.icon
        const count = counts?.[item.status as keyof PipelineStatusCounts] ?? 0
        const isActive = isPipelinePage && currentStatus === item.status
        const isFailed = item.status === "failed"

        return (
          <SidebarMenuSubItem key={item.status}>
            <SidebarMenuSubButton
              asChild
              isActive={isActive}
            >
              <Link href={`/admin/archive/pipeline?status=${item.status}`}>
                <Icon className={cn("h-4 w-4", item.color)} />
                <span>{item.title}</span>
                <CountBadge
                  count={count}
                  isActive={isActive}
                  isFailed={isFailed}
                />
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </SidebarMenuSub>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { data: counts } = usePipelineStatusCounts()

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    // Archive의 경우 쿼리 파라미터 있어도 active
    if (href === "/admin/archive") {
      return pathname === href || pathname?.startsWith("/admin/archive")
    }
    return pathname?.startsWith(href)
  }

  // Archive 전체 대기 작업 수 (uploaded + failed)
  const archivePendingCount = counts
    ? (counts.uploaded + counts.failed)
    : 0

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
                const isArchive = item.href === "/admin/archive"

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {/* Archive 메뉴에 전체 대기 작업 수 표시 */}
                        {isArchive && archivePendingCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-[20px] px-1.5 text-xs"
                          >
                            {archivePendingCount > 99 ? "99+" : archivePendingCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>

                    {/* Archive 파이프라인 서브메뉴 */}
                    {isArchive && <ArchivePipelineSubMenu />}

                    {/* 일반 서브메뉴 (Archive 제외) */}
                    {!isArchive && item.subItems && item.subItems.length > 0 && (
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
