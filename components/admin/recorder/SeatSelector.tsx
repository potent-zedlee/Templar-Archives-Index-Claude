"use client"

import { cn } from "@/lib/utils"
import { RecorderPlayer } from "./HandRecorderForm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { PlayerSearchDialog } from "./PlayerSearchDialog"
import { useState } from "react"
import { CreditCard, Database, User } from "lucide-react"

interface SeatSelectorProps {
    players: RecorderPlayer[]
    dealerSeat: number
    onSeatClick: (seat: number) => void // Intended for legacy, but now we handle inside
    onSetDealer: (seat: number) => void
    onPlayerConvert: (seat: number, player: { id: string, name: string }) => void
    onUpdatePlayer: (seat: number, updates: Partial<RecorderPlayer>) => void
}

export function SeatSelector({
    players,
    dealerSeat,
    onSetDealer,
    onPlayerConvert,
    onUpdatePlayer
}: SeatSelectorProps) {

    // Layout coordinates for 9-max table (simplified relative positioning)
    // 0 is bottom center (Hero), clockwise
    const seatPositions = [
        { id: 1, label: 'SB', className: 'bottom-2 right-32' }, // 1
        { id: 2, label: 'BB', className: 'bottom-20 right-4' }, // 2
        { id: 3, label: 'UTG', className: 'top-1/2 -translate-y-1/2 right-2' }, // 3
        { id: 4, label: 'UTG+1', className: 'top-20 right-4' }, // 4
        { id: 5, label: 'MP', className: 'top-2 right-32' }, // 5
        { id: 6, label: 'MP+1', className: 'top-2 left-32' }, // 6
        { id: 7, label: 'HJ', className: 'top-20 left-4' }, // 7
        { id: 8, label: 'CO', className: 'top-1/2 -translate-y-1/2 left-2' }, // 8
        { id: 9, label: 'BTN', className: 'bottom-20 left-4' }, // 9
    ]

    // Actually, seat numbers are strictly 1-9. 
    // Let's just use a grid for the admin recorder for simplicity/compactness, 
    // or a pseudo-table CSS. 
    // A grid is often faster for data entry than a visual circle.
    // The user asked for "Visual 9-seat table" ("Youtube together...").

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {players.map((p) => (
                <SeatCard
                    key={p.seat}
                    player={p}
                    isDealer={dealerSeat === p.seat}
                    onMakeDealer={() => onSetDealer(p.seat)}
                    onSelectPlayer={(selected) => onPlayerConvert(p.seat, selected)}
                    onUpdate={(updates) => onUpdatePlayer(p.seat, updates)}
                />
            ))}
        </div>
    )
}

function SeatCard({
    player,
    isDealer,
    onMakeDealer,
    onSelectPlayer,
    onUpdate
}: {
    player: RecorderPlayer,
    isDealer: boolean,
    onMakeDealer: () => void,
    onSelectPlayer: (p: any) => void,
    onUpdate: (u: any) => void
}) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <div className={cn(
            "border rounded-lg p-2 flex flex-col gap-2 relative transition-all",
            isDealer ? "border-amber-400 bg-amber-50/10" : "border-border",
            player.playerId ? "bg-card" : "bg-muted/30"
        )}>
            {/* Header: Seat # & Dealer Btn */}
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="cursor-pointer hover:underline" onClick={onMakeDealer}>
                    Seat {player.seat} {isDealer && "🟡"}
                </span>
                {!player.playerId && (
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setSearchOpen(true)}>
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </div>

            {/* Player Info */}
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 cursor-pointer" onClick={() => setSearchOpen(true)}>
                    <AvatarFallback>{player.name ? player.name.substring(0, 2).toUpperCase() : "?"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div
                        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => setSearchOpen(true)}
                    >
                        {player.name || "Empty Seat"}
                    </div>
                    {player.playerId && (
                        <div className="flex items-center gap-1">
                            <Database className="h-3 w-3 text-muted-foreground" />
                            <Input
                                className="h-5 text-xs py-0 px-1 w-20"
                                placeholder="Stack"
                                type="number"
                                value={player.stack || ''}
                                onChange={(e) => onUpdate({ stack: +e.target.value })}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Hole Cards Input */}
            {player.playerId && (
                <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                    <Input
                        className="h-6 text-xs font-mono uppercase"
                        placeholder="Cards (AhKs)"
                        value={player.holeCards || ''}
                        onChange={(e) => onUpdate({ holeCards: e.target.value })}
                        maxLength={4}
                    />
                </div>
            )}

            <PlayerSearchDialog
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onSelect={(p) => {
                    onSelectPlayer(p)
                    setSearchOpen(false)
                }}
            />
        </div>
    )
}
