"use client"

import { Folder, FileVideo, Video, Play, ChevronRight, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash, FolderPlus, FolderInput, CheckSquare } from "lucide-react"
import { motion } from "motion/react"
import type { FolderItem } from "@/lib/types/archive"
import Image from "next/image"
import { ArchiveEventCard } from "@/components/features/archive/ArchiveEventCard"

interface ArchiveGridViewProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectStream?: (streamId: string) => void
  loading?: boolean
  isUnorganized?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onRename?: (item: FolderItem) => void
  onDelete?: (item: FolderItem) => void
  onMoveToEvent?: (item: FolderItem) => void
  onMoveToNewEvent?: (item: FolderItem) => void
  onAddSubItem?: (item: FolderItem) => void
  onEditEvent?: (item: FolderItem) => void
  isAdmin?: boolean
}

export function ArchiveGridView({
  items,
  onNavigate,
  onSelectStream,
  loading = false,
  isUnorganized = false,
  selectedIds = new Set(),
  onToggleSelect,
  onRename,
  onDelete,
  onMoveToEvent,
  onMoveToNewEvent,
  onAddSubItem,
  onEditEvent,
  isAdmin = false,
}: ArchiveGridViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Folder className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No items to display</p>
        <p className="text-sm mt-1">Create a new tournament or upload videos to get started</p>
      </div>
    )
  }

  const getIcon = (type: FolderItem['type']) => {
    switch (type) {
      case 'tournament':
        return <Folder className="h-6 w-6 text-blue-500" />
      case 'event':
        return <Folder className="h-6 w-6 text-green-500" />
      case 'stream':
        return <FileVideo className="h-6 w-6 text-purple-500" />
      case 'unorganized':
        return <Video className="h-6 w-6 text-orange-500" />
      default:
        return <Folder className="h-6 w-6" />
    }
  }

  const getYouTubeThumbnail = (item: FolderItem): string | null => {
    const data = item.data as any
    if (!data?.video_url) return null

    // Extract YouTube video ID
    const match = data.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    if (!match) return null

    return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  }

  const handleItemClick = (item: FolderItem) => {
    if (item.type === 'stream' && onSelectStream && !isUnorganized) {
      onSelectStream(item.id)
    } else if (!isUnorganized && item.type !== 'stream') {
      onNavigate(item)
    }
  }

  const renderDropdownMenu = (item: FolderItem) => {
    // Tournament folder menu
    if (item.type === 'tournament') {
      return (
        <>
          <DropdownMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
          {isAdmin && onAddSubItem && (
            <DropdownMenuItem onClick={() => onAddSubItem(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Event
            </DropdownMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    // Event folder menu
    if (item.type === 'event') {
      return (
        <>
          <DropdownMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
          {isAdmin && onEditEvent && (
            <DropdownMenuItem onClick={() => onEditEvent(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Event Info
            </DropdownMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    // Stream (video) menu - for organized videos
    if (item.type === 'stream' && !isUnorganized) {
      return (
        <>
          <DropdownMenuItem onClick={() => onSelectStream && onSelectStream(item.id)}>
            <Play className="mr-2 h-4 w-4" />
            View Hands
          </DropdownMenuItem>
          {isAdmin && (onMoveToEvent || onMoveToNewEvent) && <DropdownMenuSeparator />}
          {isAdmin && onMoveToEvent && (
            <DropdownMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </DropdownMenuItem>
          )}
          {isAdmin && onMoveToNewEvent && (
            <DropdownMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </DropdownMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    // Unorganized video menu
    if (item.type === 'stream' && isUnorganized) {
      return (
        <>
          {onToggleSelect && (
            <DropdownMenuItem onClick={() => onToggleSelect(item.id)}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectedIds.has(item.id) ? 'Deselect' : 'Select'}
            </DropdownMenuItem>
          )}
          {(onMoveToEvent || onMoveToNewEvent) && <DropdownMenuSeparator />}
          {onMoveToEvent && (
            <DropdownMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </DropdownMenuItem>
          )}
          {onMoveToNewEvent && (
            <DropdownMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </DropdownMenuItem>
          )}
          {isAdmin && (onRename || onDelete) && <DropdownMenuSeparator />}
          {isAdmin && onRename && (
            <DropdownMenuItem onClick={() => onRename(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
    >
      {items.map((item, index) => {
        // Use ArchiveEventCard for tournaments and subevents
        if (item.type === 'tournament' || item.type === 'event') {
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArchiveEventCard
                item={item}
                onClick={() => handleItemClick(item)}
                menuItems={renderDropdownMenu(item)}
                isAdmin={isAdmin}
                variant="grid"
              />
            </motion.div>
          )
        }

        // Use existing card for stream/video/unorganized items
        const thumbnail = getYouTubeThumbnail(item)
        const isFolder = item.type === 'unorganized'
        const isSelected = selectedIds.has(item.id)

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`
                group relative overflow-hidden transition-all duration-300 cursor-pointer
                ${isSelected ? 'ring-2 ring-primary' : ''}
                hover:shadow-xl
                ${!isFolder ? 'bg-gradient-to-br from-background via-background to-muted/20' : ''}
              `}
              onClick={() => handleItemClick(item)}
            >
              {/* Checkbox for unorganized videos */}
              {isUnorganized && onToggleSelect && (
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    className="bg-background/80 backdrop-blur-sm"
                  />
                </div>
              )}

              {/* Menu Button */}
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {renderDropdownMenu(item)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Thumbnail or Folder Icon */}
              <div className="aspect-video bg-muted/30 flex items-center justify-center relative overflow-hidden">
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={item.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {getIcon(item.type)}
                    {isFolder && item.itemCount !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Glassmorphism overlay on hover for videos */}
                {!isFolder && (
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-12 w-12 text-primary" />
                  </div>
                )}

                {/* Folder overlay */}
                {isFolder && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ChevronRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                  {item.name}
                </h3>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {item.itemCount !== undefined && item.itemCount > 0 && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{item.itemCount}</span>
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <div>
                  {item.type === 'stream' && !isUnorganized && (
                    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-600 dark:text-purple-400">
                      Video
                    </Badge>
                  )}
                  {item.type === 'stream' && isUnorganized && (
                    <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600 dark:text-orange-400">
                      Unorganized
                    </Badge>
                  )}
                  {item.type === 'unorganized' && (
                    <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600 dark:text-orange-400">
                      Folder
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
