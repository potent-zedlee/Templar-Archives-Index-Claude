"use client"

/**
 * LogoPicker 컴포넌트
 *
 * Category 관리자 전용 로고 선택 컴포넌트
 * (Tournament는 자동 매칭 사용)
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search } from "lucide-react"
import Image from "next/image"
import { getAllLogos, searchLogos, type LogoFile } from "@/lib/logo-utils"
import { cn } from "@/lib/utils"

interface LogoPickerProps {
  selectedLogo: string
  onSelect: (url: string) => void
}

export function LogoPicker({ selectedLogo, onSelect }: LogoPickerProps) {
  const [logos, setLogos] = useState<LogoFile[]>([])
  const [filteredLogos, setFilteredLogos] = useState<LogoFile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLogos() {
      try {
        const allLogos = await getAllLogos()
        setLogos(allLogos)
        setFilteredLogos(allLogos)
      } catch (error) {
        console.error('Failed to load logos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLogos()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = searchLogos(logos, searchQuery)
      setFilteredLogos(filtered)
    } else {
      setFilteredLogos(logos)
    }
  }, [searchQuery, logos])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="logo-search">Search Logos</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="logo-search"
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Logo Grid */}
      <ScrollArea className="h-64 border rounded-lg p-2">
        {filteredLogos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No logos found
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredLogos.map((logo) => (
              <Button
                key={logo.path}
                type="button"
                variant="outline"
                className={cn(
                  "h-20 p-2 relative",
                  selectedLogo === logo.url && "ring-2 ring-primary"
                )}
                onClick={() => onSelect(logo.url)}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={logo.url}
                    alt={logo.name}
                    fill
                    className="object-contain"
                  />
                </div>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        {filteredLogos.length} logo(s) available
      </p>
    </div>
  )
}
