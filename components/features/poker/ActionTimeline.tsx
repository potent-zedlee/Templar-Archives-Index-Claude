'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { type PokerActionType } from '@/lib/db/firestore-types'

export interface HandAction {
  id: string
  hand_player_id: string
  street: 'preflop' | 'flop' | 'turn' | 'river'
  action_type: PokerActionType
  amount: number
  timestamp?: number
  action_sequence: number
  player_name?: string
}

interface ActionTimelineProps {
  actions: HandAction[]
  potByStreet?: {
    preflop?: number
    flop?: number
    turn?: number
    river?: number
  }
  className?: string
}

const ACTION_COLORS: Record<string, string> = {
  fold: 'bg-gray-500 text-white',
  call: 'bg-blue-500 text-white',
  raise: 'bg-orange-500 text-white',
  check: 'bg-green-500 text-white',
  bet: 'bg-purple-500 text-white',
  'all-in': 'bg-red-500 text-white animate-pulse',
  'post-blind': 'bg-gray-400 text-white',
  'post-ante': 'bg-gray-300 text-gray-700',
  'muck': 'bg-gray-600 text-white',
  'win': 'bg-yellow-500 text-black font-bold',
}

const STREET_DISPLAY: Record<string, string> = {
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

function ActionBadge({
  action,
  className,
}: {
  action: HandAction
  className?: string
}) {
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`
    return amount.toLocaleString()
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="font-medium text-sm min-w-[100px]">
        {action.player_name || 'Unknown'}:
      </div>
      <Badge
        className={cn(
          'font-semibold',
          ACTION_COLORS[action.action_type] || 'bg-gray-400 text-white'
        )}
      >
        {action.action_type.toUpperCase()}
        {action.amount > 0 && ` ${formatAmount(action.amount)}`}
      </Badge>
    </div>
  )
}

function StreetActions({ street, actions }: { street: string; actions: HandAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No actions recorded for {STREET_DISPLAY[street]}
      </div>
    )
  }

  // Sort by action_sequence
  const sortedActions = [...actions].sort(
    (a, b) => a.action_sequence - b.action_sequence
  )

  return (
    <div className="space-y-2">
      {sortedActions.map((action) => (
        <ActionBadge key={action.id} action={action} />
      ))}
    </div>
  )
}

export function ActionTimeline({
  actions,
  potByStreet,
  className,
}: ActionTimelineProps) {
  const [activeTab, setActiveTab] = useState('preflop')

  // Group actions by street
  const actionsByStreet = {
    preflop: actions.filter((a) => a.street === 'preflop'),
    flop: actions.filter((a) => a.street === 'flop'),
    turn: actions.filter((a) => a.street === 'turn'),
    river: actions.filter((a) => a.street === 'river'),
  }

  // Count actions per street
  const actionCounts = {
    preflop: actionsByStreet.preflop.length,
    flop: actionsByStreet.flop.length,
    turn: actionsByStreet.turn.length,
    river: actionsByStreet.river.length,
  }

  const formatPot = (pot?: number) => {
    if (!pot) return ''
    if (pot >= 1000000) return `${(pot / 1000000).toFixed(1)}M`
    if (pot >= 1000) return `${(pot / 1000).toFixed(1)}K`
    return pot.toLocaleString()
  }

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {(['preflop', 'flop', 'turn', 'river'] as const).map((street) => (
            <TabsTrigger key={street} value={street} className="relative">
              <div className="flex flex-col items-center gap-1">
                <span>{STREET_DISPLAY[street]}</span>
                {potByStreet?.[street] !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatPot(potByStreet[street])} BB
                  </span>
                )}
              </div>
              {actionCounts[street] > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
                  {actionCounts[street]}
                </div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(['preflop', 'flop', 'turn', 'river'] as const).map((street) => (
          <TabsContent key={street} value={street} className="mt-4 p-4 border rounded-lg">
            <StreetActions
              street={street}
              actions={actionsByStreet[street]}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
