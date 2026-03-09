/**
 * Tournament Categories React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllCategories,
  getCategoryById,
  uploadCategoryLogo,
  type TournamentCategory,
  type GameType,
} from '@/lib/poker/tournament-categories'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const categoryKeys = {
  all: ['tournament-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: any) => [...categoryKeys.lists(), filters] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
}

// ==================== Queries ====================

export function useCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: categoryKeys.list({ includeInactive }),
    queryFn: () => getAllCategories(includeInactive),
  })
}

export function useCategoryByIdQuery(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  })
}

export function useAllCategoryUsageQuery() {
  return useQuery({
    queryKey: [...categoryKeys.all, 'usage'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase.from('tournaments').select('category')
      const usage: Record<string, number> = {}
      data?.forEach(d => { usage[d.category] = (usage[d.category] || 0) + 1 })
      return usage
    }
  })
}

// ==================== Mutations ====================

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase.from('tournament_categories').insert({
        id: input.id,
        name: input.name,
        display_name: input.displayName,
        short_name: input.shortName,
        game_type: input.gameType || 'tournament'
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast.success('Category created')
    }
  })
}

export function useUpdateCategoryMutation(id: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (updates: any) => {
      const { data, error } = await supabase.from('tournament_categories').update({
        name: updates.name,
        display_name: updates.displayName,
        short_name: updates.shortName,
        is_active: updates.isActive
      }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast.success('Category updated')
    }
  })
}

export function useToggleActiveMutation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const { error } = await supabase.from('tournament_categories').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    }
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tournament_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      toast.success('Category deleted')
    }
  })
}

export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      // PostgreSQL doesn't have built-in reordering, usually involves an 'order' column
      // Simplified for now
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    }
  })
}
