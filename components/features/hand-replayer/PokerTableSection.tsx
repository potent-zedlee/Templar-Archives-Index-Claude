
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
const SEATS = [
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
        <div className="w-full h-full bg-[#1e1e1e] relative overflow-hidden flex flex-col items-center justify-center select-none">
            {/* Table Felt */}
            <div className="relative w-[90%] aspect-[1.8] bg-[#1a472a] rounded-[150px] border-[16px] border-[#2d2d2d] shadow-2xl ring-1 ring-white/5">

                {/* Community Cards */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                    {currentHand?.boardFlop?.map((card, i) => (
                        <CardDisplay key={`flop - ${i} `} card={card} />
                    ))}
                    {currentHand?.boardTurn && (
                        <CardDisplay card={currentHand.boardTurn} />
                    )}
                    {currentHand?.boardRiver && (
                        <CardDisplay card={currentHand.boardRiver} />
                    )}

                    {!currentHand?.boardFlop?.length && (
                        <div className="text-white/20 font-bold text-xl tracking-widest pt-2">
                            TEMPLAR ARCHIVES
                        </div>
                    )}
                </div>

                {/* Pot Size */}
                {currentHand?.potSize && (
                    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 bg-black/40 text-yellow-400 px-3 py-1 rounded-full text-xs font-mono font-bold border border-yellow-400/20">
                        Pot: {currentHand.potSize.toLocaleString()}
                    </div>
                )}

                {/* Players */}
                {currentHand?.handPlayers?.map((player, index) => {
                    const seatId = player.seat || ((index % 8) + 1);
                    const pos = SEATS[seatId - 1] || SEATS[0];

                    return (
                        <div
                            key={player.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-24"
                            style={{ top: pos.top, left: pos.left }}
                        >
                            {/* Hole Cards */}
                            <div className="flex -space-x-4 mb-[-10px] z-10">
                                {player.holeCards?.map((card, i) => (
                                    <div key={i} className="transform hover:-translate-y-2 transition-transform">
                                        <CardDisplay card={card} size="sm" />
                                    </div>
                                ))}
                                {!player.holeCards?.length && (
                                    <div className="w-8 h-10 bg-gray-800 rounded border border-gray-600 opacity-50" />
                                )}
                            </div>

                            {/* Avatar/Info Box */}
                            <div className="bg-[#111] border border-gray-700 rounded-lg p-1.5 w-max min-w-[80px] text-center shadow-lg relative z-20">
                                <div className="text-[10px] text-gray-400 font-bold truncate max-w-[80px]">
                                    {player.player?.name || 'Player'}
                                </div>
                                <div className="text-xs text-yellow-500 font-mono">
                                    {(player.startingStack || 0).toLocaleString()}
                                </div>
                                {/* Dealer Button / Position logic needed if data exists */}
                                {player.pokerPosition && (
                                    <div className="absolute -top-2 -right-2 bg-white text-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-gray-400">
                                        {player.pokerPosition}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {!currentHand && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
                    <div className="text-white font-light text-lg">Select a hand to view</div>
                </div>
            )}
        </div>
    )
}

function CardDisplay({ card, size = 'md' }: { card: string, size?: 'sm' | 'md' }) {
    if (!card) return null;

    // Parse standard string "As", "Th", "2d" etc.
    let rank = card.slice(0, -1);
    const suitChar = card.slice(-1).toLowerCase();

    // Normalize rank 10 -> T if needed, or just handle it.

    let suit = '';
    let color = 'text-black';

    if (suitChar === 's') { suit = '♠'; color = 'text-black'; }
    else if (suitChar === 'h') { suit = '♥'; color = 'text-red-600'; }
    else if (suitChar === 'd') { suit = '♦'; color = 'text-blue-600'; } // Four-color deck preference usually: Diamond is Blue
    else if (suitChar === 'c') { suit = '♣'; color = 'text-green-600'; } // Club is Green

    // Override for standard 2-color deck if requested, but 4-color is better for digital.
    // Let's stick to standard Red/Black if user didn't ask 4-color.
    // User image shows: Spade=Black, Club=Black, Heart=Red, Diamond=Red?
    // Image shows: Ad (Red), Qc (Black).
    // Let's use Standard Red/Black.
    if (suitChar === 'd') { suit = '♦'; color = 'text-red-600'; }
    if (suitChar === 'c') { suit = '♣'; color = 'text-black'; }

    // Sizing
    const dim = size === 'sm' ? "w-8 h-11 text-xs" : "w-10 h-14 text-sm";

    return (
        <div className={cn(
            "bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-md select-none",
            dim,
            color
        )}>
            <span className="font-bold leading-none">{rank}</span>
            <span className="text-[10px] leading-none">{suit}</span>
        </div>
    )
}

