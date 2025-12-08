"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from "@dnd-kit/core"
import { arrayMove } from "@/lib/utils/array"
import { useDebounce } from "@/hooks/useDebounce"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import { Search, Save } from "lucide-react"
import { CategoryDialog } from "@/components/admin/CategoryDialog"
import { CategoryTable } from "@/components/admin/CategoryTable"
import {
  useCategoriesQuery,
  useReorderCategoriesMutation,
  useAllCategoryUsageQuery,
} from "@/lib/queries/category-queries"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { toast } from "sonner"
import type { TournamentCategory } from "@/lib/poker/tournament-categories"

export default function CategoriesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [gameTypeFilter, setGameTypeFilter] = useState<string>("all")
  const [includeInactive, setIncludeInactive] = useState(true)

  // Drag & Drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<TournamentCategory[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // React Query hooks
  const { data: categories, isLoading } = useCategoriesQuery(includeInactive)
  const { data: usageCounts } = useAllCategoryUsageQuery()
  const reorderMutation = useReorderCategoriesMutation()

  // Check admin access
  const checkAccess = useCallback(async () => {
    // Wait for auth loading to complete
    if (loading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("관리자 권한이 필요합니다")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("권한 확인 중 오류가 발생했습니다")
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  // Update local categories when data changes
  useEffect(() => {
    if (categories) {
      // Intentional: Sync React Query data with local state for drag & drop functionality
      setLocalCategories(categories)
      setHasChanges(false)
    }
  }, [categories])

  // Filter categories
  const filteredCategories = useMemo(() => {
    return localCategories.filter((category) => {
      // Search filter
      const searchMatch =
        !debouncedSearchQuery ||
        category.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.displayName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.aliases.some((alias) =>
          alias.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )

      // Active filter
      const activeMatch =
        activeFilter === "all" ||
        (activeFilter === "active" && category.isActive) ||
        (activeFilter === "inactive" && !category.isActive)

      // Game type filter
      const gameTypeMatch =
        gameTypeFilter === "all" || category.gameType === gameTypeFilter

      return searchMatch && activeMatch && gameTypeMatch
    })
  }, [localCategories, debouncedSearchQuery, activeFilter, gameTypeFilter])

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const reordered = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return reordered
      })
    }

    setActiveId(null)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Save order
  async function handleSaveOrder() {
    const categoryIds = localCategories.map((cat) => cat.id)

    try {
      await reorderMutation.mutateAsync(categoryIds)
      setHasChanges(false)
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  // Reset order
  function handleResetOrder() {
    if (categories) {
      setLocalCategories(categories)
      setHasChanges(false)
    }
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">카테고리 관리</h1>
        <p className="text-muted-foreground">
          토너먼트 카테고리를 추가, 수정, 삭제하고 순서를 변경할 수 있습니다.
        </p>
      </header>

      {/* Toolbar */}
      <div className="border rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="카테고리 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="카테고리 검색"
            />
          </div>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => {
              const filter = e.target.value as "all" | "active" | "inactive"
              setActiveFilter(filter)
              setIncludeInactive(filter === "all" || filter === "inactive")
            }}
            className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            aria-label="활성 상태 필터"
          >
            <option value="all">모두</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>

          {/* Game Type Filter */}
          <select
            value={gameTypeFilter}
            onChange={(e) => setGameTypeFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            aria-label="게임 타입 필터"
          >
            <option value="all">모든 타입</option>
            <option value="tournament">토너먼트</option>
            <option value="cash_game">캐쉬게임</option>
            <option value="both">둘 다</option>
          </select>

          {/* Add Category */}
          <CategoryDialog />
        </div>

        {/* Save Order Button */}
        {hasChanges && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t" role="alert" aria-live="polite">
            <button
              onClick={handleSaveOrder}
              disabled={reorderMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              aria-label="카테고리 순서 저장"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              순서 저장
            </button>
            <button
              onClick={handleResetOrder}
              disabled={reorderMutation.isPending}
              className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="순서 변경 취소"
            >
              취소
            </button>
            <span className="text-sm text-muted-foreground ml-2">
              순서가 변경되었습니다. 저장하세요.
            </span>
          </div>
        )}
      </div>

      {/* Categories Table */}
      {isLoading ? (
        <div className="space-y-4" role="status" aria-label="카테고리 목록 로딩 중">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <CategoryTable categories={filteredCategories} usageCounts={usageCounts || {}} />
          <DragOverlay>
            {activeId ? (
              <div className="bg-background border rounded-lg p-4 shadow-2xl">
                <span className="font-medium">
                  {localCategories.find((cat) => cat.id === activeId)?.displayName}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Results Count */}
      {!isLoading && (
        <div className="mt-4 text-sm text-muted-foreground text-center" role="status" aria-live="polite">
          총 {filteredCategories.length}개의 카테고리
          {searchQuery && ` (검색 결과)`}
        </div>
      )}
    </div>
  )
}
