"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Clock, Plus, Save, User, UserPlus, X } from "lucide-react"
import { useCreateHandMutation } from "@/lib/queries/archive-queries"
import { SeatSelector } from "./SeatSelector"
import { PlayerSearchDialog } from "./PlayerSearchDialog"
import { ActionTimelineInput } from "./ActionTimelineInput"
import type { HandActionInput } from "@/lib/poker/hand-actions"

// Type definitions for local state
export type RecorderPlayer = {
    seat: number // 1-9
    playerId?: string
    name?: string
    stack?: number
    holeCards?: string // e.g. "AhKd"
    isDealer?: boolean
}

interface HandRecorderFormProps {
    streamId: string
    currentTime: number
    onSeek: (time: number) => void
}

export function HandRecorderForm({ streamId, currentTime, onSeek }: HandRecorderFormProps) {
    // --- State ---

    // Hand Meta
    const [handNumber, setHandNumber] = useState(1)
    const [blinds, setBlinds] = useState({ sb: 0, bb: 0, ante: 0 })
    const [timestampStart, setTimestampStart] = useState<number | null>(null)

    // Players (Persist between hands)
    const [players, setPlayers] = useState<RecorderPlayer[]>(
        Array.from({ length: 9 }, (_, i) => ({ seat: i + 1 }))
    )
    const [dealerSeat, setDealerSeat] = useState(1)

    // Actions
    const [actions, setActions] = useState<any[]>([]) // We'll define a simpler local action type

    // Current active street for recording
    const [activeStreet, setActiveStreet] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop')
    const [boardCards, setBoardCards] = useState({ flop: '', turn: '', river: '' })

    // Mutations
    const createHandMutation = useCreateHandMutation()

    // --- Helpers ---

    const handleSetTimestamp = () => {
        setTimestampStart(Math.floor(currentTime))
        toast.success(`Start time set to ${formatTime(currentTime)}`)
    }

    const handlePlayerAssign = (seat: number, player: { id: string, name: string }) => {
        setPlayers(prev => prev.map(p =>
            p.seat === seat ? { ...p, playerId: player.id, name: player.name } : p
        ))
    }

    const handlePlayerUpdate = (seat: number, updates: Partial<RecorderPlayer>) => {
        setPlayers(prev => prev.map(p => p.seat === seat ? { ...p, ...updates } : p))
    }

    // Auto-increment hand number on success
    const resetForNextHand = () => {
        setHandNumber(prev => prev + 1)
        setTimestampStart(null)
        setActions([])
        setBoardCards({ flop: '', turn: '', river: '' })
        setActiveStreet('preflop')

        // Rotate dealer button
        const activeSeats = players.filter(p => p.playerId).map(p => p.seat)
        if (activeSeats.length > 0) {
            const currentIdx = activeSeats.indexOf(dealerSeat)
            const nextIdx = (currentIdx + 1) % activeSeats.length
            setDealerSeat(activeSeats[nextIdx])
        }

        // Clear hole cards but keep players and stacks
        setPlayers(prev => prev.map(p => ({ ...p, holeCards: undefined })))
    }

    const handleSubmit = async () => {
        if (!timestampStart) {
            toast.error("Please set a start timestamp")
            return
        }

        const activePlayers = players.filter(p => p.playerId)
        if (activePlayers.length < 2) {
            toast.error("Need at least 2 players")
            return
        }

        // Construct Payload
        // Note: We are using a simplified direct creation or calling a specific Mutation that handles
        // the complexity. Since we need to use `createHandMutation` which likely expects FirestoreHand structure,
        // we need to map our local state to that.

        // Simplifying for prototype: We will generate the JSON for `handHistoryFormat` directly here
        // or pass the raw data to the server action. 
        // Given the complexity, let's assume we construct a simplified object and let the backend/mutation handle it.

        const handData = {
            streamId,
            number: handNumber,
            timestamp: formatTime(timestampStart),
            videoTimestampStart: timestampStart,
            videoTimestampEnd: Math.floor(currentTime),
            smallBlind: blinds.sb,
            bigBlind: blinds.bb,
            ante: blinds.ante,
            players: activePlayers.map(p => ({
                playerId: p.playerId!,
                name: p.name!,
                seat: p.seat,
                holeCards: p.holeCards ? splitCards(p.holeCards) : [],
                startStack: p.stack || 0,
                position: getPosition(p.seat, dealerSeat, activePlayers.length)
            })),
            // Board
            boardFlop: boardCards.flop ? splitCards(boardCards.flop) : [],
            boardTurn: boardCards.turn,
            boardRiver: boardCards.river,
            // Actions - we need to convert our recorded actions to the format expected
            actions: actions, // Pass raw or formatted actions
            status: 'completed'
        }

        try {
            await createHandMutation.mutateAsync(handData as any) // Type assertion for prototype
            toast.success(`Hand #${handNumber} saved!`)
            resetForNextHand()
        } catch (e) {
            console.error(e)
            toast.error("Failed to save hand")
        }
    }

    return (
        <div className="p-4 space-y-6 pb-20">
            {/* 1. Meta Control */}
            <Card className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg">Hand #{handNumber}</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={timestampStart ? "default" : "destructive"}
                            size="sm"
                            onClick={handleSetTimestamp}
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            {timestampStart ? formatTime(timestampStart) : "Set Start"}
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <Label>SB</Label>
                        <Input type="number" value={blinds.sb} onChange={e => setBlinds({ ...blinds, sb: +e.target.value })} />
                    </div>
                    <div>
                        <Label>BB</Label>
                        <Input type="number" value={blinds.bb} onChange={e => setBlinds({ ...blinds, bb: +e.target.value })} />
                    </div>
                    <div>
                        <Label>Ante</Label>
                        <Input type="number" value={blinds.ante} onChange={e => setBlinds({ ...blinds, ante: +e.target.value })} />
                    </div>
                </div>
            </Card>

            {/* 2. Table & Players */}
            <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Players</h3>
                    <div className="text-xs text-muted-foreground">Dealer Seat: {dealerSeat}</div>
                </div>

                <SeatSelector
                    players={players}
                    dealerSeat={dealerSeat}
                    onSeatClick={(seat) => {
                        // Open dialog to select player
                    }}
                    onSetDealer={setDealerSeat}
                    onPlayerConvert={(seat, player) => handlePlayerAssign(seat, player)}
                    onUpdatePlayer={handlePlayerUpdate}
                />
            </Card>

            {/* 3. Actions & Board */}
            <Card className="p-4">
                <Tabs value={activeStreet} onValueChange={(v) => setActiveStreet(v as any)}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                        <TabsTrigger value="preflop">Preflop</TabsTrigger>
                        <TabsTrigger value="flop">Flop</TabsTrigger>
                        <TabsTrigger value="turn">Turn</TabsTrigger>
                        <TabsTrigger value="river">River</TabsTrigger>
                    </TabsList>

                    <div className="mb-4 space-y-2">
                        {activeStreet === 'flop' && (
                            <Input
                                placeholder="Flop Cards (e.g. As Kh Td)"
                                value={boardCards.flop}
                                onChange={e => setBoardCards({ ...boardCards, flop: e.target.value })}
                            />
                        )}
                        {activeStreet === 'turn' && (
                            <Input
                                placeholder="Turn Card (e.g. 2s)"
                                value={boardCards.turn}
                                onChange={e => setBoardCards({ ...boardCards, turn: e.target.value })}
                            />
                        )}
                        {activeStreet === 'river' && (
                            <Input
                                placeholder="River Card (e.g. 5h)"
                                value={boardCards.river}
                                onChange={e => setBoardCards({ ...boardCards, river: e.target.value })}
                            />
                        )}
                    </div>

                    <ActionTimelineInput
                        street={activeStreet}
                        players={players.filter(p => p.playerId)}
                        actions={actions}
                        onAddAction={(action) => setActions([...actions, action])}
                        onRemoveAction={(index) => setActions(actions.filter((_, i) => i !== index))}
                    />
                </Tabs>
            </Card>

            {/* Footer Actions */}
            <div className="fixed bottom-0 right-0 w-[50%] bg-background border-t p-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActions([])}>Clear Actions</Button>
                <Button onClick={handleSubmit}>Save Hand</Button>
            </div>
        </div>
    )
}

// Utils
function formatTime(s: number) {
    if (!s) return "00:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
}

function splitCards(str: string) {
    // Basic parser: "AhKd" -> ["Ah", "Kd"] or "Ah Kd" -> ["Ah", "Kd"]
    return str.replace(/\s/g, '').match(/.{1,2}/g) || []
}

function getPosition(seat: number, dealerSeat: number, totalPlayers: number) {
    // Simplified Logic
    if (seat === dealerSeat) return 'BTN'
    // ... complete logic needed
    return 'MP'
}
