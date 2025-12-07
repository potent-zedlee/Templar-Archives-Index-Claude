/**
 * FileTreeExplorer Component
 *
 * VSCode/File Explorer 스타일의 트리 네비게이션 컴포넌트
 * - Tournament → Event → Stream 계층 구조 표시
 * - 확장/축소 기능
 * - 검색 기능
 * - 키보드 네비게이션 지원
 */

'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Search,
  X,
  FolderTree,
  ChevronsUpDown,
  ChevronsDownUp,
  Filter,
  CalendarDays,
  MapPin,
  Video,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { TreeNode } from './TreeNode'
import { TreeContextMenu } from './TreeContextMenu'
import {
  useArchiveTreeStore,
  type TreeNode as TreeNodeType,
  type TreeNodeType as NodeType,
} from '@/stores/archive-tree-store'
import type { Tournament, Event, Stream, BreadcrumbItem } from '@/lib/types/archive'

interface FilterConfig {
  // Date range
  selectedDateRange: { start: string | null; end: string | null }
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void
  // Location
  selectedLocation: string | null
  onLocationChange: (location: string | null) => void
  locations: { location: string; count: number }[]
  // Has hands filter
  hasHandsOnly: boolean
  onHasHandsOnlyChange: (value: boolean) => void
  // Reset
  onReset: () => void
}

interface FileTreeExplorerProps {
  tournaments: Tournament[]
  className?: string
  onNodeSelect?: (
    nodeId: string,
    nodeType: NodeType,
    data: Tournament | Event | Stream | null
  ) => void
  onBreadcrumbChange?: (path: BreadcrumbItem[]) => void
  onContextMenu?: (node: TreeNodeType, e: React.MouseEvent) => void
  filterConfig?: FilterConfig
}

/**
 * Tournament 데이터를 TreeNode로 변환
 */
function convertToTreeNodes(tournaments: Tournament[]): TreeNodeType[] {
  const nodes: TreeNodeType[] = []

  tournaments.forEach((tournament) => {
    // Tournament 노드
    const tournamentNode: TreeNodeType = {
      id: tournament.id,
      name: tournament.name,
      type: 'tournament',
      level: 0,
      meta: {
        count: tournament.events?.length || 0,
        logoUrl: tournament.categoryLogoUrl || tournament.categoryLogo,
      },
      children: [],
    }

    // Event 노드들
    tournament.events?.forEach((event) => {
      const eventNode: TreeNodeType = {
        id: event.id,
        name: event.name,
        type: 'event',
        level: 1,
        parentId: tournament.id,
        meta: {
          count: event.streams?.length || 0,
        },
        children: [],
      }

      // Stream 노드들
      event.streams?.forEach((stream) => {
        const streamNode: TreeNodeType = {
          id: stream.id,
          name: stream.name,
          type: 'stream',
          level: 2,
          parentId: event.id,
          meta: {
            handCount: stream.handCount || 0,
            videoUrl: stream.videoUrl,
          },
        }
        eventNode.children?.push(streamNode)
      })

      tournamentNode.children?.push(eventNode)
    })

    nodes.push(tournamentNode)
  })

  return nodes
}

/**
 * 트리 노드를 플랫 리스트로 변환 (가상 스크롤용 - depth 포함)
 */
interface FlatTreeNode extends TreeNodeType {
  depth: number
}

function flattenTreeNodes(
  nodes: TreeNodeType[],
  expandedNodes: Set<string>,
  depth = 0
): FlatTreeNode[] {
  const result: FlatTreeNode[] = []

  nodes.forEach((node) => {
    result.push({ ...node, depth })
    if (node.children && expandedNodes.has(node.id)) {
      result.push(...flattenTreeNodes(node.children, expandedNodes, depth + 1))
    }
  })

  return result
}

/**
 * 검색 필터링
 */
