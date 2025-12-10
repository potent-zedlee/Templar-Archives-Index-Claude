'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { searchStreams, type StreamSearchResult } from '@/app/actions/stream-search'
import { useDebounce } from '@/hooks/useDebounce'

interface StreamSelectorProps {
    selectedStreamId?: string
    onSelect: (stream: StreamSearchResult) => void
}

export function StreamSelector({ selectedStreamId, onSelect }: StreamSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [results, setResults] = React.useState<StreamSearchResult[]>([])
    const [loading, setLoading] = React.useState(false)

    const debouncedQuery = useDebounce(query, 300)

    React.useEffect(() => {
        async function fetchStreams() {
            setLoading(true)
            try {
                // If query is empty or short, this will now return default streams (configured in server action)
                const data = await searchStreams(debouncedQuery)
                setResults(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchStreams()
    }, [debouncedQuery])

    const selectedStream = React.useMemo(() => {
        // If we have results, check there first (most likely scenario during interaction)
        const found = results.find(s => s.id === selectedStreamId)
        // If not found in search results, we might want to fetch it or just show ID if simplistic
        // But for this component, we mainly rely on search. 
        // Ideally, if selectedStreamId is passed but not in results, parent should pass full object or we fetch it.
        // For now, let's assume we maintain the name via parent or it's enough to show "Selected"
        // Actually, for better UX, let's keep it simple: "Select Stream..." unless we know the name.
        return found
    }, [results, selectedStreamId])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[400px] justify-between"
                >
                    {selectedStream
                        ? `${selectedStream.name} (${selectedStream.eventName})`
                        : selectedStreamId ? "Stream Selected" : "Search stream... (shows recent by default)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search stream name..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="p-4 text-sm text-center text-muted-foreground">Searching...</div>}
                        {!loading && results.length === 0 && <CommandEmpty>No stream found.</CommandEmpty>}
                        <CommandGroup>
                            {!loading && results.map((stream) => (
                                <CommandItem
                                    key={stream.id}
                                    value={stream.id}
                                    onSelect={() => {
                                        onSelect(stream)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedStreamId === stream.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{stream.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {stream.tournamentName} &gt; {stream.eventName}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
