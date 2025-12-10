'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUITS = ['s', 'h', 'd', 'c'] as const
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

interface CardPickerProps {
    value: string // simplified "Ah,Kd"
    onChange: (value: string) => void
}

export function CardPicker({ value, onChange }: CardPickerProps) {
    const [open, setOpen] = useState(false)

    // Parse existing cards or empty
    const [card1, setCard1] = useState('')
    const [card2, setCard2] = useState('')

    // When opening, initialize state from value
    React.useEffect(() => {
        if (open) {
            if (value === '?' || value === 'Unknown') {
                setCard1('?')
                setCard2('?')
            } else {
                const parts = value.split(',').map(s => s.trim()).filter(Boolean)
                setCard1(parts[0] || '')
                setCard2(parts[1] || '')
            }
        }
    }, [open, value])

    // Simplified logic: Click Rank then Click Suit to build a card
    // Or just click a full card from a grid? 52 cards is a lot.
    // Standard picker: Ranks row, Suits row. 

    const [currentBuildingCard, setCurrentBuildingCard] = useState<'1' | '2'>('1')
    const [pendingRank, setPendingRank] = useState<string | null>(null)

    const handleCardInput = (rank: string, suit: string) => {
        const card = `${rank}${suit}`
        if (currentBuildingCard === '1') {
            setCard1(card)
            setCurrentBuildingCard('2')
        } else {
            setCard2(card)
        }
    }

    const handleSave = () => {
        if (card1 === '?' || card2 === '?') {
            onChange('?')
        } else {
            const parts = [card1, card2].filter(c => c.length >= 2)
            onChange(parts.join(','))
        }
        setOpen(false)
    }

    const handleUnknown = () => {
        onChange('?')
        setOpen(false)
    }

    const clear = () => {
        setCard1('')
        setCard2('')
        setCurrentBuildingCard('1')
        onChange('')
    }

    // Helper to render card preview
    const renderCardPreview = (card: string) => {
        if (!card) return <div className="w-8 h-12 border border-dashed rounded bg-muted/20" />
        if (card === '?') return <div className="w-8 h-12 bg-gray-500 rounded flex items-center justify-center text-white">?</div>

        const suit = card.charAt(1).toLowerCase()
        const rank = card.charAt(0)
        const color = (suit === 'h' || suit === 'd') ? 'text-red-500' : 'text-black'

        let suitIcon = ''
        if (suit === 's') suitIcon = '♠'
        if (suit === 'h') suitIcon = '♥'
        if (suit === 'd') suitIcon = '♦'
        if (suit === 'c') suitIcon = '♣'

        return (
            <div className={cn("w-8 h-12 bg-white border rounded flex flex-col items-center justify-center text-sm font-bold shadow-sm select-none", color)}>
                <span>{rank}</span>
                <span className="-mt-1 text-xs">{suitIcon}</span>
            </div>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="flex gap-1 cursor-pointer bg-black/40 hover:bg-black/60 p-1 rounded min-w-[50px] justify-center min-h-[40px] items-center">
                    {(!value) && <span className="text-xs text-white/50">Cards</span>}
                    {value === '?' && <span className="text-white font-bold">??</span>}
                    {value !== '?' && value.split(',').map((c, i) => (
                        <div key={i}>{renderCardPreview(c)}</div>
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[320px]">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">Select Cards</h4>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleUnknown} className="h-6 px-2 text-xs">Unknown (?)</Button>
                            <Button variant="ghost" size="sm" onClick={clear} className="h-6 px-2 text-xs"><X className="h-3 w-3" /></Button>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 py-2 bg-muted/30 rounded">
                        <div
                            className={cn("cursor-pointer ring-offset-2", currentBuildingCard === '1' && "ring-2 ring-primary rounded")}
                            onClick={() => setCurrentBuildingCard('1')}
                        >
                            {renderCardPreview(card1)}
                        </div>
                        <div
                            className={cn("cursor-pointer ring-offset-2", currentBuildingCard === '2' && "ring-2 ring-primary rounded")}
                            onClick={() => setCurrentBuildingCard('2')}
                        >
                            {renderCardPreview(card2)}
                        </div>
                    </div>

                    {/* Card Picker: Rank then Suit */}
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground text-center">
                            {pendingRank
                                ? `Selected ${pendingRank}, now pick a suit for Card ${currentBuildingCard}`
                                : `Select Rank then Suit for Card ${currentBuildingCard}`
                            }
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {RANKS.map(rank => (
                                <Button
                                    key={rank}
                                    variant={pendingRank === rank ? "default" : "outline"}
                                    className="h-8 p-0 text-xs"
                                    onClick={() => setPendingRank(rank)}
                                >
                                    {rank}
                                </Button>
                            ))}
                        </div>
                        <div className="flex justify-center gap-2">
                            {SUITS.map(suit => (
                                <Button
                                    key={suit}
                                    variant="outline"
                                    className={cn("w-10 h-8 text-lg", (suit === 'h' || suit === 'd') && "text-red-500")}
                                    disabled={!pendingRank}
                                    onClick={() => {
                                        if (pendingRank) {
                                            handleCardInput(pendingRank, suit)
                                            setPendingRank(null)
                                        }
                                    }}
                                >
                                    {suit === 's' ? '♠' : suit === 'h' ? '♥' : suit === 'd' ? '♦' : '♣'}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Button className="w-full" onClick={handleSave}>Confirm</Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
