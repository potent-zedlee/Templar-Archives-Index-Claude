/**
 * Tournament Categories Database Operations (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

export type GameType = 'tournament' | 'cash-game' | 'both'

export interface TournamentCategory {
  id: string
  name: string
  displayName: string
  shortName?: string | null
  aliases: string[]
  logoUrl?: string | null
  isActive: boolean
  gameType: GameType
  parentId?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 모든 카테고리 조회
 */
export async function getAllCategories(
  includeInactive = false,
  gameType?: GameType
): Promise<TournamentCategory[]> {
  const supabase = createClient()
  try {
    let query = supabase.from('tournament_categories').select('*').order('name', { ascending: true })
    if (!includeInactive) query = query.eq('is_active', true)
    if (gameType && gameType !== 'both') query = query.or(`game_type.eq.${gameType},game_type.eq.both`)
    const { data, error } = await query
    if (error) throw error
    return (data || []).map(d => ({
      id: d.id, name: d.name, displayName: d.display_name, shortName: d.short_name,
      aliases: d.aliases || [], logoUrl: d.logo_url, isActive: d.is_active,
      gameType: d.game_type as any, parentId: d.parent_id, createdAt: d.created_at, updatedAt: d.updated_at
    }))
  } catch (error) { return [] }
}

/**
 * ID로 카테고리 조회
 */
export async function getCategoryById(id: string): Promise<TournamentCategory | null> {
  const supabase = createClient()
  try {
    const { data } = await supabase.from('tournament_categories').select('*').eq('id', id).single()
    if (!data) return null
    return {
      id: data.id, name: data.name, displayName: data.display_name, shortName: data.short_name,
      aliases: data.aliases || [], logoUrl: data.logo_url, isActive: data.is_active,
      gameType: data.game_type as any, parentId: data.parent_id, createdAt: data.created_at, updatedAt: data.updated_at
    }
  } catch (error) { return null }
}

/**
 * Alias로 카테고리 조회
 */
export async function getCategoryByAlias(alias: string): Promise<TournamentCategory | null> {
  const supabase = createClient()
  try {
    const { data } = await supabase.from('tournament_categories').select('*').contains('aliases', [alias]).maybeSingle()
    if (!data) return null
    return {
      id: data.id, name: data.name, displayName: data.display_name, shortName: data.short_name,
      aliases: data.aliases || [], logoUrl: data.logo_url, isActive: data.is_active,
      gameType: data.game_type as any, parentId: data.parent_id, createdAt: data.created_at, updatedAt: data.updated_at
    }
  } catch (error) { return null }
}

/**
 * 로고 업로드
 */
export async function uploadCategoryLogo(categoryId: string, file: File): Promise<string> {
  const supabase = createClient()
  const fileName = `categories/${categoryId}-${Date.now()}`
  const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
  await supabase.from('tournament_categories').update({ logo_url: publicUrl }).eq('id', categoryId)
  return publicUrl
}
