"use client"

/**
 * Archive Tournament Logos Bar
 *
 * 수평 스크롤 가능한 투어 로고 바
 * - Netflix/Spotify 스타일 수평 스크롤
 * - ALL 버튼 + 주요 투어 로고
 * - 선택된 투어 강조
 * - 부모 카테고리 클릭 시 자식 카테고리가 옆에 인라인 확장
 * - 게임 타입별 필터링 (토너먼트/캐쉬게임/둘 다)
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/common/CategoryLogo'
import { useActiveCategoriesQuery } from '@/lib/queries/category-queries'
import type { TournamentCategory as DatabaseCategory, GameType } from '@/lib/poker/tournament-categories'
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react'

interface ArchiveTournamentLogosBarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  gameType?: GameType  // 'tournament' | 'cash_game' | 'both' - 필터링할 게임 타입
  className?: string
}

export function ArchiveTournamentLogosBar({
  selectedCategory,
  onCategoryChange,
  gameType,
  className
}: ArchiveTournamentLogosBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null)

  // Fetch active categories from database
  const { data: allCategories = [] } = useActiveCategoriesQuery()

  // Filter categories by game type and get root categories only
  const rootCategories = useMemo(() => {
    let filtered = allCategories.filter(cat => !cat.parentId)

    // Game type filter
    if (gameType && gameType !== 'both') {
      filtered = filtered.filter(cat => cat.gameType === gameType || cat.gameType === 'both')
    }

    // Sort by name (alphabetical)
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [allCategories, gameType])

  // Get children for a parent category
  const getChildren = (parentId: string) => {
    let children = allCategories.filter(cat => cat.parentId === parentId)

    // Game type filter for children
    if (gameType && gameType !== 'both') {
      children = children.filter(cat => cat.gameType === gameType || cat.gameType === 'both')
    }

    return children.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Auto-scroll to selected tournament
  useEffect(() => {
    if (!scrollRef.current || selectedCategory === 'All') return

    const selectedElement = scrollRef.current.querySelector(`[data-category-id="${selectedCategory}"]`)
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [selectedCategory])

  return (
    <div
      className={cn(
        "w-full bg-[#1a1a1a] border-b border-border/40",
        className
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Horizontal Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* ALL Button */}
          <button
            onClick={() => onCategoryChange('All')}
            className={cn(
              "flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-200",
              "hover:scale-110"
            )}
            aria-label="Show all tournaments"
            aria-pressed={selectedCategory === 'All'}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
                selectedCategory === 'All'
                  ? "text-white ring-2 ring-primary shadow-lg scale-110"
                  : "text-muted-foreground"
              )}
            >
              <LayoutGrid className="w-8 h-8" />
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-colors duration-200",
                selectedCategory === 'All'
                  ? "text-white"
                  : "text-muted-foreground"
              )}
            >
              All
            </span>
          </button>

          {/* Tournament Logos */}
          {rootCategories.map((category) => {
            const children = getChildren(category.id)
            const hasChildren = children.length > 0
            const isExpanded = expandedParentId === category.id

            return (
              <div key={category.id} className="flex-shrink-0 flex items-center gap-4">
                {/* Parent Category Button */}
                <TournamentLogoButton
                  category={category}
                  isSelected={selectedCategory === category.id}
                  onClick={() => {
                    if (hasChildren) {
                      setExpandedParentId(isExpanded ? null : category.id)
                    }
                    onCategoryChange(category.id)
                  }}
                  hasChildren={hasChildren}
                />

                {/* Child Categories (shown inline when expanded) */}
                {isExpanded && hasChildren && (
                  <div className="flex items-center gap-3 pl-2">
                    {children.map((child) => (
                      <TournamentLogoButton
                        key={child.id}
                        category={child}
                        isSelected={selectedCategory === child.id}
                        onClick={() => {
                          onCategoryChange(child.id)
                        }}
                        hasChildren={false}
                        isChildCategory={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Fade out effect at the end */}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

interface TournamentLogoButtonProps {
  category: DatabaseCategory
  isSelected: boolean
  onClick: () => void
  hasChildren?: boolean
  isChildCategory?: boolean
}

function TournamentLogoButton({
  category,
  isSelected,
  onClick,
  hasChildren = false,
  isChildCategory = false
}: TournamentLogoButtonProps) {
  return (
    <button
      onClick={onClick}
      data-category-id={category.id}
      className={cn(
        "flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-200",
        "hover:scale-110",
        isSelected && "scale-110",
        "relative",
        isChildCategory && "opacity-90"
      )}
      aria-label={`Filter by ${category.displayName}`}
      aria-pressed={isSelected}
      aria-haspopup={hasChildren}
    >
      {/* Logo Container */}
      <div
        className={cn(
          "rounded-lg flex items-center justify-center transition-all duration-200 overflow-hidden relative",
          isChildCategory ? "w-12 h-12" : "w-16 h-16",
          isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20"
        )}
      >
        {isChildCategory && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3">
            <ChevronRight className="w-3 h-3 text-primary/70" />
          </div>
        )}
        <CategoryLogo
          category={category}
          size={isChildCategory ? "md" : "lg"}
          className={isChildCategory ? "w-10 h-10" : "w-12 h-12"}
          fallback="text"
        />
        {hasChildren && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-primary/80 rounded-full flex items-center justify-center">
            <ChevronDown className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Tournament Name */}
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200 text-center truncate",
          isChildCategory ? "max-w-[48px]" : "max-w-[64px]",
          isSelected
            ? "text-white"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {category.displayName}
      </span>
    </button>
  )
}
