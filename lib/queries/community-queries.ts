/**
 * Community Comments React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ==================== Types ====================

export type Comment = {
  id: string
  handId?: string
  postId?: string
  parentId?: string
  author: {
    id: string
    name: string
    avatarUrl?: string
  }
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
}

// ==================== Hand Comments ====================

export function useHandCommentsQuery(handId: string) {
  return useQuery({
    queryKey: ['comments', 'hand', handId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('hand_comments')
        .select(`
          *,
          users:user_id (nickname, avatar_url)
        `)
        .eq('hand_id', handId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []).map(d => ({
        id: d.id,
        handId: d.hand_id,
        parentId: d.parent_id,
        content: d.content,
        likesCount: d.likes_count || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        author: {
          id: d.user_id,
          name: d.users?.nickname || 'Unknown',
          avatarUrl: d.users?.avatar_url
        }
      }))
    },
    enabled: !!handId,
  })
}

// ==================== Post Comments ====================

export function usePostCommentsQuery(postId: string) {
  return useQuery({
    queryKey: ['comments', 'post', postId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          users:user_id (nickname, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []).map(d => ({
        id: d.id,
        postId: d.post_id,
        parentId: d.parent_id,
        content: d.content,
        likesCount: d.likes_count || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        author: {
          id: d.user_id,
          name: d.users?.nickname || 'Unknown',
          avatarUrl: d.users?.avatar_url
        }
      }))
    },
    enabled: !!postId,
  })
}

export async function fetchPostCommentReplies(commentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      users:user_id (nickname, avatar_url)
    `)
    .eq('parent_id', commentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(d => ({
    id: d.id,
    postId: d.post_id,
    parentId: d.parent_id,
    content: d.content,
    likesCount: d.likes_count || 0,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    author: {
      id: d.user_id,
      name: d.users?.nickname || 'Unknown',
      avatarUrl: d.users?.avatar_url
    }
  }))
}

// ==================== Mutations ====================

export function useCreateHandCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { handId: string; content: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase.from('hand_comments').insert({
        hand_id: input.handId,
        user_id: user.id,
        content: input.content
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'hand', variables.handId] })
    }
  })
}

export function useToggleHandCommentLikeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, handId }: { commentId: string; handId: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      // Since we don't have a RPC for hand comments yet, we'll do a simple update for now
      // This is just a placeholder until we add the actual table for likes
      const { data: comment } = await supabase.from('hand_comments').select('likes_count').eq('id', commentId).single()
      const newCount = (comment?.likes_count || 0) + 1
      
      const { error } = await supabase.from('hand_comments').update({ 
        likes_count: newCount
      }).eq('id', commentId)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'hand', variables.handId] })
    }
  })
}

export function useCreatePostCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: any) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { data, error } = await supabase.from('post_comments').insert({
        post_id: input.postId,
        user_id: user.id,
        content: input.content,
        parent_id: input.parentId
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'post', variables.postId] })
    }
  })
}

export function useDeletePostCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string, postId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'post', variables.postId] })
      toast.success('Comment deleted')
    }
  })
}

export function useTogglePostCommentLikeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      const { error } = await supabase.rpc('toggle_post_comment_like', { 
        comment_id: commentId, 
        user_id: user.id 
      })
      if (error) throw error
    },
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'post', variables.postId] })
    }
  })
}
