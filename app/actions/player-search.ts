'use server'

import { adminFirestore } from '@/lib/db/firebase-admin'

export interface PlayerSearchResult {
    id: string
    name: string
    // Add other player fields if needed like avatar, country etc
}

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
    if (!query || query.length < 1) return []

    try {
        const db = adminFirestore
        // Assuming players are in a root 'players' collection
        // If they are not, we will need to adjust.
        // Based on user request "DB에 있는 플레이어들을 검색", assumes global players.

        const snapshot = await db.collection('players')
            .where('name', '>=', query)
            .where('name', '<=', query + '\uf8ff')
            .limit(10)
            .get()

        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name as string
        }))
    } catch (error) {
        console.error('Error searching players:', error)
        return []
    }
}
