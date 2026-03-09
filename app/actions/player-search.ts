/**
 * Player Search Server Action (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'

export interface PlayerSearchResult {
  id: string
  name: string
  photoUrl?: string
  country?: string
}

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  if (!query || query.length < 1) return []

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('players')
      .select('id, name, photo_url, country')
      .ilike('name', `%${query}%`)
      .limit(10)

    if (error) throw error

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      country: p.country
    }))
  } catch (error) {
    console.error('Error searching players:', error)
    return []
  }
}
