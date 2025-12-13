'use client'

/**
 * CreatePostForm Component
 *
 * 포스트 작성/수정 폼 컴포넌트
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePostMutation, type CreatePostInput } from '@/lib/queries/posts-queries'
import type { PostCategory } from '@/lib/db/firestore-types'
import { toast } from 'sonner'

const CATEGORIES: { value: PostCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'General discussion' },
  { value: 'strategy', label: 'Strategy', description: 'Strategic concepts and tips' },
  { value: 'hand-analysis', label: 'Hand Analysis', description: 'In-depth hand or game analysis' },
  { value: 'news', label: 'News', description: 'Poker news and updates' },
  { value: 'tournament-recap', label: 'Tournament Recap', description: 'Tournament recaps and highlights' },
]

// Validation schema
const postSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long'),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  category: z.enum(['general', 'strategy', 'hand-analysis', 'news', 'tournament-recap']),
  tags: z.string().optional(),
  handId: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

interface CreatePostFormProps {
  initialData?: {
    title: string
    content: string
    category: PostCategory
    tags: string[]
    handId?: string
  }
}

export function CreatePostForm({ initialData }: CreatePostFormProps) {
  const router = useRouter()
  const createPostMutation = useCreatePostMutation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      category: initialData?.category || 'general',
      tags: initialData?.tags?.join(', ') || '',
      handId: initialData?.handId || '',
    },
  })

  const category = watch('category')

  const onSubmit = async (data: PostFormData, status: 'draft' | 'published') => {
    setIsSubmitting(true)

    try {
      // Parse tags
      const tags = data.tags
        ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : []

      const postData: CreatePostInput = {
        title: data.title,
        content: data.content,
        category: data.category,
        tags,
        handId: data.handId || undefined,
        status,
      }

      const result = await createPostMutation.mutateAsync(postData)

      toast.success(status === 'published' ? 'Post published!' : 'Draft saved!')
      router.push(`/community/${result?.id}`)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="Enter a descriptive title..."
          {...register('title')}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select
          value={category}
          onValueChange={(value) => setValue('category', value as PostCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex flex-col">
                  <span>{cat.label}</span>
                  <span className="text-xs text-muted-foreground">{cat.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content *</Label>
        <Textarea
          id="content"
          placeholder="Write your post content here..."
          rows={12}
          {...register('content')}
          className={`resize-none ${errors.content ? 'border-destructive' : ''}`}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Supports plain text. Markdown support coming soon.
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          placeholder="poker, strategy, bluff (comma separated)"
          {...register('tags')}
        />
        <p className="text-xs text-muted-foreground">
          Add tags to help others find your post
        </p>
      </div>

      {/* Hand ID (optional) */}
      <div className="space-y-2">
        <Label htmlFor="handId">Related Hand ID (optional)</Label>
        <Input
          id="handId"
          placeholder="e.g., abc123xyz"
          {...register('handId')}
        />
        <p className="text-xs text-muted-foreground">
          Link this post to a specific hand from the archive
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, 'published'))}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>
    </form>
  )
}
