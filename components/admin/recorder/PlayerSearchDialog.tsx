"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Search, User } from "lucide-react"
import { useSearchPlayersQuery } from "@/lib/queries/archive-queries"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface PlayerSearchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (player: { id: string, name: string }) => void
}

export function PlayerSearchDialog({ open, onOpenChange, onSelect }: PlayerSearchDialogProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearch = useDebounce(searchTerm, 300)

    // Real query
    const { data: searchResults, isLoading } = useSearchPlayersQuery(debouncedSearch)

    // TODO: Add "Recent Players" context here


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select Player</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                            autoFocus
                        />
                    </div>

                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-1">
                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <>
                                {/* Results */}
                                {searchResults?.map((player) => (
                                    <Button
                                        key={player.id}
                                        variant="ghost"
                                        className="w-full justify-start gap-2"
                                        onClick={() => onSelect(player)}
                                    >
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={player.photoUrl} />
                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                        <span>{player.name}</span>
                                    </Button>
                                ))}

                                {debouncedSearch && searchResults?.length === 0 && (
                                    <div className="text-center text-sm text-muted-foreground p-4">
                                        No players found.
                                        {/* Option to create new player inline? */}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
