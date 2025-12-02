"use client"

/**
 * Archive Info Dialog
 *
 * 토너먼트/서브이벤트/데이 상세 정보 표시
 * - 레벨별 다른 정보 렌더링
 * - 관리자: Edit/Delete 버튼
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit, Trash2, Calendar, MapPin, DollarSign, Users, Video, Hash, ExternalLink } from "lucide-react"
import { CategoryLogo } from "@/components/common/CategoryLogo"
import { format } from "date-fns"
import type { FolderItem, Tournament, Event, Stream } from "@/lib/types/archive"

interface ArchiveInfoDialogProps {
  item: FolderItem | null
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
  onEdit?: (item: FolderItem) => void
  onDelete?: (item: FolderItem) => void
}

export function ArchiveInfoDialog({
  item,
  isOpen,
  onClose,
  isAdmin = false,
  onEdit,
  onDelete
}: ArchiveInfoDialogProps) {
  if (!item) return null

  const handleEdit = () => {
    onEdit?.(item)
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      onDelete?.(item)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'tournament' && '🏆 Tournament Details'}
            {item.type === 'event' && '📋 Event Details'}
            {item.type === 'stream' && '📺 Stream Details'}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this {item.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Information */}
          {item.type === 'tournament' && item.data && 'category' in item.data && (
            <TournamentInfo tournament={item.data as Tournament} />
          )}

          {/* Event Information */}
          {item.type === 'event' && item.data && 'buyIn' in item.data && (
            <EventInfo event={item.data as Event} />
          )}

          {/* Stream Information */}
          {item.type === 'stream' && item.data && 'videoUrl' in item.data && (
            <StreamInfo stream={item.data as Stream} />
          )}

          {/* Common Info: Item Count */}
          {item.itemCount !== undefined && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Contains:</span>
                <Badge variant="secondary">
                  {item.itemCount} {item.type === 'tournament' ? 'events' : item.type === 'event' ? 'streams' : 'hands'}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <DialogFooter className="flex gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}

        {!isAdmin && (
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ==================== Tournament Info ====================
function TournamentInfo({ tournament }: { tournament: Tournament }) {
  return (
    <div className="space-y-4">
      {/* Title & Logo */}
      <div className="flex items-start gap-4">
        <CategoryLogo category={tournament.category} size="lg" />
        <div className="flex-1">
          <h3 className="text-lg font-bold">{tournament.name}</h3>
          <Badge variant="outline" className="mt-1">
            {tournament.category}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem
          icon={<MapPin className="h-4 w-4" />}
          label="Location"
          value={tournament.location}
        />
        <InfoItem
          icon={<Calendar className="h-4 w-4" />}
          label="Start Date"
          value={format(new Date(tournament.startDate), "MMM dd, yyyy")}
        />
        <InfoItem
          icon={<Calendar className="h-4 w-4" />}
          label="End Date"
          value={format(new Date(tournament.endDate), "MMM dd, yyyy")}
        />
        <InfoItem
          icon={<Hash className="h-4 w-4" />}
          label="Events"
          value={`${tournament.events?.length || 0} events`}
        />
      </div>
    </div>
  )
}

// ==================== Event Info ====================
function EventInfo({ event }: { event: Event }) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold">{event.name}</h3>
        {event.date && (
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(event.date), "MMMM dd, yyyy")}
          </p>
        )}
      </div>

      <Separator />

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {event.buyIn && (
          <InfoItem
            icon={<DollarSign className="h-4 w-4" />}
            label="Buy-in"
            value={event.buyIn}
          />
        )}
        {event.totalPrize && (
          <InfoItem
            icon={<DollarSign className="h-4 w-4" />}
            label="Prize Pool"
            value={event.totalPrize}
          />
        )}
        {event.entryCount !== undefined && (
          <InfoItem
            icon={<Users className="h-4 w-4" />}
            label="Entries"
            value={`${event.entryCount} players`}
          />
        )}
        {event.winner && (
          <InfoItem
            icon={<Users className="h-4 w-4" />}
            label="Winner"
            value={event.winner}
          />
        )}
        {event.startingStack && (
          <InfoItem
            icon={<Hash className="h-4 w-4" />}
            label="Starting Stack"
            value={event.startingStack.toLocaleString()}
          />
        )}
        {event.levelDuration && (
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Level Duration"
            value={`${event.levelDuration} min`}
          />
        )}
      </div>

      {/* Notes */}
      {event.notes && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Notes</p>
            <p className="text-sm text-muted-foreground">{event.notes}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ==================== Stream Info ====================
function StreamInfo({ stream }: { stream: Stream }) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold">{stream.name}</h3>
      </div>

      <Separator />

      {/* Video Information */}
      <div className="space-y-3">
        <InfoItem
          icon={<Video className="h-4 w-4" />}
          label="Video Source"
          value={
            <Badge variant={stream.videoSource === 'youtube' ? 'default' : 'secondary'}>
              {stream.videoSource === 'youtube' ? 'YouTube' : 'Uploaded'}
            </Badge>
          }
        />

        {stream.videoUrl && (
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Video URL</p>
              <a
                href={stream.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all"
              >
                {stream.videoUrl}
              </a>
            </div>
          </div>
        )}

        {stream.videoFile && (
          <InfoItem
            icon={<Video className="h-4 w-4" />}
            label="Video File"
            value={stream.videoFile}
          />
        )}
      </div>

      {stream.createdAt && (
        <>
          <Separator />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Created"
            value={format(new Date(stream.createdAt), "MMM dd, yyyy 'at' HH:mm")}
          />
        </>
      )}
    </div>
  )
}

// ==================== Info Item Component ====================
function InfoItem({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">
          {typeof value === 'string' ? value : value}
        </p>
      </div>
    </div>
  )
}
