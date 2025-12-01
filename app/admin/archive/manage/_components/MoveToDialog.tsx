/**
 * MoveToDialog Component
 *
 * Stream/Event 이동 대상 선택 다이얼로그
 * - Stream → Event 선택
 * - Event → Tournament 선택
 */

'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Search, Trophy, Folder, ChevronRight, ChevronDown } from 'lucide-react'
import type { Tournament } from '@/lib/types/archive'

interface MoveToDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemType: 'stream' | 'event'
  itemName: string
  currentParentId: string
  tournaments: Tournament[]
  onConfirm: (targetId: string, targetTournamentId?: string) => void
}

export function MoveToDialog({
  open,
  onOpenChange,
  itemType,
  itemName,
  currentParentId,
  tournaments,
  onConfirm,
}: MoveToDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())

  // 검색 필터링
  const filteredTournaments = useMemo(() => {
    if (!searchQuery.trim()) return tournaments

    const query = searchQuery.toLowerCase()
    return tournaments.filter((t) => {
      if (t.name.toLowerCase().includes(query)) return true
      if (itemType === 'stream') {
        return t.events?.some((e) => e.name.toLowerCase().includes(query))
      }
      return false
    })
  }, [tournaments, searchQuery, itemType])

  // Tournament 확장 토글
  const toggleTournament = (id: string) => {
    setExpandedTournaments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 선택 처리
  const handleSelect = (id: string, tournamentId?: string) => {
    // 현재 위치와 같으면 선택 불가
    if (id === currentParentId) return

    setSelectedId(id)
    setSelectedTournamentId(tournamentId || null)
  }

  // 확인 처리
  const handleConfirm = () => {
    if (!selectedId) return
    onConfirm(selectedId, selectedTournamentId || undefined)
    setSelectedId(null)
    setSelectedTournamentId(null)
    setSearchQuery('')
  }

  // 다이얼로그 닫기 시 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedId(null)
      setSelectedTournamentId(null)
      setSearchQuery('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move &quot;{itemName}&quot;</DialogTitle>
          <DialogDescription>
            Select a {itemType === 'stream' ? 'event' : 'tournament'} to move this{' '}
            {itemType} to.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selection List */}
        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-2">
            {itemType === 'event' ? (
              // Event → Tournament 선택
              <div className="space-y-1">
                {filteredTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    onClick={() => handleSelect(tournament.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent',
                      selectedId === tournament.id && 'bg-accent ring-2 ring-primary',
                      currentParentId === tournament.id &&
                        'cursor-not-allowed opacity-50'
                    )}
                  >
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="flex-1 truncate">{tournament.name}</span>
                    {currentParentId === tournament.id && (
                      <span className="text-xs text-muted-foreground">(current)</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Stream → Event 선택 (Tournament 확장 필요)
              <div className="space-y-1">
                {filteredTournaments.map((tournament) => (
                  <div key={tournament.id}>
                    {/* Tournament Header */}
                    <div
                      onClick={() => toggleTournament(tournament.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      {expandedTournaments.has(tournament.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="flex-1 truncate text-sm font-medium">
                        {tournament.name}
                      </span>
                    </div>

                    {/* Events */}
                    {expandedTournaments.has(tournament.id) && (
                      <div className="ml-4 space-y-1 border-l pl-2">
                        {tournament.events?.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleSelect(event.id, tournament.id)}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent',
                              selectedId === event.id &&
                                'bg-accent ring-2 ring-primary',
                              currentParentId === event.id &&
                                'cursor-not-allowed opacity-50'
                            )}
                          >
                            <Folder className="h-4 w-4 text-green-500" />
                            <span className="flex-1 truncate text-sm">
                              {event.name}
                            </span>
                            {currentParentId === event.id && (
                              <span className="text-xs text-muted-foreground">
                                (current)
                              </span>
                            )}
                          </div>
                        ))}
                        {(!tournament.events || tournament.events.length === 0) && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No events
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredTournaments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Search className="mb-2 h-6 w-6" />
                <p className="text-sm">No results found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
