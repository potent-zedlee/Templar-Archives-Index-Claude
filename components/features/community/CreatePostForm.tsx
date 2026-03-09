'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createPost } from '@/app/actions/posts'
import { Loader2, MessageSquare, Info, Trophy, Users } from 'lucide-react'

const CATEGORIES = [
  { value: 'general', label: 'General', description: 'General poker discussions', icon: MessageSquare },
  { value: 'strategy', label: 'Strategy', description: 'Hand and game strategy', icon: Info },
  { value: 'news', label: 'News', description: 'Latest poker news', icon: Users },
  { value: 'tournament-recap', label: 'Tournament Recap', description: 'Tournament results and highlights', icon: Trophy },
]

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  content: z.string().min(20, 'Content must be at least 20 characters').max(10000),
  category: z.enum(['general', 'strategy', 'news', 'tournament-recap']),
})

type FormValues = z.infer<typeof formSchema>

interface CreatePostFormProps {
  handId?: string
}

export function CreatePostForm({ handId }: CreatePostFormProps) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'general',
    },
  })

  const isLoading = form.formState.isSubmitting

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createPost({
        ...values,
        handId,
      })

      if (result.success) {
        toast.success('Post created successfully')
        router.push(`/community/${result.postId}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create post')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter a descriptive title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the category that best fits your post.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => (
            <Card
              key={category.value}
              className={`cursor-pointer transition-colors ${
                form.watch('category') === category.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => form.setValue('category', category.value as any)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <category.icon className="h-6 w-6 text-muted-foreground" />
                <div className="font-medium text-sm">{category.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {category.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts or questions..."
                  className="min-h-[300px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Post
          </Button>
        </div>
      </form>
    </Form>
  )
}
