"use client"

/**
 * Hand Search Dialog
 *
 * 핸드 검색 다이얼로그
 * Firestore 버전으로 마이그레이션됨
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
import { Search, ChevronRight } from "lucide-react"
import { firestore } from "@/lib/db/firebase"
import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  limit,
} from "firebase/firestore"
import { COLLECTION_PATHS } from "@/lib/db/firestore-types"
import type {
  FirestoreTournament,
  FirestoreEvent,
  FirestoreStream,
  FirestoreHand,
} from "@/lib/db/firestore-types"

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

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [hands, setHands] = useState<Hand[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 다이얼로그가 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setStep('tournament')
      setSelectedTournament(null)
      setSelectedEvent(null)
      setSelectedStream(null)
      setSearchQuery('')
      loadTournaments()
    }
  }, [open])

  // 토너먼트 목록 로드 (Firestore)
  const loadTournaments = async () => {
    setIsLoading(true)
    try {
      const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
      const q = query(tournamentsRef, orderBy('startDate', 'desc'), limit(20))
      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as FirestoreTournament
        return {
          id: doc.id,
          name: d.name,
          category: d.category,
          location: d.location,
          startDate: d.startDate?.toDate?.()?.toISOString() || '',
        }
      })
      setTournaments(data)
    } catch (error) {
      console.error('토너먼트 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Event 목록 로드 (Firestore)
  const loadEvents = async (tournamentId: string) => {
    setIsLoading(true)
    try {
      const eventsRef = collection(firestore, COLLECTION_PATHS.EVENTS(tournamentId))
      const q = query(eventsRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as FirestoreEvent
        return {
          id: doc.id,
          name: d.name,
          buyIn: d.buyIn,
        }
      })
      setEvents(data)
    } catch (error) {
      console.error('Event 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Stream 목록 로드 (Firestore)
  const loadStreams = async (eventId: string) => {
    setIsLoading(true)
    try {
      if (!selectedTournament) return

      const streamsRef = collection(
        firestore,
        COLLECTION_PATHS.STREAMS(selectedTournament.id, eventId)
      )
      const q = query(streamsRef, orderBy('name'))
      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as FirestoreStream
        return {
          id: doc.id,
          name: d.name,
        }
      })
      setStreams(data)
    } catch (error) {
      console.error('Stream 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Hand 목록 로드 (Firestore)
  const loadHands = async (streamId: string) => {
    setIsLoading(true)
    try {
      const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
      const q = query(
        handsRef,
        where('streamId', '==', streamId),
        orderBy('number')
      )
      const snapshot = await getDocs(q)

      const data = snapshot.docs.map((doc) => {
        const d = doc.data() as FirestoreHand
        return {
          id: doc.id,
          number: d.number,
          description: d.description,
          timestamp: d.timestamp,
        }
      })
      setHands(data)
    } catch (error) {
      console.error('Hand 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Tournament 선택
  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setStep('event')
    loadEvents(tournament.id)
  }

  // Event 선택
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event)
    setStep('stream')
    loadStreams(event.id)
  }

  // Stream 선택
  const handleSelectStream = (stream: Stream) => {
    setSelectedStream(stream)
    setStep('hand')
    loadHands(stream.id)
  }

  // Hand 선택
  const handleSelectHand = (hand: Hand) => {
    if (!selectedTournament || !selectedStream) return

    onSelect({
      id: hand.id,
      number: hand.number,
      description: hand.description,
      tournament: selectedTournament.name,
      stream: selectedStream.name,
    })
    onOpenChange(false)
  }

  // 뒤로 가기
  const handleBack = () => {
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
      return tournaments.filter((t) => t.name.toLowerCase().includes(query))
    } else if (step === 'event') {
      return events.filter((e) => e.name.toLowerCase().includes(query))
    } else if (step === 'stream') {
      return streams.filter((s) => s.name.toLowerCase().includes(query))
    } else if (step === 'hand') {
      return hands.filter((h) =>
        String(h.number).toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query)
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
            <div className="text-center py-12 text-muted-foreground">
              로딩 중...
            </div>
          ) : filteredItems().length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              결과가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {step === 'tournament' &&
                (filteredItems() as Tournament[]).map((tournament) => (
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
                (filteredItems() as Event[]).map((event) => (
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
                (filteredItems() as Stream[]).map((stream) => (
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
                (filteredItems() as Hand[]).map((hand) => (
                  <Card
                    key={hand.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectHand(hand)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge>#{hand.number}</Badge>
                          <span className="text-caption text-muted-foreground">{hand.timestamp}</span>
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
