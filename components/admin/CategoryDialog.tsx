"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Upload, X, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useCreateCategoryMutation, useUpdateCategoryMutation, useCategoriesQuery } from "@/lib/queries/category-queries"
import type { TournamentCategory } from "@/lib/poker/tournament-categories"
import { uploadCategoryLogo } from "@/lib/poker/tournament-categories"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { LogoPicker } from "@/components/common/LogoPicker"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"

// Zod Schema
const categoryFormSchema = z.object({
  id: z.string()
    .min(2, "ID는 최소 2자 이상이어야 합니다")
    .max(50, "ID는 최대 50자까지 가능합니다")
    .regex(/^[a-z0-9-]+$/, "ID는 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  name: z.string()
    .min(2, "이름은 최소 2자 이상이어야 합니다")
    .max(100, "이름은 최대 100자까지 가능합니다"),
  displayName: z.string()
    .min(2, "표시 이름은 최소 2자 이상이어야 합니다")
    .max(100, "표시 이름은 최대 100자까지 가능합니다"),
  shortName: z.string().max(20, "약칭은 최대 20자까지 가능합니다").optional(),
  aliases: z.string().optional(), // Comma-separated
  isActive: z.boolean().default(true),
  gameType: z.enum(["tournament", "cash_game", "both"]).default("both"),
  parentId: z.string().optional(),
  themeGradient: z.string().optional(),
  themeText: z.string().optional(),
  themeShadow: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryDialogProps {
  category?: TournamentCategory | null
  trigger?: React.ReactNode
}

export function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(category?.logoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [logoUploadMode, setLogoUploadMode] = useState<"upload" | "select">("upload")

  const isEditing = !!category
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation(category?.id || "")

  // Fetch all categories for parent selection (root categories only)
  const { data: allCategories = [] } = useCategoriesQuery(true)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      id: category?.id || "",
      name: category?.name || "",
      displayName: category?.displayName || "",
      shortName: category?.shortName || "",
      aliases: category?.aliases?.join(", ") || "",
      isActive: category?.isActive ?? true,
      gameType: category?.gameType || "both",
      parentId: category?.parentId || "none",
      themeGradient: category?.themeGradient || "",
      themeText: category?.themeText || "",
      themeShadow: category?.themeShadow || "",
    },
  })

  const handleLogoChange = useCallback(
    (files: File[]) => {
      const file = files[0]
      if (!file) return

      // Validate file type
      if (!["image/svg+xml", "image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        form.setError("root", { message: "SVG, PNG, JPEG, WebP 파일만 업로드 가능합니다" })
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        form.setError("root", { message: "파일 크기는 5MB 이하여야 합니다" })
        return
      }

      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    },
    [form]
  )

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleLogoChange,
    accept: {
      "image/svg+xml": [".svg"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: logoUploadMode !== "upload",
  })

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      setIsUploading(true)

      // Parse aliases
      const aliasesArray = values.aliases
        ? values.aliases.split(",").map((a) => a.trim()).filter(Boolean)
        : []

      const input = {
        id: values.id,
        name: values.name,
        displayName: values.displayName,
        shortName: values.shortName || undefined,
        aliases: aliasesArray,
        isActive: values.isActive,
        gameType: values.gameType,
        parentId: values.parentId === "none" || !values.parentId ? null : values.parentId,
        themeGradient: values.themeGradient || undefined,
        themeText: values.themeText || undefined,
        themeShadow: values.themeShadow || undefined,
      }

      let categoryId: string

      if (isEditing) {
        // Update existing category
        const { id, ...updateInput } = input
        await updateMutation.mutateAsync(updateInput)
        categoryId = category!.id
      } else {
        // Create new category
        const newCategory = await createMutation.mutateAsync(input)
        categoryId = newCategory.id
      }

      // Handle logo (upload or selected)
      if (logoUploadMode === "upload" && logoFile && categoryId) {
        // Upload new file
        const publicUrl = await uploadCategoryLogo(categoryId, logoFile)
        // Add cache busting timestamp to force reload
        const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`

        // Save cache-busted URL to DB
        await updateMutation.mutateAsync({ logoUrl: urlWithTimestamp })
        setLogoPreview(urlWithTimestamp)
      } else if (logoUploadMode === "select" && logoPreview && categoryId) {
        // Save selected logo URL to DB
        await updateMutation.mutateAsync({ logoUrl: logoPreview })
      }

      // Close dialog and reset form
      setOpen(false)
      form.reset()
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    form.reset()
    setLogoFile(null)
    setLogoPreview(category?.logoUrl || null)
  }

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            카테고리 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "카테고리 수정" : "카테고리 추가"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "카테고리 정보를 수정합니다. 변경 후 저장 버튼을 클릭하세요."
              : "새 토너먼트 카테고리를 추가합니다. 모든 필수 항목을 입력하세요."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Logo Selection */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <FormLabel>로고</FormLabel>
                {isUploading && (
                  <Badge variant="secondary" className="gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    업로드 중...
                  </Badge>
                )}
              </div>

              {/* Logo Preview (Enhanced) */}
              {logoPreview && (
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 border-2 rounded-lg overflow-hidden bg-muted shadow-sm">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {logoFile ? logoFile.name : "기존 로고"}
                    </p>
                    {logoFile && (
                      <p className="text-xs text-muted-foreground">
                        크기: {(logoFile.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoFile(null)
                      setLogoPreview(null)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    제거
                  </Button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={undefined} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    로고를 업로드하는 중입니다...
                  </p>
                </div>
              )}

              {/* Upload Mode Selection */}
              <RadioGroup
                value={logoUploadMode}
                onValueChange={(v) => setLogoUploadMode(v as "upload" | "select")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upload" id="upload" />
                  <Label htmlFor="upload" className="cursor-pointer">
                    새 파일 업로드
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="select" id="select" />
                  <Label htmlFor="select" className="cursor-pointer">
                    기존 로고 선택
                  </Label>
                </div>
              </RadioGroup>

              {/* Upload Mode: Drag & Drop Zone */}
              {logoUploadMode === "upload" && (
                <div className="space-y-2">
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
                      "hover:border-primary hover:bg-muted/50",
                      isDragActive && "border-primary bg-primary/10",
                      "flex flex-col items-center justify-center gap-3"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="p-3 rounded-full bg-muted">
                      {isDragActive ? (
                        <Upload className="h-6 w-6 text-primary" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {isDragActive
                          ? "파일을 여기에 놓으세요"
                          : "파일을 드래그하거나 클릭하여 업로드"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        SVG, PNG, JPEG, WebP (최대 5MB)
                      </p>
                    </div>
                  </div>
                  <FormDescription>
                    <strong>권장:</strong> 200x200px 이상 정사각형 이미지
                    <br />
                    <strong>형식:</strong> SVG/PNG (투명 배경 권장), JPEG, WebP (최대 5MB)
                  </FormDescription>
                </div>
              )}

              {/* Select Mode: Logo Picker */}
              {logoUploadMode === "select" && (
                <LogoPicker
                  selectedLogo={logoPreview || ''}
                  onSelect={(url) => {
                    setLogoPreview(url)
                    setLogoFile(null) // Clear file if switching from upload
                  }}
                />
              )}
            </div>

            {/* ID (disabled when editing) */}
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="wsop"
                      {...field}
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormDescription>
                    URL-safe ID (소문자, 숫자, 하이픈만 사용)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name & Display Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>정식 명칭 *</FormLabel>
                    <FormControl>
                      <Input placeholder="World Series of Poker" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>표시 이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="WSOP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Short Name */}
            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>약칭</FormLabel>
                  <FormControl>
                    <Input placeholder="WSOP" {...field} />
                  </FormControl>
                  <FormDescription>
                    짧은 표시용 이름 (선택 사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aliases */}
            <FormField
              control={form.control}
              name="aliases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>별칭</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="WSOP, World Series, 월드시리즈"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    쉼표(,)로 구분된 별칭 목록
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Game Type */}
            <FormField
              control={form.control}
              name="gameType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>게임 타입 *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tournament" id="tournament" />
                        <Label htmlFor="tournament" className="cursor-pointer">
                          토너먼트
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash_game" id="cash_game" />
                        <Label htmlFor="cash_game" className="cursor-pointer">
                          캐쉬게임
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="cursor-pointer">
                          둘 다
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    이 카테고리가 표시될 페이지를 선택하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Category */}
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상위 카테고리</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="없음 (최상위 카테고리)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음 (최상위 카테고리)</SelectItem>
                      {allCategories
                        .filter((cat) => cat.id !== category?.id && !cat.parentId)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.displayName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    상위 카테고리를 선택하면 하위 카테고리로 설정됩니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">활성 상태</FormLabel>
                    <FormDescription>
                      활성화된 카테고리만 화면에 표시됩니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Theme Colors (Optional) */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <FormLabel>테마 색상 (선택 사항)</FormLabel>
                <Badge variant="secondary">고급</Badge>
              </div>
              <FormField
                control={form.control}
                name="themeGradient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gradient</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="from-blue-900 via-blue-800 to-blue-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="themeText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Color</FormLabel>
                    <FormControl>
                      <Input placeholder="text-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="themeShadow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shadow</FormLabel>
                    <FormControl>
                      <Input placeholder="shadow-blue-900/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Error Message */}
            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isUploading
                }
              >
                {(createMutation.isPending ||
                  updateMutation.isPending ||
                  isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                {isEditing ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
