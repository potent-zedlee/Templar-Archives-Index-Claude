
'use client'

import { Hand } from '@/lib/types/archive'
import { cn } from '@/lib/utils'

interface PokerTableSectionProps {
    currentHand: Hand | null
    currentTime: number
}

// Seat positions (%) for 9-max/10-max table (Oval)
// Clockwise from bottom center? 
// Let's use standard indices 1-9.
const SEAT_POSITIONS = [
    { id: 1, top: '80%', left: '60%' }, // Bottom Rightish
    { id: 2, top: '65%', left: '85%' }, // Right Bottom
    { id: 3, top: '35%', left: '85%' }, // Right Top
    { id: 4, top: '20%', left: '60%' }, // Top Rightish
    { id: 5, top: '20%', left: '40%' }, // Top Leftish
    { id: 6, top: '35%', left: '15%' }, // Left Top
    { id: 7, top: '65%', left: '15%' }, // Left Bottom
    { id: 8, top: '80%', left: '40%' }, // Bottom Leftish
]

export function PokerTableSection({ currentHand }: PokerTableSectionProps) {

    // Map players to seats
    // We assume handPlayers have `seat` or we mapped them?
    // If no seat info, we distribute them.

    return (
        <div className="w-full h-full bg-[#0e0e10] relative overflow-hidden flex flex-col items-center justify-center select-none">
            {/* Table Container */}
            <div className="relative w-[85%] aspect-[1.8] max-w-4xl">
                {/* Table Felt (Oval) */}
                <div className="absolute inset-0 bg-[#1a472a] rounded-[180px] shadow-[0_0_40px_rgba(0,0,0,0.5)] border-[8px] border-[#222]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2a5a3b_0%,_#1a472a_100%)] rounded-[170px]" />
                    {/* Inner Ring Line */}
                    <div className="absolute inset-[20px] rounded-[150px] border border-white/5" />
                </div>

                {/* Center Content: Board & Pot */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    {/* Community Cards */}
                    <div className="flex gap-2 mb-4 h-16 items-center">
                        {currentHand?.boardFlop?.length ? (
                            <>
                                {currentHand.boardFlop.map((card, i) => (
                                    <CardDisplay key={`flop-${i}`} card={card} />
                                ))}
                                {currentHand.boardTurn && <CardDisplay card={currentHand.boardTurn} />}
                                {currentHand.boardRiver && <CardDisplay card={currentHand.boardRiver} />}
                            </>
                        ) : (
                            <div className="text-white/10 font-black text-2xl tracking-[0.2em] uppercase opacity-50">
                                Templar
                            </div>
                        )}
                    </div>

                    {/* Pot Display */}
                    {currentHand?.potSize && (
                        <div className="px-3 py-1 bg-black/40 rounded-full border border-[#ffd700]/20 backdrop-blur-sm flex items-center gap-2">
                            <span className="text-[10px] text-[#ffd700] uppercase tracking-wider font-bold">Pot</span>
                            <span className="text-white font-mono text-sm">{currentHand.potSize.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Players */}
                {currentHand?.handPlayers?.map((player, index) => {
                    // Logic to distribute players if seat info is missing
                    const seatId = player.seat || ((index % 8) + 1);
                    const pos = SEAT_POSITIONS[seatId - 1] || SEAT_POSITIONS[0];
                    const isWinner = player.isWinner;

                    return (
                        <div
                            key={player.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-24"
                            style={{ top: pos.top, left: pos.left }}
                        >
                            {/* Hole Cards */}
                            <div className={cn(
                                "flex -space-x-4 mb-2 z-10 transition-transform duration-300",
                                player.holeCards?.length ? "hover:-translate-y-1" : ""
                            )}>
                                {player.holeCards?.map((card, i) => (
                                    <div key={i} className="shadow-lg origin-bottom">
                                        <CardDisplay card={card} size="sm" />
                                    </div>
                                ))}
                                {!player.holeCards?.length && (
                                    <div className="flex -space-x-4">
                                        <div className="w-8 h-11 bg-[#1a1a1a] rounded border border-zinc-700/50" />
                                        <div className="w-8 h-11 bg-[#1a1a1a] rounded border border-zinc-700/50" />
                                    </div>
                                )}
                            </div>

                            {/* Player Info Pod */}
                            <div className={cn(
                                "relative w-full bg-[#111] border rounded px-2 py-1.5 text-center shadow-lg transition-colors",
                                isWinner ? "border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)]" : "border-zinc-800"
                            )}>
                                <div className="text-[11px] font-bold text-zinc-300 truncate leading-tight">
                                    {player.player?.name || 'Player'}
                                </div>
                                <div className="text-[10px] font-mono text-[#ffd700] leading-tight mt-0.5">
                                    {player.startingStack ? player.startingStack.toLocaleString() : '0'}
                                </div>

                                {/* Dealer Button */}
                                {player.pokerPosition && (
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-black text-[8px] font-black flex items-center justify-center border border-zinc-900">
                                        {player.pokerPosition}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Empty State Overlay */}
            {!currentHand && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <p className="text-zinc-400 font-light">Waiting for hand selection...</p>
                </div>
            )}
        </div>
    )
}

function CardDisplay({ card, size = 'md' }: { card: string, size?: 'sm' | 'md' }) {
    if (!card) return null;

    let rank = card.slice(0, -1);
    const suitChar = card.slice(-1).toLowerCase();

    // Normalize 10
    if (rank === 'T') rank = '10';

    // Suit config
    const suits: Record<string, { symbol: string, color: string }> = {
        's': { symbol: '♠', color: 'text-[#1a1a1a]' },
        'h': { symbol: '♥', color: 'text-[#e11d48]' }, // Rose-600
        'd': { symbol: '♦', color: 'text-[#2563eb]' }, // Blue-600
        'c': { symbol: '♣', color: 'text-[#15803d]' }  // Green-700
    };

    // Standard colors if preferred (user image check?)
    // Let's stick to standard Red/Black for Classic look, or 4-color for Pro.
    // Pro tools usually default to 4-color. I'll use standard Red/Black as it's safer unless specified.
    if (suitChar === 'd') suits['d'].color = 'text-[#e11d48]'; // Diamond Red
    if (suitChar === 'c') suits['c'].color = 'text-[#1a1a1a]'; // Club Black

    const { symbol, color } = suits[suitChar] || { symbol: '?', color: 'text-gray-400' };

    return (
        <div className={cn(
            "bg-white rounded-[3px] shadow-sm select-none relative overflow-hidden flex flex-col items-center justify-center leading-none",
            size === 'sm' ? "w-9 h-12 text-sm" : "w-11 h-16 text-lg",
            color
        )}>
            <span className="font-bold tracking-tighter">{rank}</span>
            <span className="text-[70%] mt-[-2px]">{symbol}</span>
        </div>
    )
}
