"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, Check, Trash, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { RecorderPlayer } from "./HandRecorderForm"

interface ActionTimelineInputProps {
    street: string
    players: RecorderPlayer[]
    actions: any[]
    onAddAction: (action: any) => void
    onRemoveAction: (index: number) => void
}

export function ActionTimelineInput({
    street,
    players,
    actions,
    onAddAction,
    onRemoveAction
}: ActionTimelineInputProps) {
    const listRef = useRef<HTMLDivElement>(null)

    // Local form for adding action
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
    const [actionType, setActionType] = useState<string>("fold")
    const [amount, setAmount] = useState<string>("")

    // Auto-scroll to bottom
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [actions])

    const handleAdd = () => {
        if (!selectedPlayerId) return
        const player = players.find(p => p.playerId === selectedPlayerId)
        if (!player) return

        onAddAction({
            player: player.name,
            playerId: player.playerId,
            street,
            action: actionType,
            amount: amount ? parseInt(amount) : 0,
            timestamp: Date.now() // Logic timestamp
        })

        // Auto-advance logic could go here (e.g. iterate to next player)
        setAmount("")
        // keep player selected? or valid next player logic
    }

    // Determine valid next players based on position? (Too complex for MVP)

    return (
        <div className="flex flex-col h-[300px]">
            {/* Action List */}
            <div className="flex-1 border rounded-md mb-2 overflow-hidden bg-muted/20 relative">
                <div className="absolute inset-0 overflow-y-auto p-2 space-y-1" ref={listRef}>
                    {actions.length === 0 && <div className="text-center text-muted-foreground text-xs pt-10">No actions recorded</div>}

                    {actions.map((action, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-muted/50 rounded group">
                            <div className="flex gap-2 items-center">
                                <Badge variant="outline" className="w-16 justify-center text-[10px]">{action.street}</Badge>
                                <span className="font-medium">{action.player}</span>
                                <span className={getActionColor(action.action)}>{action.action}</span>
                                {action.amount > 0 && <span className="font-mono text-xs opacity-80">${action.amount.toLocaleString()}</span>}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                onClick={() => onRemoveAction(idx)}
                            >
                                <Trash className="h-3 w-3 text-red-500" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                    <span className="text-xs font-medium pl-1">Player</span>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select Player" />
                        </SelectTrigger>
                        <SelectContent>
                            {players.map(p => (
                                <SelectItem key={p.playerId} value={p.playerId!}>
                                    {p.seat}: {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <span className="text-xs font-medium pl-1">Action</span>
                    <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fold">Fold</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="bet">Bet</SelectItem>
                            <SelectItem value="raise">Raise</SelectItem>
                            <SelectItem value="all-in">All-in</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <span className="text-xs font-medium pl-1">Amount</span>
                    <Input
                        type="number"
                        className="h-8"
                        placeholder="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        disabled={['fold', 'check'].includes(actionType)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd()
                        }}
                    />
                </div>

                <Button size="icon" className="h-8 w-8 mb-[1px]" onClick={handleAdd}>
                    <Check className="h-4 w-4" />
                </Button>
            </div>

            {/* Quick Buttons for Speed? */}
            <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                {['fold', 'check', 'call'].map(act => (
                    <Button
                        key={act}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => {
                            setActionType(act)
                            // Ideally checking one of these might auto-submit if player is selected?
                            // For now just set type
                        }}
                    >
                        {act}
                    </Button>
                ))}
            </div>
        </div>
    )
}

function getActionColor(action: string) {
    switch (action) {
        case 'fold': return 'text-muted-foreground italic'
        case 'check': return 'text-zinc-500'
        case 'call': return 'text-blue-600 dark:text-blue-400'
        case 'bet': return 'text-amber-600 dark:text-amber-400 font-semibold'
        case 'raise': return 'text-orange-600 dark:text-orange-400 font-bold'
        case 'all-in': return 'text-red-600 dark:text-red-400 font-bold uppercase'
        default: return ''
    }
}
