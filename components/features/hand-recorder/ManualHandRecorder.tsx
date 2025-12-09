'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CardPicker } from './CardPicker'
import { PlayerSelector } from '../player-selector/PlayerSelector'
import { createHand } from '@/app/actions/archive-manage'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Coins, Save, RotateCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManualHandRecorderProps {
    streamId: string
    streamName: string
}

interface PlayerState {
    seat: number
    name: string
    playerId?: string
    holeCards: string
    stack: number
    position: string // 'BTN', 'SB', 'BB', or empty
}

interface ActionInput {
    street: 'preflop' | 'flop' | 'turn' | 'river'
    player: string
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
    amount: number
}

const SEAT_COUNT = 10

export function ManualHandRecorder({ streamId, streamName }: ManualHandRecorderProps) {
    const [loading, setLoading] = useState(false)
    const [handNumber, setHandNumber] = useState(1)

    // Blinds Info
    const [smallBlind, setSmallBlind] = useState(1000)
    const [bigBlind, setBigBlind] = useState(2000)
    const [ante, setAnte] = useState(2000)

    // Board
    const [board, setBoard] = useState({
        flop1: '', flop2: '', flop3: '',
        turn: '',
        river: ''
    })

    // Players State - Array of 10 seats
    const [players, setPlayers] = useState<PlayerState[]>(
        Array.from({ length: SEAT_COUNT }, (_, i) => ({
            seat: i + 1,
            name: '',
            holeCards: '',
            stack: 100000,
            position: ''
        }))
    )

    // Actions
    const [actions, setActions] = useState<ActionInput[]>([])
    const [currentStreet, setCurrentStreet] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop')

    // Handled in a simpler way: just list of actions
    const addAction = (type: ActionInput['action']) => {
        // Default to first active player? Or just empty player
        setActions([...actions, {
            street: currentStreet,
            player: activePlayerNames[0] || '',
            action: type,
            amount: 0
        }])
    }

    const activePlayerNames = players.filter(p => p.name).map(p => p.name)

    const updateAction = (index: number, field: keyof ActionInput, value: any) => {
        const newActions = [...actions]
        newActions[index] = { ...newActions[index], [field]: value }
        setActions(newActions)
    }

    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index))
    }

    // Position Rotation Logic
    const rotatePositions = (direction: 'left' | 'right') => {
        setPlayers(prev => {
            const next = [...prev]
            // Extract positions
            const positions = next.map(p => p.position)

            // Rotate the positions array
            if (direction === 'right') {
                const last = positions.pop()
                positions.unshift(last || '')
            } else {
                const first = positions.shift()
                positions.push(first || '')
            }

            // Assign back
            return next.map((p, i) => ({ ...p, position: positions[i] }))
        })
    }

    const resetForm = (keepPlayers: boolean = true) => {
        setHandNumber(prev => prev + 1)
        setBoard({ flop1: '', flop2: '', flop3: '', turn: '', river: '' })
        setActions([])

        setPlayers(prev => prev.map(p => ({
            ...p,
            holeCards: '', // Clear cards
            // Keep stack? User said "automatically move to next hand", usually stacks change.
            // But base stack might persist if not updated? 
            // Let's keep stack as is (latest known), user updates if they want.
            // Reset position? Rotate position!
        })))

        if (keepPlayers) {
            rotatePositions('right')
        }
    }

    const handleSave = async () => {
        if (!streamId) return
        setLoading(true)
        try {
            const boardFlop = [board.flop1, board.flop2, board.flop3].filter(Boolean)
            const validPlayers = players.filter(p => p.name) // Only players with names

            const handData = {
                number: handNumber,
                smallBlind,
                bigBlind,
                ante,
                videoTimestampStart: 0,
                videoTimestampEnd: 0,
                players: validPlayers.map(p => ({
                    ...p,
                    holeCards: p.holeCards === '?' ? [] : p.holeCards.split(',').map(c => c.trim()).filter(Boolean)
                })),
                boardFlop,
                boardTurn: board.turn,
                boardRiver: board.river,
                actions,
            }

            const result = await createHand(streamId, handData)

            if (result.success) {
                toast.success(`Hand #${handNumber} saved!`)
                resetForm(true)
            } else {
                toast.error('Failed to save')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error saving hand')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-4 border rounded-lg bg-card">
            {/* Top Bar: Blinds & Hand Info */}
            <div className="flex gap-4 items-end border-b pb-4">
                <div>
                    <h3 className="font-bold">{streamName}</h3>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Hand #</Label>
                    <Input type="number" className="w-20" value={handNumber} onChange={e => setHandNumber(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">SB</Label>
                    <Input type="number" className="w-24" value={smallBlind} onChange={e => setSmallBlind(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">BB</Label>
                    <Input type="number" className="w-24" value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Ante</Label>
                    <Input type="number" className="w-24" value={ante} onChange={e => setAnte(Number(e.target.value))} />
                </div>

                <div className="flex-1" />

                <div className="flex gap-2 items-center bg-muted/20 p-2 rounded">
                    <span className="text-sm font-bold text-muted-foreground mr-2">BOARD</span>
                    <Input placeholder="Flop 1" value={board.flop1} onChange={e => setBoard({ ...board, flop1: e.target.value })} className="w-16 h-8" />
                    <Input placeholder="Flop 2" value={board.flop2} onChange={e => setBoard({ ...board, flop2: e.target.value })} className="w-16 h-8" />
                    <Input placeholder="Flop 3" value={board.flop3} onChange={e => setBoard({ ...board, flop3: e.target.value })} className="w-16 h-8" />
                    <span className="text-muted-foreground">|</span>
                    <Input placeholder="Turn" value={board.turn} onChange={e => setBoard({ ...board, turn: e.target.value })} className="w-16 h-8" />
                    <span className="text-muted-foreground">|</span>
                    <Input placeholder="River" value={board.river} onChange={e => setBoard({ ...board, river: e.target.value })} className="w-16 h-8" />
                </div>
            </div>

            {/* Main Table Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[1000px] grid grid-cols-10 gap-1 mb-4">
                    {/* Headers */}
                    {players.map(p => (
                        <div key={p.seat} className="text-center font-bold text-xs bg-muted py-1 rounded-t">
                            SEAT {p.seat}
                        </div>
                    ))}

                    {/* Row 1: Cards */}
                    {players.map((p, i) => (
                        <div key={`cards-${i}`} className="flex justify-center p-2 border-x bg-background">
                            <CardPicker
                                value={p.holeCards}
                                onChange={(val) => {
                                    const next = [...players]
                                    next[i].holeCards = val
                                    setPlayers(next)
                                }}
                            />
                        </div>
                    ))}

                    {/* Row 2: Name */}
                    {players.map((p, i) => (
                        <div key={`name-${i}`} className="p-1 border-x bg-background">
                            <PlayerSelector
                                value={p.name}
                                onChange={(name, pid) => {
                                    const next = [...players]
                                    next[i].name = name
                                    next[i].playerId = pid
                                    setPlayers(next)
                                }}
                            />
                        </div>
                    ))}

                    {/* Row 3: Stack */}
                    {players.map((p, i) => (
                        <div key={`stack-${i}`} className="p-1 border-x border-b bg-background flex flex-col items-center">
                            <div className="flex items-center gap-1 mb-1">
                                <Coins className="h-4 w-4 text-yellow-500" />
                            </div>
                            <Input
                                type="number"
                                className="h-7 text-xs text-center px-1"
                                value={p.stack}
                                onChange={(e) => {
                                    const next = [...players]
                                    next[i].stack = Number(e.target.value)
                                    setPlayers(next)
                                }}
                            />
                        </div>
                    ))}

                    {/* Row 4: Position Controls */}
                    {players.map((p, i) => {
                        const isBtn = p.position === 'BTN'
                        const isSb = p.position === 'SB'
                        const isBb = p.position === 'BB'

                        return (
                            <div key={`pos-${i}`} className="p-1 flex justify-center bg-muted/10 rounded-b">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 w-8 rounded-full p-0 font-bold text-[10px]",
                                        isBtn && "bg-white text-black border-2 border-black hover:bg-white hover:text-black",
                                        isSb && "bg-blue-600 text-white hover:bg-blue-700",
                                        isBb && "bg-orange-600 text-white hover:bg-orange-700",
                                        !p.position && "text-muted-foreground opacity-20 hover:opacity-100"
                                    )}
                                    onClick={() => {
                                        // Cycle: Empty -> BTN -> SB -> BB -> Empty
                                        const next = [...players]
                                        const current = next[i].position
                                        if (!current) next[i].position = 'BTN'
                                        else if (current === 'BTN') next[i].position = 'SB'
                                        else if (current === 'SB') next[i].position = 'BB'
                                        else next[i].position = ''
                                        setPlayers(next)
                                    }}
                                >
                                    {p.position || 'P'}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Position Global Controls */}
            <div className="flex justify-center gap-4">
                <Button variant="outline" size="sm" onClick={() => rotatePositions('left')}>
                    <ChevronLeft className="mr-1 h-3 w-3" /> Rotate Positions
                </Button>
                <Button variant="outline" size="sm" onClick={() => rotatePositions('right')}>
                    Rotate Positions <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                {/* Controls */}
                <div className="space-y-4">
                    <h4 className="font-bold text-sm">Add Action</h4>

                    <div className="flex items-center gap-2">
                        <Label>Street:</Label>
                        <Select value={currentStreet} onValueChange={(v: any) => setCurrentStreet(v)}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="preflop">Preflop</SelectItem>
                                <SelectItem value="flop">Flop</SelectItem>
                                <SelectItem value="turn">Turn</SelectItem>
                                <SelectItem value="river">River</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => addAction('fold')}>Fold</Button>
                        <Button variant="secondary" onClick={() => addAction('check')}>Check</Button>
                        <Button variant="secondary" onClick={() => addAction('call')}>Call</Button>
                        <Button variant="secondary" onClick={() => addAction('bet')}>Bet</Button>
                        <Button variant="secondary" onClick={() => addAction('raise')}>Raise</Button>
                        <Button variant="secondary" onClick={() => addAction('all-in')}>All-in</Button>
                    </div>
                </div>

                {/* List */}
                <div className="col-span-2 space-y-2 border rounded p-4 h-[400px] overflow-y-auto bg-muted/10">
                    {actions.map((act, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-background p-2 rounded shadow-sm">
                            <span className={cn(
                                "w-16 font-bold text-[10px] uppercase p-1 rounded text-center text-white",
                                act.street === 'preflop' ? "bg-slate-500" :
                                    act.street === 'flop' ? "bg-green-600" :
                                        act.street === 'turn' ? "bg-blue-600" : "bg-orange-600"
                            )}>{act.street}</span>

                            <Select value={act.player} onValueChange={(v) => updateAction(idx, 'player', v)}>
                                <SelectTrigger className="w-32 h-7 text-xs">
                                    <SelectValue placeholder="Player" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activePlayerNames.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={act.action} onValueChange={(v) => updateAction(idx, 'action', v)}>
                                <SelectTrigger className="w-24 h-7 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="check">Check</SelectItem>
                                    <SelectItem value="call">Call</SelectItem>
                                    <SelectItem value="bet">Bet</SelectItem>
                                    <SelectItem value="raise">Raise</SelectItem>
                                    <SelectItem value="fold">Fold</SelectItem>
                                    <SelectItem value="all-in">All-in</SelectItem>
                                </SelectContent>
                            </Select>

                            {(['bet', 'raise', 'call', 'all-in'].includes(act.action)) && (
                                <Input
                                    type="number"
                                    value={act.amount}
                                    onChange={(e) => updateAction(idx, 'amount', Number(e.target.value))}
                                    placeholder="Amt"
                                    className="w-24 h-7 text-xs"
                                />
                            )}

                            <div className="flex-1" />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAction(idx)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    {actions.length === 0 && (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            No actions logged
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button size="lg" onClick={handleSave} disabled={loading} className="w-48">
                    {loading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Hand
                </Button>
            </div>
        </div>
    )
}
