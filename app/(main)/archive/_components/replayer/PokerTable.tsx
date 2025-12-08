import { useMemo } from 'react'
import type { Hand, HandPlayer } from '@/lib/types/archive'
import { User } from 'lucide-react'
import Image from 'next/image'

interface PokerTableProps {
    hand: Hand | null
    currentTime?: number
}

// Seat positions helper (Top-down view, centered)
// 1 = Button for Heads up? No, usually 9-max standard mapping
// Let's assume 9-max: 1 is bottom right, moving clockwise? Or standard online poker view.
// Let's map 1-9 to CSS absolute positions (%)
const SEAT_POSITIONS = [
    { id: 1, top: '80%', left: '70%', label: 'Seat 1' },
    { id: 2, top: '80%', left: '30%', label: 'Seat 2' },
    { id: 3, top: '50%', left: '10%', label: 'Seat 3' },
    { id: 4, top: '20%', left: '15%', label: 'Seat 4' },
    { id: 5, top: '10%', left: '40%', label: 'Seat 5' },
    { id: 6, top: '10%', left: '60%', label: 'Seat 6' },
    { id: 7, top: '20%', left: '85%', label: 'Seat 7' },
    { id: 8, top: '50%', left: '90%', label: 'Seat 8' },
    { id: 9, top: '80%', left: '50%', label: 'Seat 9' }, // Center bottom?
]

// Re-map for better visual circle (Clockwise starting from bottom-right)
// Actual layout needs to be tweaked. Let's use a simpler 6-max or 9-max arrangement based on standard poker apps.
// Seat 1: Bottom Right
// Seat 2: Bottom
// Seat 3: Bottom Left
// Seat 4: Left
// Seat 5: Top Left
// Seat 6: Top
// Seat 7: Top Right
// Seat 8: Right
// Seat 9: Right Bottom

export function PokerTable({ hand }: PokerTableProps) {
    const players = hand?.handPlayers || []

    // Map players to seats
    // If seat number is missing, auto-assign based on index?
    // Ideally HandPlayer has 'seat' property.
    const seatMap = useMemo(() => {
        const map = new Map<number, HandPlayer>()
        players.forEach((p, index) => {
            // Use explicit seat or fallback to index + 1
            const seatNum = p.seat || (index + 1)
            map.set(seatNum, p)
        })
        return map
    }, [players])

    return (
        <div className="relative w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/5">
            {/* Table Felt */}
            <div className="absolute inset-[10%] bg-emerald-900/40 rounded-[100px] border-8 border-emerald-950/50 shadow-inner flex items-center justify-center">
                {/* Table Logo/Center */}
                <div className="text-emerald-800/20 font-bold text-2xl tracking-widest uppercase select-none">
                    Archive Table
                </div>

                {/* Board Cards */}
                {hand && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                        {/* Flop */}
                        {hand.boardFlop?.map((card, i) => <PlayingCard key={`flop-${i}`} card={card} />)}
                        {/* Turn */}
                        {hand.boardTurn && <PlayingCard card={hand.boardTurn} />}
                        {/* River */}
                        {hand.boardRiver && <PlayingCard card={hand.boardRiver} />}
                    </div>
                )}
            </div>

            {/* Seats */}
            {SEAT_POSITIONS.map((pos, index) => {
                const player = seatMap.get(index + 1)
                return (
                    <div
                        key={index}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-24 flex flex-col items-center gap-1 transition-all duration-500"
                        style={{ top: pos.top, left: pos.left }}
                    >
                        {player ? (
                            <>
                                {/* Avatar */}
                                <div className="relative w-12 h-12 rounded-full border-2 border-white/10 bg-black shadow-lg overflow-hidden group">
                                    {player.player?.photoUrl ? (
                                        <Image
                                            src={player.player.photoUrl}
                                            alt={player.player.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                                            <User className="w-6 h-6" />
                                        </div>
                                    )}
                                    {/* Dealer Button Placeholder */}
                                </div>

                                {/* Name & Stack */}
                                <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-center min-w-[80px] border border-white/5">
                                    <div className="text-[10px] font-bold text-white truncate max-w-[70px]">
                                        {player.player?.name || 'Unknown'}
                                    </div>
                                    <div className="text-[9px] text-emerald-400 font-mono">
                                        {player.startingStack?.toLocaleString() || '0'}
                                    </div>
                                </div>

                                {/* Hole Cards - Only show if known */}
                                {player.holeCards && player.holeCards.length > 0 && (
                                    <div className="flex -space-x-4">
                                        {player.holeCards.map((card, i) => (
                                            <div key={i} className="w-8 h-10 bg-white rounded shadow-sm border border-gray-300 text-[10px] flex items-center justify-center relative translate-y-[-50%] z-10">
                                                {/* Simple text representation for now */}
                                                <span className={card.includes('h') || card.includes('d') ? 'text-red-600' : 'text-black'}>
                                                    {card}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            // Empty Seat
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/5 flex items-center justify-center text-white/5">
                                <span className="text-[8px]">{pos.id}</span>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function PlayingCard({ card }: { card: string }) {
    if (!card) return null
    // Format: "Ah", "Kd", etc.
    const rank = card.slice(0, -1)
    const suitSymbol = card.slice(-1)
    const isRed = suitSymbol === 'h' || suitSymbol === 'd'
    const suitIcon = {
        'h': '♥',
        'd': '♦',
        's': '♠',
        'c': '♣'
    }[suitSymbol] || suitSymbol

    return (
        <div className="w-10 h-14 bg-white rounded shadow-md border border-gray-200 flex flex-col items-center justify-center select-none transform hover:scale-110 transition-transform">
            <span className={`text-sm font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</span>
            <span className={`text-base leading-none ${isRed ? 'text-red-600' : 'text-black'}`}>{suitIcon}</span>
        </div>
    )
}