function filterTreeNodes(
  nodes: TreeNodeType[],
  query: string
): TreeNodeType[] {
  if (!query.trim()) return nodes

  const lowerQuery = query.toLowerCase()

  function filterNode(node: TreeNodeType): TreeNodeType | null {
    const nameMatch = node.name.toLowerCase().includes(lowerQuery)

    // 자식 노드 필터링
    const filteredChildren = node.children
      ?.map(filterNode)
      .filter((n): n is TreeNodeType => n !== null)

    // 이름이 매치되거나 자식이 매치되면 포함
    if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren,
      }
    }

    return null
  }

  return nodes
    .map(filterNode)
    .filter((n): n is TreeNodeType => n !== null)
}

export function FileTreeExplorer({
  tournaments,
  className,
  onNodeSelect,
  onBreadcrumbChange,
  onContextMenu,
  filterConfig,
}: FileTreeExplorerProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [contextMenuNode, setContextMenuNode] = useState<TreeNodeType | null>(null)

  // Store state
  const {
    expandedNodes,
    selectedNodeId,
    loadingNodes,
    treeSearchQuery,
    focusedNodeId,
    expandNode,
    toggleNode,
    selectNode,
    setTreeSearchQuery,
    clearSearch,
    setFlatNodeList,
    moveUp,
    moveDown,
    expandFocused,
    collapseFocused,
    selectFocused,
    expandAll,
    collapseAll,
    setBreadcrumb,
  } = useArchiveTreeStore()

  // Tournament 데이터를 트리 노드로 변환
  const treeNodes = useMemo(
    () => convertToTreeNodes(tournaments),
    [tournaments]
  )

  // 검색 필터링 적용
  const filteredNodes = useMemo(
    () => filterTreeNodes(treeNodes, treeSearchQuery),
    [treeNodes, treeSearchQuery]
  )

  // 플랫 노드 리스트 (가상 스크롤용)
  const flatNodes = useMemo(
    () => flattenTreeNodes(filteredNodes, expandedNodes),
    [filteredNodes, expandedNodes]
  )

  // 플랫 노드 리스트 업데이트 (키보드 네비게이션용)
  useEffect(() => {
    setFlatNodeList(flatNodes)
  }, [flatNodes, setFlatNodeList])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not fully compatible with React Compiler
  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // 각 노드 예상 높이
    overscan: 15,
  })

  // 노드 토글 핸들러
  const handleToggle = (nodeId: string) => {
    toggleNode(nodeId)
  }

  // 노드 클릭 핸들러
  const handleNodeClick = (node: TreeNodeType) => {
    selectNode(node.id, node.type)

    // Breadcrumb 업데이트
    const newBreadcrumb: BreadcrumbItem[] = [
      { id: 'home', name: 'Archive', type: 'home' },
    ]

    if (node.type === 'tournament') {
      newBreadcrumb.push({
        id: node.id,
        name: node.name,
        type: 'tournament',
      })
    } else if (node.type === 'event') {
      // 부모 tournament 찾기
      const parentTournament = treeNodes.find((t) =>
        t.children?.some((e) => e.id === node.id)
      )
      if (parentTournament) {
        newBreadcrumb.push({
          id: parentTournament.id,
          name: parentTournament.name,
          type: 'tournament',
        })
      }
      newBreadcrumb.push({
        id: node.id,
        name: node.name,
        type: 'event',
      })
    } else if (node.type === 'stream') {
      // 부모 tournament, event 찾기
      treeNodes.forEach((tournament) => {
        tournament.children?.forEach((event) => {
          if (event.children?.some((s) => s.id === node.id)) {
            newBreadcrumb.push({
              id: tournament.id,
              name: tournament.name,
              type: 'tournament',
            })
            newBreadcrumb.push({
              id: event.id,
              name: event.name,
              type: 'event',
            })
          }
        })
      })
    }

    setBreadcrumb(newBreadcrumb)
    onBreadcrumbChange?.(newBreadcrumb)

    // 부모 컴포넌트에 알림
    if (onNodeSelect) {
      // 실제 데이터 찾기
      let data: Tournament | Event | Stream | null = null

      if (node.type === 'tournament') {
        data = tournaments.find((t) => t.id === node.id) || null
      } else if (node.type === 'event') {
        tournaments.forEach((t) => {
          const event = t.events?.find((e) => e.id === node.id)
          if (event) data = event
        })
      } else if (node.type === 'stream') {
        tournaments.forEach((t) => {
          t.events?.forEach((e) => {
            const stream = e.streams?.find((s) => s.id === node.id)
            if (stream) data = stream
          })
        })
      }

      onNodeSelect(node.id, node.type, data)
    }

    // stream이면 자동 확장
    if (node.type !== 'stream' && node.type !== 'hand') {
      if (!expandedNodes.has(node.id)) {
        expandNode(node.id)
      }
    }
  }

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = useCallback((node: TreeNodeType, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuNode(node)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuOpen(true)
    onContextMenu?.(node, e)
  }, [onContextMenu])

  // 컨텍스트 메뉴 닫기
  const handleContextMenuClose = useCallback(() => {
    setContextMenuOpen(false)
    setContextMenuNode(null)
  }, [])

  // 컨텍스트 메뉴 액션: 링크 복사
  const handleCopyLink = useCallback((node: TreeNodeType) => {
    const url = `${window.location.origin}/archive/${node.type}/${node.id}`
    navigator.clipboard.writeText(url)
  }, [])

  // 컨텍스트 메뉴 액션: 노드 하위 모두 확장
  const handleExpandAllFromNode = useCallback((nodeId: string) => {
    const findAndExpand = (nodes: TreeNodeType[]) => {
      nodes.forEach(n => {
        if (n.id === nodeId || expandedNodes.has(n.parentId || '')) {
          expandNode(n.id)
        }
        if (n.children) {
          findAndExpand(n.children)
        }
      })
    }
    expandNode(nodeId)
    findAndExpand(treeNodes)
  }, [treeNodes, expandedNodes, expandNode])

  // 컨텍스트 메뉴 액션: 노드 하위 모두 축소
  const handleCollapseAllFromNode = useCallback((nodeId: string) => {
    const findAndCollapse = (nodes: TreeNodeType[]) => {
      nodes.forEach(n => {
        if (n.id === nodeId) {
          toggleNode(n.id)
        }
        if (n.children) {
          n.children.forEach(child => {
            if (expandedNodes.has(child.id)) {
              toggleNode(child.id)
            }
          })
          findAndCollapse(n.children)
        }
      })
    }
    findAndCollapse(treeNodes)
  }, [treeNodes, expandedNodes, toggleNode])

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        moveUp()
        break
      case 'ArrowDown':
        e.preventDefault()
        moveDown()
        break
      case 'ArrowRight':
        e.preventDefault()
        expandFocused()
        break
      case 'ArrowLeft':
        e.preventDefault()
        collapseFocused()
        break
      case 'Enter':
        e.preventDefault()
        selectFocused()
        break
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
        break
      case 'Escape':
        if (treeSearchQuery) {
          clearSearch()
        }
        break
    }
  }

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTreeSearchQuery(e.target.value)

    // 검색 시 모든 노드 확장
    if (e.target.value.trim()) {
      filteredNodes.forEach((node) => {
        expandNode(node.id)
        node.children?.forEach((child) => {
          expandNode(child.id)
        })
      })
    }
  }


  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-r border-border',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
      aria-label="Archive navigation"
    >
      {/* 헤더 - 검색창 + Expand/Collapse 토글 */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          {/* 검색창 */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search... (⌘F)"
              value={treeSearchQuery}
              onChange={handleSearchChange}
              className="pl-8 pr-8 h-8 text-sm"
              aria-label="아카이브 검색"
            />
            {treeSearchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6"
                onClick={clearSearch}
                aria-label="검색 지우기"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* Expand/Collapse 토글 버튼 */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={expandAll}
                  aria-label="모두 펼치기"
                >
                  <ChevronsUpDown className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Expand All</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={collapseAll}
                  aria-label="모두 접기"
                >
                  <ChevronsDownUp className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Collapse All</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 필터 섹션 (Collapsible) */}
      {filterConfig && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-3 py-2 text-xs border-b border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-medium">Filters</span>
                {(() => {
                  const count = [
                    filterConfig.selectedDateRange.start || filterConfig.selectedDateRange.end,
                    filterConfig.selectedLocation,
                    filterConfig.hasHandsOnly,
                  ].filter(Boolean).length
                  return count > 0 ? (
                    <Badge variant="default" className="h-4 px-1 text-[10px]">
                      {count}
                    </Badge>
                  ) : null
                })()}
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 space-y-3 border-b border-border bg-muted/30">
              {/* 날짜 범위 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Date Range
                </Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                    >
                      {filterConfig.selectedDateRange.start || filterConfig.selectedDateRange.end ? (
                        <span>
                          {filterConfig.selectedDateRange.start
                            ? format(new Date(filterConfig.selectedDateRange.start), 'MMM d, yyyy')
                            : 'Start'}{' '}
                          -{' '}
                          {filterConfig.selectedDateRange.end
                            ? format(new Date(filterConfig.selectedDateRange.end), 'MMM d, yyyy')
                            : 'End'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Any date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="right">
                    <div className="p-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Date</Label>
                        <Calendar
                          mode="single"
                          selected={
                            filterConfig.selectedDateRange.start
                              ? new Date(filterConfig.selectedDateRange.start)
                              : undefined
                          }
                          onSelect={(date) =>
                            filterConfig.onDateRangeChange({
                              ...filterConfig.selectedDateRange,
                              start: date ? date.toISOString().split('T')[0] : null,
                            })
                          }
                          className="rounded-md border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Date</Label>
                        <Calendar
                          mode="single"
                          selected={
                            filterConfig.selectedDateRange.end
                              ? new Date(filterConfig.selectedDateRange.end)
                              : undefined
                          }
                          onSelect={(date) =>
                            filterConfig.onDateRangeChange({
                              ...filterConfig.selectedDateRange,
                              end: date ? date.toISOString().split('T')[0] : null,
                            })
                          }
                          className="rounded-md border"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 위치 선택 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Location
                </Label>
                <Select
                  value={filterConfig.selectedLocation || '__all__'}
                  onValueChange={(value) => filterConfig.onLocationChange(value === '__all__' ? null : value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Any location</SelectItem>
                    {filterConfig.locations.map(({ location, count }) => (
                      <SelectItem key={location} value={location}>
                        {location} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Hands 필터 */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <Video className="w-3 h-3" />
                  Has analyzed hands
                </Label>
                <Switch
                  checked={filterConfig.hasHandsOnly}
                  onCheckedChange={filterConfig.onHasHandsOnlyChange}
                  className="scale-90"
                />
              </div>

              {/* Reset 버튼 */}
              {(filterConfig.selectedDateRange.start ||
                filterConfig.selectedDateRange.end ||
                filterConfig.selectedLocation ||
                filterConfig.hasHandsOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground"
                  onClick={filterConfig.onReset}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset filters
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* 트리 컨텐츠 - 가상 스크롤 */}
      <div
        ref={parentRef}
        className="flex-1 h-0 min-h-0 overflow-auto"
        style={{
          contain: 'strict',
        }}
        aria-busy={loadingNodes.size > 0}
        aria-live="polite"
      >
        {flatNodes.length > 0 ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const node = flatNodes[virtualRow.index]

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TreeNode
                    node={node}
                    isExpanded={expandedNodes.has(node.id)}
                    isSelected={selectedNodeId === node.id}
                    isFocused={focusedNodeId === node.id}
                    isLoading={loadingNodes.has(node.id)}
                    onToggle={handleToggle}
                    onClick={handleNodeClick}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              )
            })}
          </div>
        ) : treeSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground" role="status">
            <Search className="w-8 h-8 mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm">No results found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground" role="status">
            <FolderTree className="w-8 h-8 mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm">No tournaments</p>
            <p className="text-xs mt-1">Create a tournament to get started</p>
          </div>
        )}
      </div>

      {/* 푸터 - 통계 */}
      <div className="flex-shrink-0 p-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}
          </span>
          {treeSearchQuery && (
            <span>
              {filteredNodes.length} result{filteredNodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      <TreeContextMenu
        node={contextMenuNode}
        position={contextMenuPosition}
        isOpen={contextMenuOpen}
        onClose={handleContextMenuClose}
        onExpandAll={handleExpandAllFromNode}
        onCollapseAll={handleCollapseAllFromNode}
        onCopyLink={handleCopyLink}
      />
    </div>
  )
}
