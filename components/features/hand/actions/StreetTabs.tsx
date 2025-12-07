"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { Street } from "@/lib/poker/hand-actions"

type StreetTabsProps = {
  activeStreet: Street
  onStreetChange: (street: Street) => void
  actionCounts: Record<Street, number>
}

const STREETS: { value: Street; label: string }[] = [
  { value: 'preflop', label: 'Pre-Flop' },
  { value: 'flop', label: 'Flop' },
  { value: 'turn', label: 'Turn' },
  { value: 'river', label: 'River' },
]

export function StreetTabs({
  activeStreet,
  onStreetChange,
  actionCounts,
}: StreetTabsProps) {
  return (
    <Tabs value={activeStreet} onValueChange={(v) => onStreetChange(v as Street)}>
      <TabsList className="grid w-full grid-cols-4">
        {STREETS.map(street => (
          <TabsTrigger key={street.value} value={street.value} className="gap-2">
            {street.label}
            {actionCounts[street.value] > 0 && (
              <Badge variant="secondary" className="ml-1">
                {actionCounts[street.value]}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
