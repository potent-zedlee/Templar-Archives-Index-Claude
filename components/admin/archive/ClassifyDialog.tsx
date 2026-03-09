'use client'

/**
 * ClassifyDialog - 스트림 분류 다이얼로그
 *
 * 미분류 스트림을 토너먼트/이벤트에 할당
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FolderTree, Loader2 } from 'lucide-react'
import {
  useAdminTournamentsQuery,
  useAdminEventsQuery,
  useClassifyStream,
  type AdminStream,
} from '@/lib/queries/admin-archive-queries'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface ClassifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stream: AdminStream | null
  onSuccess?: () => void
}

export function ClassifyDialog({
  open,
  onOpenChange,
  stream,
  onSuccess,
}: ClassifyDialogProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  // 토너먼트 목록 조회
  const { data: tournaments, isLoading: tournamentsLoading } = useAdminTournamentsQuery('all')

  // 선택된 토너먼트의 이벤트 목록 조회
  const { data: events, isLoading: eventsLoading } = useAdminEventsQuery(
    selectedTournamentId,
    'all'
  )

  // 분류 mutation
  const classifyMutation = useClassifyStream()

  // 다이얼로그 열릴 때 초기화
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setSelectedTournamentId('')
      setSelectedEventId('')
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // 토너먼트 변경 핸들러
  const handleTournamentChange = useCallback((value: string) => {
    setSelectedTournamentId(value)
    setSelectedEventId('')
  }, [])

  const handleClassify = async () => {
    if (!stream || !selectedTournamentId || !selectedEventId) return

    try {
      await classifyMutation.mutateAsync({
        streamId: stream.id,
        tournamentId: selectedTournamentId,
        eventId: selectedEventId,
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('[ClassifyDialog] Error:', error)
    }
  }

  const selectedTournament = tournaments?.find((t) => t.id === selectedTournamentId)
  const selectedEvent = events?.find((e) => e.id === selectedEventId)

  const canSubmit = selectedTournamentId && selectedEventId && !classifyMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            스트림 분류
          </DialogTitle>
          <DialogDescription>
            스트림을 토너먼트와 이벤트에 할당합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 스트림 정보 */}
          {stream && (
            <div className="p-3 rounded-lg bg-muted border border-border">
              <p className="text-sm font-medium">{stream.name}</p>
              {stream.description && (
                <p className="text-xs text-muted-foreground mt-1">{stream.description}</p>
              )}
            </div>
          )}

          {/* 토너먼트 선택 */}
          <div className="space-y-2">
            <Label htmlFor="tournament-select">토너먼트</Label>
            <Select
              value={selectedTournamentId}
              onValueChange={handleTournamentChange}
              disabled={tournamentsLoading || classifyMutation.isPending}
            >
              <SelectTrigger id="tournament-select" className="w-full">
                <SelectValue placeholder="토너먼트를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {tournamentsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    로딩 중...
                  </div>
                ) : tournaments && tournaments.length > 0 ? (
                  tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    토너먼트가 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 이벤트 선택 */}
          <div className="space-y-2">
            <Label htmlFor="event-select">이벤트</Label>
            <Select
              value={selectedEventId}
              onValueChange={setSelectedEventId}
              disabled={!selectedTournamentId || eventsLoading || classifyMutation.isPending}
            >
              <SelectTrigger id="event-select" className="w-full">
                <SelectValue placeholder="이벤트를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {eventsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    로딩 중...
                  </div>
                ) : events && events.length > 0 ? (
                  events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))
                ) : selectedTournamentId ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    이벤트가 없습니다
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    먼저 토너먼트를 선택하세요
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 선택 요약 */}
          {selectedTournament && selectedEvent && (
            <Alert>
              <AlertDescription className="text-sm">
                <p className="font-medium">분류 대상:</p>
                <p className="text-muted-foreground mt-1">
                  {selectedTournament.name} &gt; {selectedEvent.name}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* 에러 메시지 */}
          {classifyMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                분류에 실패했습니다. 다시 시도해주세요.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={classifyMutation.isPending}
          >
            취소
          </Button>
          <Button
            onClick={handleClassify}
            disabled={!canSubmit}
          >
            {classifyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                분류 중...
              </>
            ) : (
              <>
                <FolderTree className="h-4 w-4 mr-2" />
                분류
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
