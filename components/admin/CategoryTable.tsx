"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import Image from "next/image"
import {
  Edit,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CategoryDialog } from "./CategoryDialog"
import {
  useDeleteCategoryMutation,
  useToggleActiveMutation,
} from "@/lib/queries/category-queries"
import type { TournamentCategory } from "@/lib/poker/tournament-categories"

interface CategoryRowProps {
  category: TournamentCategory
  usageCount: number
  allCategories: TournamentCategory[]
}

function CategoryRow({ category, usageCount, allCategories }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: category.id,
    data: {
      type: "category",
      category,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useDeleteCategoryMutation()
  const toggleActiveMutation = useToggleActiveMutation(category.id)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(category.id)
      setDeleteDialogOpen(false)
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActiveMutation.mutateAsync()
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  // Find parent category
  const parentCategory = category.parentId
    ? allCategories.find((cat) => cat.id === category.parentId)
    : null

  // Determine game type badge color
  const getGameTypeBadge = (gameType: string) => {
    switch (gameType) {
      case "tournament":
        return <Badge variant="default">토너먼트</Badge>
      case "cash_game":
        return <Badge variant="secondary">캐쉬게임</Badge>
      case "both":
        return <Badge variant="outline">둘 다</Badge>
      default:
        return <Badge variant="outline">{gameType}</Badge>
    }
  }

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={isDragging ? "shadow-2xl ring-2 ring-primary" : ""}
      >
        {/* Drag Handle */}
        <TableCell className="w-12">
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        </TableCell>

        {/* Logo */}
        <TableCell className="w-20">
          {category.logoUrl ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-16 h-16 border rounded-lg bg-muted hover:border-primary transition-colors cursor-pointer">
                    <Image
                      src={category.logoUrl}
                      alt={category.displayName}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-2">
                  <div className="relative w-32 h-32 bg-muted rounded-lg">
                    <Image
                      src={category.logoUrl}
                      alt={category.displayName}
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-center">
                    {category.displayName}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="w-16 h-16 border rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
              No Logo
            </div>
          )}
        </TableCell>

        {/* ID */}
        <TableCell className="font-mono text-sm">{category.id}</TableCell>

        {/* Name */}
        <TableCell>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {category.parentId && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="font-medium">{category.displayName}</div>
            </div>
            <div className="text-xs text-muted-foreground">{category.name}</div>
            {category.shortName && (
              <Badge variant="outline" className="text-xs">
                {category.shortName}
              </Badge>
            )}
          </div>
        </TableCell>

        {/* Parent Category */}
        <TableCell>
          {parentCategory ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{parentCategory.displayName}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>

        {/* Game Type */}
        <TableCell>{getGameTypeBadge(category.gameType)}</TableCell>

        {/* Usage Count */}
        <TableCell className="text-center">
          <Badge variant="secondary">{usageCount || 0}</Badge>
        </TableCell>

        {/* Active Status */}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleActive}
            disabled={toggleActiveMutation.isPending}
          >
            {category.isActive ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-2">
            <CategoryDialog
              category={category}
              trigger={
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending || (usageCount || 0) > 0}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              카테고리 &quot;{category.displayName}&quot;를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface CategoryTableProps {
  categories: TournamentCategory[]
  usageCounts: Record<string, number>
}

export function CategoryTable({ categories, usageCounts }: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        카테고리가 없습니다. 새 카테고리를 추가하세요.
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-16">로고</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>상위 카테고리</TableHead>
            <TableHead>게임 타입</TableHead>
            <TableHead className="text-center">사용 개수</TableHead>
            <TableHead>활성</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              usageCount={usageCounts[category.id] || 0}
              allCategories={categories}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
