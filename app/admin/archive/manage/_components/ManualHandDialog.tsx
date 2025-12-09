'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createHand } from '@/app/actions/archive-manage'
import { useQueryClient } from '@tanstack/react-query'

interface ManualHandDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    streamId: string
    streamName: string
}

interface PlayerInput {
    seat: number
    name: string
    playerId: string // For now simplified, in real app would search ID
    holeCards: string
    startStack: number
    position: string
}

interface ActionInput {
    street: 'preflop' | 'flop' | 'turn' | 'river'
    player: string
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
    amount: number
}

export function ManualHandDialog({
    open,
    onOpenChange,
    streamId,
    streamName,
}: ManualHandDialogProps) {
    const queryClient = useQueryClient()
    const [loading, setLoading] = useState(false)

    // Hand Basic Info
    const [handNumber, setHandNumber] = useState(1)
    const [smallBlind, setSmallBlind] = useState(1000)
    const [bigBlind, setBigBlind] = useState(2000)
    const [ante, setAnte] = useState(2000)

    // Board
    const [flop1, setFlop1] = useState('')
    const [flop2, setFlop2] = useState('')
    const [flop3, setFlop3] = useState('')
    const [turn, setTurn] = useState('')
    const [river, setRiver] = useState('')

    // Players
    const [players, setPlayers] = useState<PlayerInput[]>([
        { seat: 1, name: 'Player 1', playerId: 'p1', holeCards: '', startStack: 100000, position: 'SB' },
        { seat: 2, name: 'Player 2', playerId: 'p2', holeCards: '', startStack: 100000, position: 'BB' }
    ])

    // Actions
    const [actions, setActions] = useState<ActionInput[]>([])
    const [currentStreet, setCurrentStreet] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop')

    const resetForm = () => {
        setHandNumber(prev => prev + 1)
        // Keep blinds
        setFlop1('')
        setFlop2('')
        setFlop3('')
        setTurn('')
        setRiver('')
        setActions([])
        // Keep players but reset cards maybe?
        setPlayers(prev => prev.map(p => ({ ...p, holeCards: '' })))
    }

    const handleAddPlayer = () => {
        const nextSeat = players.length + 1
        setPlayers([
            ...players,
            {
                seat: nextSeat,
                name: `Player ${nextSeat}`,
                playerId: `p${nextSeat}`,
                holeCards: '',
                startStack: 100000,
                position: 'BTN'
            }
        ])
    }

    const listPlayerNames = players.map(p => p.name)

    const handleAddAction = (actionType: ActionInput['action']) => {
        // Simple logic to guess actor would be complex, just let user select or default to first
        setActions([
            ...actions,
            {
                street: currentStreet,
                player: players[0]?.name || '',
                action: actionType,
                amount: 0
            }
        ])
    }

    const updateAction = (index: number, field: keyof ActionInput, value: any) => {
        const newActions = [...actions]
        newActions[index] = { ...newActions[index], [field]: value }
        setActions(newActions)
    }

    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!streamId) return

        setLoading(true)
        try {
            // Format Board
            const boardFlop = [flop1, flop2, flop3].filter(Boolean)

            const handData = {
                number: handNumber,
                smallBlind,
                bigBlind,
                ante,
                videoTimestampStart: 0, // Manual doesnt always have TS
                videoTimestampEnd: 0,
                players: players.map(p => ({
                    ...p,
                    holeCards: p.holeCards.split(',').map(c => c.trim()).filter(Boolean)
                })),
                boardFlop,
                boardTurn: turn,
                boardRiver: river,
                actions,
            }

            const result = await createHand(streamId, handData)

            if (result.success) {
                toast.success(`Hand #${handNumber} created successfully`)
                queryClient.invalidateQueries({ queryKey: ['archive'] })
                onOpenChange(false)
                resetForm()
            } else {
                toast.error(result.error || 'Failed to create hand')
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Record Hand - {streamName}</DialogTitle>
                    <DialogDescription>
                        Manually input hand details. Cards format example: "Ah,Kd"
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="info">Info & Board</TabsTrigger>
                        <TabsTrigger value="players">Players</TabsTrigger>
                        <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    {/* === INFO TAB === */}
                    <TabsContent value="info" className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Hand Number</Label>
                                <Input type="number" value={handNumber} onChange={e => setHandNumber(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Small Blind</Label>
                                <Input type="number" value={smallBlind} onChange={e => setSmallBlind(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Big Blind</Label>
                                <Input type="number" value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ante</Label>
                                <Input type="number" value={ante} onChange={e => setAnte(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="rounded-md border p-4">
                            <h4 className="mb-4 text-sm font-medium">Board Cards</h4>
                            <div className="flex gap-4">
                                <div className="flex gap-2">
                                    <Input placeholder="Flop 1" value={flop1} onChange={e => setFlop1(e.target.value)} className="w-20" />
                                    <Input placeholder="Flop 2" value={flop2} onChange={e => setFlop2(e.target.value)} className="w-20" />
                                    <Input placeholder="Flop 3" value={flop3} onChange={e => setFlop3(e.target.value)} className="w-20" />
                                </div>
                                <div className="mx-4 border-l"></div>
                                <Input placeholder="Turn" value={turn} onChange={e => setTurn(e.target.value)} className="w-20" />
                                <div className="mx-4 border-l"></div>
                                <Input placeholder="River" value={river} onChange={e => setRiver(e.target.value)} className="w-20" />
                            </div>
                        </div>
                    </TabsContent>

                    {/* === PLAYERS TAB === */}
                    <TabsContent value="players" className="space-y-4 py-4">
                        <div className="flex justify-between">
                            <h4 className="text-sm font-medium">Players ({players.length})</h4>
                            <Button size="sm" onClick={handleAddPlayer}><Plus className="mr-2 h-4 w-4" /> Add Player</Button>
                        </div>

                        <div className="space-y-2">
                            {players.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-12 text-center text-sm text-muted-foreground">{p.seat}</div>
                                    <Input
                                        value={p.name}
                                        onChange={e => {
                                            const newPlayers = [...players]
                                            newPlayers[idx].name = e.target.value
                                            setPlayers(newPlayers)
                                        }}
                                        placeholder="Name"
                                        className="w-40"
                                    />
                                    <Input
                                        value={p.startStack}
                                        type="number"
                                        onChange={e => {
                                            const newPlayers = [...players]
                                            newPlayers[idx].startStack = Number(e.target.value)
                                            setPlayers(newPlayers)
                                        }}
                                        placeholder="Stack"
                                        className="w-32"
                                    />
                                    <Input
                                        value={p.position}
                                        onChange={e => {
                                            const newPlayers = [...players]
                                            newPlayers[idx].position = e.target.value
                                            setPlayers(newPlayers)
                                        }}
                                        placeholder="Pos"
                                        className="w-20"
                                    />
                                    <Input
                                        value={p.holeCards}
                                        onChange={e => {
                                            const newPlayers = [...players]
                                            newPlayers[idx].holeCards = e.target.value
                                            setPlayers(newPlayers)
                                        }}
                                        placeholder="Ah,Kh"
                                        className="flex-1"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => {
                                        setPlayers(players.filter((_, i) => i !== idx))
                                    }}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* === ACTIONS TAB === */}
                    <TabsContent value="actions" className="space-y-4 py-4">
                        <div className="flex items-center gap-4">
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

                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleAddAction('check')}>Check</Button>
                                <Button size="sm" variant="outline" onClick={() => handleAddAction('call')}>Call</Button>
                                <Button size="sm" variant="outline" onClick={() => handleAddAction('bet')}>Bet</Button>
                                <Button size="sm" variant="outline" onClick={() => handleAddAction('raise')}>Raise</Button>
                                <Button size="sm" variant="outline" onClick={() => handleAddAction('fold')}>Fold</Button>
                            </div>
                        </div>

                        <div className="space-y-2 border rounded-md p-2 h-[300px] overflow-y-auto bg-muted/20">
                            {actions.map((act, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-background p-2 rounded shadow-sm">
                                    <span className="w-16 font-bold text-xs uppercase text-muted-foreground">{act.street}</span>

                                    <Select value={act.player} onValueChange={(v) => updateAction(idx, 'player', v)}>
                                        <SelectTrigger className="w-32 h-8">
                                            <SelectValue placeholder="Player" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {listPlayerNames.map(name => (
                                                <SelectItem key={name} value={name}>{name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={act.action} onValueChange={(v) => updateAction(idx, 'action', v)}>
                                        <SelectTrigger className="w-24 h-8">
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

                                    {(act.action === 'bet' || act.action === 'raise' || act.action === 'call' || act.action === 'all-in') && (
                                        <Input
                                            type="number"
                                            value={act.amount}
                                            onChange={(e) => updateAction(idx, 'amount', Number(e.target.value))}
                                            placeholder="Amount"
                                            className="w-24 h-8"
                                        />
                                    )}

                                    <div className="flex-1" />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeAction(idx)}>
                                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}
                            {actions.length === 0 && (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    No actions recorded
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="mr-2 h-4 w-4" />}
                        Save Hand
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
