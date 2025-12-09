"use client"

/**
 * Hand Search Dialog
 *
 * 핸드 검색 다이얼로그
 * React Query hooks 사용으로 리팩토링됨
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ChevronRight, Loader2 } from "lucide-react"
import {
  useTournamentsShallowQuery,
  useEventsQuery,
  useStreamsQuery,
  useHandsQuery,
} from "@/lib/queries/archive-queries"

type Tournament = {
  id: string
  name: string
  category: string
  location: string
  startDate: string
}

type Event = {
  id: string
  name: string
  buyIn?: string
}

type Stream = {
  id: string
  name: string
}

type Hand = {
  id: string
  number: number
  description: string
  timestamp: string
}

type HandSearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (hand: { id: string; number: number; description: string; tournament: string; stream: string }) => void
}

export function HandSearchDialog({ open, onOpenChange, onSelect }: HandSearchDialogProps) {
  const [step, setStep] = useState<'tournament' | 'event' | 'stream' | 'hand'>('tournament')
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)

  const [searchQuery, setSearchQuery] = useState('')

  // 1. Tournaments Query
  const { data: tournamentsData = [], isLoading: isLoadingTournaments } = useTournamentsShallowQuery('tournament')

  // 2. Events Query
  const { data: eventsData = [], isLoading: isLoadingEvents } = useEventsQuery(
    selectedTournament?.id || null,
    !!selectedTournament
  )

  // 3. Streams Query
  const { data: streamsData = [], isLoading: isLoadingStreams } = useStreamsQuery(
    selectedTournament?.id || null,
    selectedEvent?.id || null,
    !!selectedEvent
  )

  // 4. Hands Query
  const { data: handsData = [], isLoading: isLoadingHands } = useHandsQuery(
    selectedStream?.id || null
  )

  // 다이얼로그가 열릴 때 초기화
  // 다이얼로그가 닫힐 때 초기화
  useEffect(() => {
    if (open) return;

    const timer = setTimeout(() => {
      setStep('tournament')
      setSelectedTournament(null)
      setSelectedEvent(null)
      setSelectedStream(null)
      setSearchQuery('')
    }, 300) // Anim duration
    return () => clearTimeout(timer)
  }, [open])

  // Tournament 선택
  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setStep('event')
    setSearchQuery('')
  }

  // Event 선택
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event)
    setStep('stream')
    setSearchQuery('')
  }

  // Stream 선택
  const handleSelectStream = (stream: Stream) => {
    setSelectedStream(stream)
    setStep('hand')
    setSearchQuery('')
  }

  // Hand 선택
  const handleSelectHand = (hand: Hand) => {
    if (!selectedTournament || !selectedStream) return

    onSelect({
      id: hand.id,
      number: hand.number,
      description: hand.description || '',
      tournament: selectedTournament.name,
      stream: selectedStream.name,
    }) // 
    onOpenChange(false)
  }

  // 뒤로 가기
  const handleBack = () => {
    setSearchQuery('')
    if (step === 'hand') {
      setStep('stream')
      setSelectedStream(null)
    } else if (step === 'stream') {
      setStep('event')
      setSelectedEvent(null)
    } else if (step === 'event') {
      setStep('tournament')
      setSelectedTournament(null)
    }
  }

  // 검색 필터
  const filteredItems = () => {
    const query = searchQuery.toLowerCase()

    if (step === 'tournament') {
      return tournamentsData.filter((t) => t.name.toLowerCase().includes(query))
    } else if (step === 'event') {
      return eventsData.filter((e) => e.name.toLowerCase().includes(query))
    } else if (step === 'stream') {
      return streamsData.filter((s) => s.name.toLowerCase().includes(query))
    } else if (step === 'hand') {
      return handsData.filter((h) =>
        String(h.number).toLowerCase().includes(query) ||
        (h.description || '').toLowerCase().includes(query)
      )
    }
    return []
  }

  const getStepTitle = () => {
    switch (step) {
      case 'tournament':
        return 'Tournament 선택'
      case 'event':
        return 'Event 선택'
      case 'stream':
        return 'Stream 선택'
      case 'hand':
        return 'Hand 선택'
    }
  }

  const getBreadcrumb = () => {
    const parts = []
    if (selectedTournament) parts.push(selectedTournament.name)
    if (selectedEvent) parts.push(selectedEvent.name)
    if (selectedStream) parts.push(selectedStream.name)
    return parts.join(' > ')
  }

  const isLoading =
    (step === 'tournament' && isLoadingTournaments) ||
    (step === 'event' && isLoadingEvents) ||
    (step === 'stream' && isLoadingStreams) ||
    (step === 'hand' && isLoadingHands)

  const items = filteredItems()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {getBreadcrumb() || '핸드를 첨부할 토너먼트를 선택하세요'}
          </DialogDescription>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 뒤로 가기 버튼 */}
        {step !== 'tournament' && (
          <Button variant="outline" onClick={handleBack} size="sm">
            ← 뒤로
          </Button>
        )}

        {/* 목록 */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span>로딩 중...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              결과가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {step === 'tournament' &&
                (items as Tournament[]).map((tournament) => (
                  <Card
                    key={tournament.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectTournament(tournament)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body font-semibold">{tournament.name}</h3>
                        <p className="text-caption text-muted-foreground">
                          {tournament.location} • {new Date(tournament.startDate).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'event' &&
                (items as Event[]).map((event) => (
                  <Card
                    key={event.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body font-semibold">{event.name}</h3>
                        {event.buyIn && (
                          <p className="text-caption text-muted-foreground">Buy-in: {event.buyIn}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'stream' &&
                (items as Stream[]).map((stream) => (
                  <Card
                    key={stream.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectStream(stream)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-body font-semibold">{stream.name}</h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'hand' &&
                (items as Hand[]).map((hand) => (
                  <Card
                    key={hand.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectHand(hand)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge>#{hand.number}</Badge>
                          <span className="text-caption text-muted-foreground">
                            {/* Timestamp formatting if needed */}
                            {hand.timestamp}
                          </span>
                        </div>
                        {hand.description && (
                          <p className="text-body mt-1 line-clamp-2">{hand.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
