/**
 * Stream Search Server Action (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'

export interface StreamSearchResult {
  id: string
  name: string
  tournamentName: string
  eventName: string
  tournamentId: string
  eventId: string
}

export async function searchStreams(queryStr: string = ''): Promise<StreamSearchResult[]> {
  try {
    const admin = createAdminClient()
    let query = admin
      .from('streams')
      .select(`
        *,
        events (
          name,
          tournaments (id, name)
        )
      `)
      .limit(10)

    if (queryStr && queryStr.length >= 2) {
      query = query.ilike('name', `%${queryStr}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      tournamentName: (d.events as any)?.tournaments?.name || 'Unknown',
      eventName: (d.events as any)?.name || 'Unknown',
      tournamentId: (d.events as any)?.tournament_id,
      eventId: d.event_id
    }))
  } catch (error) {
    console.error('Error searching streams:', error)
    return []
  }
}
