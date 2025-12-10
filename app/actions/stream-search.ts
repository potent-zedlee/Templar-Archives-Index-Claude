'use server'

import { adminFirestore } from '@/lib/db/firebase-admin'

export interface StreamSearchResult {
    id: string
    name: string
    tournamentName: string
    eventName: string
    tournamentId: string
    eventId: string
    path: string
}

export async function searchStreams(query: string = ''): Promise<StreamSearchResult[]> {
    try {
        const db = adminFirestore
        let queryRef: FirebaseFirestore.Query = db.collectionGroup('streams')

        if (query && query.length >= 2) {
            queryRef = queryRef
                .where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff')
        }

        // Always limit to 10
        const snapshot = await queryRef.limit(10).get()

        const results: StreamSearchResult[] = []

        for (const doc of snapshot.docs) {
            const pathParts = doc.ref.path.split('/')
            // Expected: tournaments/{tid}/events/{eid}/streams/{sid}
            if (pathParts.length === 6 && pathParts[0] === 'tournaments') {
                const tournamentId = pathParts[1]
                const eventId = pathParts[3]

                // We could fetch these, but let's check if we can get by with just names if they exist on the doc.
                // If the stream doc doesn't have parent names, we should probably fetch them.
                // Let's do a quick fetch of the event and tournament for better UX. 
                // We'll limit total results to 10 so max 20 extra reads - acceptable.

                const eventDoc = await db.collection('tournaments').doc(tournamentId).collection('events').doc(eventId).get()
                const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get()

                const eventName = eventDoc.data()?.name || 'Unknown Event'
                const tournamentName = tournamentDoc.data()?.name || 'Unknown Tournament'

                results.push({
                    id: doc.id,
                    name: doc.data().name as string,
                    tournamentName,
                    eventName,
                    tournamentId,
                    eventId,
                    path: doc.ref.path
                })
            }
        }

        return results
    } catch (error) {
        console.error('Error searching streams:', error)
        return []
    }
}
