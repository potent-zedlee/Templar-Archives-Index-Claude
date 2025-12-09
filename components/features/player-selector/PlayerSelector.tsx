'use client'

import * as React from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { searchPlayers, type PlayerSearchResult } from '@/app/actions/player-search'
import { useDebounce } from '@/hooks/useDebounce'

interface PlayerSelectorProps {
    value: string // player Name
    onChange: (name: string, playerId?: string) => void
    disabled?: boolean
}

export function PlayerSelector({ value, onChange, disabled }: PlayerSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState<PlayerSearchResult[]>([])
    const [loading, setLoading] = React.useState(false)

    const debouncedQuery = useDebounce(query, 300)

    React.useEffect(() => {
        if (open && value) {
            setQuery(value)
        }
    }, [open, value])

    React.useEffect(() => {
        async function fetchPlayers() {
            if (debouncedQuery.length < 1) {
                setResults([])
                return
            }
            setLoading(true)
            try {
                const data = await searchPlayers(debouncedQuery)
                setResults(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchPlayers()
    }, [debouncedQuery])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-start font-normal px-2 h-auto py-1"
                >
                    {value || <span className="text-muted-foreground opacity-50">Select Player</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search player..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="p-2 text-xs text-center text-muted-foreground">Searching...</div>}

                        <CommandGroup heading="Existing Players">
                            {results.map((player) => (
                                <CommandItem
                                    key={player.id}
                                    value={player.name}
                                    onSelect={() => {
                                        onChange(player.name, player.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === player.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {player.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {query.length > 0 && !results.some(p => p.name.toLowerCase() === query.toLowerCase()) && (
                            <>
                                <CommandSeparator />
                                <CommandGroup heading="New Player">
                                    <CommandItem
                                        value={query}
                                        onSelect={() => {
                                            onChange(query, undefined) // No ID = new player or manual entry
                                            setOpen(false)
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Use &quot;{query}&quot;
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
