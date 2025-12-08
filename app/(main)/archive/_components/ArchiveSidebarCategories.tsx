"use client"

/**
 * Archive Sidebar Categories - Flowbite Redesigned
 *
 * 완전히 새로운 디자인:
 * - 간단한 리스트 형태
 * - 텍스트 겹침 없음
 * - Flowbite 패턴 적용
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/common/CategoryLogo'
import { useActiveCategoriesQuery } from '@/lib/queries/category-queries'
import type { GameType } from '@/lib/poker/tournament-categories'
import { ChevronRight, LayoutGrid } from 'lucide-react'

interface ArchiveSidebarCategoriesProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  gameType?: GameType
}

export function ArchiveSidebarCategories({
  selectedCategory,
  onCategoryChange,
  gameType
}: ArchiveSidebarCategoriesProps) {
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set())

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
  const getChildren = useCallback((parentId: string) => {
    let children = allCategories.filter(cat => cat.parentId === parentId)

    // Game type filter for children
    if (gameType && gameType !== 'both') {
      children = children.filter(cat => cat.gameType === gameType || cat.gameType === 'both')
    }

    return children.sort((a, b) => a.name.localeCompare(b.name))
  }, [allCategories, gameType])

  // Auto-expand parent when child category is selected
  useEffect(() => {
    if (selectedCategory === 'All') return

    // Find if selected category is a child and auto-expand its parent
    const selectedCat = allCategories.find(cat => cat.id === selectedCategory)
    if (selectedCat?.parentId) {
      const parentId = selectedCat.parentId
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedParentIds(prev => {
        const newSet = new Set(prev)
        newSet.add(parentId)
        return newSet
      })
    }
    // If selected category is a parent with children, auto-expand it
    else if (selectedCat) {
      const children = getChildren(selectedCat.id)
      if (children.length > 0) {
        setExpandedParentIds(prev => {
          const newSet = new Set(prev)
          newSet.add(selectedCat.id)
          return newSet
        })
      }
    }
  }, [selectedCategory, allCategories, getChildren])

  // Toggle parent expansion
  const toggleParent = (parentId: string) => {
    const newExpanded = new Set(expandedParentIds)
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId)
    } else {
      newExpanded.add(parentId)
    }
    setExpandedParentIds(newExpanded)
  }

  return (
    <div className="space-y-1 overflow-hidden">
      {/* ALL Button - Flowbite Style */}
      <button
        type="button"
        onClick={() => onCategoryChange('All')}
        className={cn(
          "w-full flex items-center gap-3 px-4 h-12 text-sm font-medium rounded-lg transition-colors overflow-hidden",
          selectedCategory === 'All'
            ? "bg-gold-600 text-white"
            : "text-foreground hover:bg-accent"
        )}
      >
        <LayoutGrid className="w-5 h-5 flex-shrink-0" />
        <span
          className="flex-1 text-left truncate min-w-0"
        >
          All Categories
        </span>
      </button>

      {/* Categories List - Flowbite Style */}
      <ul className="space-y-0.5 overflow-hidden">
        {rootCategories.map((category) => {
          const children = getChildren(category.id)
          const hasChildren = children.length > 0
          const isExpanded = expandedParentIds.has(category.id)
          const isSelected = selectedCategory === category.id

          return (
            <li key={category.id} className="min-w-0 overflow-hidden">
              {/* Parent Category */}
              <div className="flex items-center min-w-0 overflow-hidden">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleParent(category.id)}
                    className="p-2 hover:bg-accent rounded-md transition-colors flex-shrink-0"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <div className="w-10 flex-shrink-0"></div>
                )}

                <button
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "flex-1 flex items-center gap-3 px-3 h-11 text-sm font-medium rounded-lg transition-colors overflow-hidden",
                    isSelected
                      ? "bg-gold-600 text-white"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <CategoryLogo
                    category={category}
                    size="sm"
                    className="w-5 h-5 flex-shrink-0"
                    fallback="text"
                  />
                  <span
                    className="flex-1 text-left truncate min-w-0"
                    title={category.displayName}
                  >
                    {category.displayName}
                  </span>
                </button>
              </div>

              {/* Child Categories */}
              {isExpanded && hasChildren && (
                <ul className="ml-10 mt-2 space-y-0.5 border-l-2 border-border pl-3 overflow-hidden">
                  {children.map((child) => {
                    const isChildSelected = selectedCategory === child.id
                    return (
                      <li key={child.id} className="min-w-0 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onCategoryChange(child.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 h-9 text-sm rounded-lg transition-colors overflow-hidden",
                            isChildSelected
                              ? "bg-gold-600 text-white font-medium"
                              : "text-muted-foreground hover:bg-accent"
                          )}
                        >
                          <CategoryLogo
                            category={child}
                            size="sm"
                            className="w-4 h-4 flex-shrink-0"
                            fallback="text"
                          />
                          <span
                            className="flex-1 text-left truncate min-w-0"
                            title={child.displayName}
                          >
                            {child.displayName}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
