"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Edit, X } from "lucide-react"
import type { Event } from "@/lib/types/archive"
import type { PayoutRow } from "@/hooks/useArchiveState"
import { saveEventPayouts } from "@/app/actions/archive"

interface EventPayout {
  id: string
  rank: number
  playerName: string
  prizeAmount: number
}

interface EventInfoDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  event: Event | null
  isUserAdmin: boolean
  onSuccess?: () => void
}

export function EventInfoDialog({
  isOpen,
  onOpenChange,
  eventId,
  event,
  isUserAdmin,
  onSuccess,
}: EventInfoDialogProps) {
  const [viewingPayouts, setViewingPayouts] = useState<EventPayout[]>([])
  const [loadingViewingPayouts, setLoadingViewingPayouts] = useState(false)
  const [isEditingViewingPayouts, setIsEditingViewingPayouts] = useState(false)
  const [editingViewingPayouts, setEditingViewingPayouts] = useState<PayoutRow[]>([])
  const [savingPayouts, setSavingPayouts] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditingViewingPayouts(false)
      setEditingViewingPayouts([])
    }
  }, [isOpen])

  // Load payouts when dialog opens
  useEffect(() => {
    if (isOpen && eventId) {
      loadViewingPayouts(eventId)
    }
  }, [isOpen, eventId])

  const loadViewingPayouts = async (eventIdParam: string) => {
    setLoadingViewingPayouts(true)
    try {
      const response = await fetch(`/api/events/${eventIdParam}/payouts`)
      if (!response.ok) {
        throw new Error('Failed to fetch payouts')
      }
      const { data } = await response.json()
      setViewingPayouts(data || [])
    } catch (error) {
      console.error('Error loading payouts:', error)
      setViewingPayouts([])
    } finally {
      setLoadingViewingPayouts(false)
    }
  }

  // Format cents to display format: 1000000000 -> "$10,000,000"
  const formatPrizeAmount = (cents: number): string => {
    const dollars = cents / 100
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Extract country info from player name
  const getCountryInfo = (playerName: string): { flag: string; iso2: string; cleanName: string } => {
    const match = playerName.match(/\(([A-Z]{2,3})\)$/)
    if (!match) {
      return { flag: '', iso2: '', cleanName: playerName }
    }

    let countryCode = match[1]

    // Convert 3-letter to 2-letter ISO code
    const country3to2: Record<string, string> = {
      'USA': 'US', 'GBR': 'GB', 'KOR': 'KR', 'JPN': 'JP', 'CHN': 'CN',
      'FRA': 'FR', 'DEU': 'DE', 'ITA': 'IT', 'ESP': 'ES', 'CAN': 'CA',
      'AUS': 'AU', 'BRA': 'BR', 'MEX': 'MX', 'RUS': 'RU', 'IND': 'IN',
      'NLD': 'NL', 'BEL': 'BE', 'SWE': 'SE', 'NOR': 'NO', 'DNK': 'DK',
      'FIN': 'FI', 'POL': 'PL', 'CZE': 'CZ', 'AUT': 'AT', 'CHE': 'CH',
      'PRT': 'PT', 'GRC': 'GR', 'TUR': 'TR', 'ISR': 'IL', 'ARE': 'AE',
      'SAU': 'SA', 'EGY': 'EG', 'ZAF': 'ZA', 'ARG': 'AR', 'CHL': 'CL',
      'COL': 'CO', 'PER': 'PE', 'VEN': 'VE', 'THA': 'TH', 'VNM': 'VN',
      'MYS': 'MY', 'SGP': 'SG', 'IDN': 'ID', 'PHL': 'PH', 'HKG': 'HK',
      'TWN': 'TW', 'MAC': 'MO', 'NZL': 'NZ', 'IRL': 'IE', 'LUX': 'LU',
    }

    const iso2 = country3to2[countryCode] || (countryCode.length === 2 ? countryCode : countryCode.substring(0, 2))

    // Try to convert 2-letter ISO code to flag emoji
    let flag = ''
    try {
      flag = iso2
        .toUpperCase()
        .split('')
        .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
        .join('')

      // Test if emoji is valid (some browsers don't support all flags)
      // If not, we'll fall back to ISO code
    } catch (e) {
      flag = ''
    }

    const cleanName = playerName.replace(/\s*\([A-Z]{2,3}\)$/, '')

    return { flag, iso2, cleanName }
  }

  // Editing payout helper functions
  const addEditingPayoutRow = () => {
    setEditingViewingPayouts([...editingViewingPayouts, {
      rank: editingViewingPayouts.length + 1,
      playerName: "",
      prizeAmount: ""
    }])
  }

  const removeEditingPayoutRow = (index: number) => {
    if (editingViewingPayouts.length === 1) return
    const newPayouts = editingViewingPayouts.filter((_, i) => i !== index)
    setEditingViewingPayouts(newPayouts.map((p, i) => ({ ...p, rank: i + 1 })))
  }

  const updateEditingPayoutRow = (index: number, field: keyof PayoutRow, value: string | number) => {
    const newPayouts = [...editingViewingPayouts]
    newPayouts[index] = { ...newPayouts[index], [field]: value }
    setEditingViewingPayouts(newPayouts)
  }

  // Enter edit mode for viewing payouts
  const enterEditMode = () => {
    const payoutsToEdit = viewingPayouts.map(p => ({
      rank: p.rank,
      playerName: p.playerName,
      prizeAmount: formatPrizeAmount(p.prizeAmount),
    }))
    setEditingViewingPayouts(payoutsToEdit.length > 0 ? payoutsToEdit : [{ rank: 1, playerName: "", prizeAmount: "" }])
    setIsEditingViewingPayouts(true)
  }

  // Cancel editing
  const cancelEditingPayouts = () => {
    setIsEditingViewingPayouts(false)
    setEditingViewingPayouts([])
  }

  // Save edited payouts via Server Action
  const saveEditingPayouts = async () => {
    if (!eventId) return

    setSavingPayouts(true)
    try {
      // Save via Server Action
      const result = await saveEventPayouts(eventId, editingViewingPayouts)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save payouts')
      }

      // Reload payouts and exit edit mode
      await loadViewingPayouts(eventId)
      setIsEditingViewingPayouts(false)
      setEditingViewingPayouts([])
      toast.success('Payouts saved successfully')
      onSuccess?.()
    } catch (error) {
      console.error('Error saving payouts:', error)
      toast.error('Failed to save payouts')
    } finally {
      setSavingPayouts(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Event Information</DialogTitle>
        </DialogHeader>
        {event && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="payout">Payout</TabsTrigger>
              <TabsTrigger value="structure">Blind Structure</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-caption text-muted-foreground">Event Name</Label>
                      <p className="text-body font-medium">{event.name}</p>
                    </div>
                    <div>
                      <Label className="text-caption text-muted-foreground">Date</Label>
                      <p className="text-body font-medium">{event.date || "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-caption text-muted-foreground">Total Prize</Label>
                      <p className="text-body font-medium">{event.totalPrize || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-caption text-muted-foreground">Winner</Label>
                      <p className="text-body font-medium">{event.winner || "-"}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-body font-semibold mb-3">Event Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-caption text-muted-foreground">Buy-in</Label>
                        <p className="text-body">{event.buyIn || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-caption text-muted-foreground">Entry Count</Label>
                        <p className="text-body">{event.entryCount?.toLocaleString() || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-caption text-muted-foreground">Level Duration</Label>
                      <p className="text-body">{event.levelDuration ? `${event.levelDuration} minutes` : "-"}</p>
                    </div>
                    <div>
                      <Label className="text-caption text-muted-foreground">Starting Stack</Label>
                      <p className="text-body">{event.startingStack?.toLocaleString() || "-"}</p>
                    </div>
                  </div>

                  {event.notes && (
                    <div className="border-t pt-4">
                      <Label className="text-caption text-muted-foreground">Notes</Label>
                      <p className="text-body mt-1 p-3 rounded-md border bg-muted/30 whitespace-pre-wrap">{event.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Payout Tab */}
            <TabsContent value="payout" className="space-y-4 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loadingViewingPayouts ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-body text-muted-foreground">Loading...</p>
                  </div>
                ) : isEditingViewingPayouts ? (
                  <div className="space-y-3">
                    {/* Edit Mode */}
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Edit Payout</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEditingPayoutRow}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Add Rank
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editingViewingPayouts.map((payout, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-16">
                            <Input
                              placeholder="#"
                              value={payout.rank}
                              disabled
                              className="text-center"
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Player Name"
                              value={payout.playerName}
                              onChange={(e) => updateEditingPayoutRow(index, 'playerName', e.target.value)}
                            />
                          </div>
                          <div className="w-40">
                            <Input
                              placeholder="$10M"
                              value={payout.prizeAmount}
                              onChange={(e) => updateEditingPayoutRow(index, 'prizeAmount', e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEditingPayoutRow(index)}
                            disabled={editingViewingPayouts.length === 1}
                            className="h-9 w-9 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        variant="outline"
                        onClick={cancelEditingPayouts}
                        disabled={savingPayouts}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveEditingPayouts}
                        disabled={savingPayouts}
                      >
                        {savingPayouts ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : viewingPayouts.length > 0 ? (
                  <div className="space-y-2">
                    {/* View Mode */}
                    {isUserAdmin && (
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={enterEditMode}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    )}
                    <div className="grid grid-cols-[50px_50px_1fr_auto] gap-3 p-3 bg-muted/30 rounded-md font-medium text-caption">
                      <div>Rank</div>
                      <div>Country</div>
                      <div>Player</div>
                      <div className="text-right">Prize</div>
                    </div>
                    {viewingPayouts.map((payout) => {
                      const { flag, iso2, cleanName } = getCountryInfo(payout.playerName)

                      return (
                        <div key={payout.id} className="grid grid-cols-[50px_50px_1fr_auto] gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                          <div className="text-body font-medium">{payout.rank}</div>
                          <div className="text-body">
                            {flag ? (
                              <span className="text-lg" title={iso2}>{flag}</span>
                            ) : iso2 ? (
                              <span className="text-xs font-medium text-muted-foreground">{iso2}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                          <div className="text-body">{cleanName}</div>
                          <div className="text-body text-right font-medium whitespace-nowrap">{formatPrizeAmount(payout.prizeAmount)}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    {/* No Data */}
                    <p className="text-body text-muted-foreground">No payout information available</p>
                    {isUserAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enterEditMode}
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Add Payout
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Blind Structure Tab */}
            <TabsContent value="structure" className="space-y-4 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {event.blindStructure ? (
                  <div className="space-y-2">
                    <Label className="text-caption text-muted-foreground">Blind Structure</Label>
                    <pre className="text-xs whitespace-pre-wrap font-mono p-4 rounded-md border bg-muted/30">{event.blindStructure}</pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-body text-muted-foreground">No blind structure information available</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
