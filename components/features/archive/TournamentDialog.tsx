"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { TournamentCategory } from "@/lib/firestore-types"

// Local type for component props (using Firestore camelCase)
type Tournament = {
  category: TournamentCategory
}
import { createTournament, updateTournament } from "@/app/actions/archive"

interface TournamentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingTournamentId: string
  onSave: () => void
  onCancel: () => void
  newTournamentName: string
  setNewTournamentName: (name: string) => void
  newCategory: Tournament["category"]
  setNewCategory: (category: Tournament["category"]) => void
  newGameType: 'tournament' | 'cash-game'
  setNewGameType: (gameType: 'tournament' | 'cash-game') => void
  newLocation: string
  setNewLocation: (location: string) => void
  newCity: string
  setNewCity: (city: string) => void
  newCountry: string
  setNewCountry: (country: string) => void
  newStartDate: string
  setNewStartDate: (date: string) => void
  newEndDate: string
  setNewEndDate: (date: string) => void
  isUserAdmin: boolean
}

export function TournamentDialog({
  isOpen,
  onOpenChange,
  editingTournamentId,
  onSave,
  onCancel,
  newTournamentName,
  setNewTournamentName,
  newCategory,
  setNewCategory,
  newGameType,
  setNewGameType,
  newLocation,
  setNewLocation,
  newCity,
  setNewCity,
  newCountry,
  setNewCountry,
  newStartDate,
  setNewStartDate,
  newEndDate,
  setNewEndDate,
  isUserAdmin,
}: TournamentDialogProps) {
  const [saving, setSaving] = useState(false)

  if (!isUserAdmin) return null

  const handleSave = async () => {
    // Validation
    if (!newTournamentName.trim() || !newLocation.trim() || !newStartDate || !newEndDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)

    // Tournament data
    const tournamentData = {
      name: newTournamentName.trim(),
      category: newCategory,
      game_type: newGameType,
      location: newLocation.trim(),
      city: newCity.trim() || undefined,
      country: newCountry.trim() || undefined,
      start_date: newStartDate,
      end_date: newEndDate,
    }

    try {
      let result

      if (editingTournamentId) {
        // Update existing tournament via Server Action
        result = await updateTournament(editingTournamentId, tournamentData)
      } else {
        // Create new tournament via Server Action
        result = await createTournament(tournamentData)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success(editingTournamentId ? 'Tournament updated successfully' : 'Tournament created successfully')

      // Call success callback
      onSave()
    } catch (error: any) {
      console.error('[TournamentDialog] Error saving tournament:', error)
      toast.error(error.message || 'Failed to save tournament')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingTournamentId ? "Edit Tournament" : "Add Tournament"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-200px)] -mx-6 px-6">
          <div className="space-y-3 py-3">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={newCategory} onValueChange={(value) => setNewCategory(value as Tournament["category"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WSOP">WSOP</SelectItem>
                <SelectItem value="Triton">Triton</SelectItem>
                <SelectItem value="EPT">EPT</SelectItem>
                <SelectItem value="APT">APT</SelectItem>
                <SelectItem value="APL">APL</SelectItem>
                <SelectItem value="Hustler Casino Live">Hustler Casino Live</SelectItem>
                <SelectItem value="WSOP Classic">WSOP Classic</SelectItem>
                <SelectItem value="GGPOKER">GGPOKER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logo Auto-Match Info */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
            <Label>토너먼트 로고</Label>
            <p className="text-sm text-muted-foreground">
              로고는 토너먼트 이름과 카테고리를 기반으로 자동 매칭됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-type">Game Type</Label>
            <Select value={newGameType} onValueChange={(value) => setNewGameType(value as 'tournament' | 'cash-game')}>
              <SelectTrigger>
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="cash-game">Cash Game</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament-name">Tournament Name</Label>
            <Input
              id="tournament-name"
              placeholder="e.g., 2025 WSOP Main Event"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Legacy)</Label>
            <Input
              id="location"
              placeholder="e.g., Las Vegas, Seoul, Online"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <p className="text-caption text-muted-foreground">
              Legacy field. Use City and Country below for new tournaments.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., Las Vegas, Macau, Paris"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="e.g., USA, CHN, FRA"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingTournamentId ? "Edit" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
