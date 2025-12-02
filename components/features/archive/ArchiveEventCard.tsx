"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Folder,
  FileVideo,
  Video,
  Users,
  PlayCircle,
  Calendar,
  Trophy,
  ChevronRight,
  ChevronDown,
  MoreVertical
} from "lucide-react"
import { ArchiveStatsBadge } from "@/components/features/archive/ArchiveStatsBadge"
import { Progress } from "@/components/ui/progress"
import type { FolderItem } from "@/lib/types/archive"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryLogo } from "@/components/common/CategoryLogo"

interface ArchiveEventCardProps {
  item: FolderItem
  onClick?: () => void
  menuItems?: React.ReactNode
  isAdmin?: boolean
  variant?: 'list' | 'grid'
}

export function ArchiveEventCard({
  item,
  onClick,
  menuItems,
  variant = 'list'
}: ArchiveEventCardProps) {
  // Get category-based styling
  const getCategoryGradient = (category?: string) => {
    switch (category) {
      case 'WSOP':
        return 'from-yellow-500/10 via-amber-500/5 to-orange-500/10'
      case 'Triton':
        return 'from-blue-500/10 via-cyan-500/5 to-teal-500/10'
      case 'EPT':
        return 'from-red-500/10 via-rose-500/5 to-pink-500/10'
      case 'Hustler Casino Live':
        return 'from-purple-500/10 via-violet-500/5 to-indigo-500/10'
      case 'APT':
        return 'from-green-500/10 via-emerald-500/5 to-teal-500/10'
      case 'APL':
        return 'from-orange-500/10 via-amber-500/5 to-yellow-500/10'
      case 'GGPOKER':
        return 'from-indigo-500/10 via-blue-500/5 to-cyan-500/10'
      default:
        return 'from-muted/50 to-muted/20'
    }
  }

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'WSOP':
        return 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400'
      case 'Triton':
        return 'border-blue-500/50 text-blue-600 dark:text-blue-400'
      case 'EPT':
        return 'border-red-500/50 text-red-600 dark:text-red-400'
      case 'Hustler Casino Live':
        return 'border-purple-500/50 text-purple-600 dark:text-purple-400'
      case 'APT':
        return 'border-green-500/50 text-green-600 dark:text-green-400'
      case 'APL':
        return 'border-orange-500/50 text-orange-600 dark:text-orange-400'
      case 'GGPOKER':
        return 'border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
      default:
        return 'border-muted-foreground/50'
    }
  }

  // Get event status
  const getEventStatus = () => {
    const data = item.data as any
    if (!data?.start_date) return null

    const startDate = new Date(data.start_date)
    const endDate = data.end_date ? new Date(data.end_date) : null
    const now = new Date()

    if (startDate > now) {
      return { label: 'Upcoming', variant: 'warning' as const }
    } else if (endDate && endDate < now) {
      return { label: 'Completed', variant: 'default' as const }
    } else {
      return { label: 'Live', variant: 'success' as const }
    }
  }

  // Calculate progress (if tournament)
  const getProgress = () => {
    const data = item.data as any
    if (item.type !== 'tournament' || !data?.start_date || !data?.end_date) return null

    const start = new Date(data.start_date).getTime()
    const end = new Date(data.end_date).getTime()
    const now = new Date().getTime()

    if (now < start) return 0
    if (now > end) return 100

    const progress = ((now - start) / (end - start)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  const getIcon = (category?: string) => {
    // If category exists, show logo instead
    if (category && (item.type === 'tournament' || item.type === 'event')) {
      return <CategoryLogo category={category} size="md" fallback="icon" />
    }

    // Default icons for other types
    switch (item.type) {
      case 'tournament':
        return <Folder className="h-5 w-5" />
      case 'event':
        return <Folder className="h-5 w-5" />
      case 'stream':
        return <FileVideo className="h-5 w-5" />
      case 'unorganized':
        return <Video className="h-5 w-5" />
      default:
        return <Folder className="h-5 w-5" />
    }
  }

  const data = item.data as any
  const status = getEventStatus()
  const progress = getProgress()
  const gradient = getCategoryGradient(data?.category)
  const badgeColor = getCategoryBadgeColor(data?.category)

  if (variant === 'grid') {
    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:shadow-xl hover:scale-[1.02]",
          `bg-gradient-to-br ${gradient}`
        )}
        onClick={onClick}
      >
        {/* Dropdown Menu */}
        {menuItems && (
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Icon Area */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              {getIcon(data?.category)}
            </div>
            {status && (
              <Badge variant={status.variant === 'success' ? 'default' : status.variant}>
                {status.label}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg line-clamp-2 mb-2">{item.name}</h3>

          {/* Category Badge */}
          {data?.category && (
            <Badge variant="outline" className={cn("text-xs mb-3", badgeColor)}>
              {data.category}
            </Badge>
          )}

          {/* Date Range */}
          {data?.start_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(data.start_date).toLocaleDateString()}
                {data.end_date && ` - ${new Date(data.end_date).toLocaleDateString()}`}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {progress !== null && (
            <div className="mb-3">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% Complete</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mb-4">
            {item.itemCount !== undefined && item.itemCount > 0 && (
              <ArchiveStatsBadge
                icon={item.type === 'tournament' ? Folder : FileVideo}
                value={item.itemCount}
                variant="default"
                size="sm"
              />
            )}
            {data?.total_hands && (
              <ArchiveStatsBadge
                icon={PlayCircle}
                value={data.total_hands}
                variant="primary"
                size="sm"
              />
            )}
            {data?.total_players && (
              <ArchiveStatsBadge
                icon={Users}
                value={data.total_players}
                variant="success"
                size="sm"
              />
            )}
          </div>

          {/* Prize Pool */}
          {data?.prize_pool && (
            <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
              <Trophy className="h-4 w-4" />
              <span>{data.prize_pool}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/30 flex items-center justify-between border-t">
          <span className="text-xs text-muted-foreground">
            {item.type === 'tournament' ? 'Tournament' : item.type === 'event' ? 'Event' : 'Video'}
          </span>
          {(item.type === 'tournament' || item.type === 'event') && (
            item.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )
          )}
        </div>
      </Card>
    )
  }

  // Calculate indentation based on level
  const indentLevel = item.level || 0
  const paddingLeft = indentLevel * 24 // 24px per level (pl-0, pl-6, pl-12)

  // Determine chevron icon
  const ChevronIcon = item.isExpanded ? ChevronDown : ChevronRight
  const showChevron = item.type === 'tournament' || item.type === 'event'

  // List variant
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:scale-[1.01]",
        `bg-gradient-to-r ${gradient} p-3`
      )}
      style={{ paddingLeft: `${12 + paddingLeft}px` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 shrink-0">
          {getIcon(data?.category)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
            {status && (
              <Badge variant={status.variant === 'success' ? 'default' : status.variant} className="text-xs shrink-0">
                {status.label}
              </Badge>
            )}
            {data?.category && (
              <Badge variant="outline" className={cn("text-xs shrink-0", badgeColor)}>
                {data.category}
              </Badge>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {data?.start_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {data.end_date && ` - ${new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              </div>
            )}
            {item.itemCount !== undefined && item.itemCount > 0 && (
              <ArchiveStatsBadge
                icon={item.type === 'tournament' ? Folder : FileVideo}
                value={item.itemCount}
                variant="default"
                size="sm"
              />
            )}
            {data?.total_hands && (
              <ArchiveStatsBadge
                icon={PlayCircle}
                value={data.total_hands}
                variant="primary"
                size="sm"
              />
            )}
            {data?.prize_pool && (
              <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Trophy className="h-3 w-3" />
                <span>{data.prize_pool}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          {progress !== null && progress > 0 && progress < 100 && (
            <div className="mt-2">
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {menuItems && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {showChevron && (
            <ChevronIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>
    </Card>
  )
}
