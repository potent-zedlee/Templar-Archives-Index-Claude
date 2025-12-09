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

export async function searchStreams(query: string): Promise<StreamSearchResult[]> {
    if (!query || query.length < 2) return []

    try {
        const db = adminFirestore
        const snapshot = await db.collectionGroup('streams')
            .where('name', '>=', query)
            .where('name', '<=', query + '\uf8ff')
            .limit(10)
            .get()

        const results: StreamSearchResult[] = []

        // Note: To get tournament/event names effectively, we might need to fetch parents.
        // However, for performance, if we don't duplicate names in the stream doc,
        // we have to fetch them. If the path is predictable, we can at least return IDs.
        // Assuming hierarchical structure: tournaments/{tid}/events/{eid}/streams/{sid}

        // Optimisation: Fetch parents in parallel if needed, or rely on client to fetch details if critical.
        // For now, let's try to extract from path and maybe fetch only unique parents if really needed.
        // Or just return the path parts.

        // To properly show "EPT Paris > Main Event > Final Table", we ideally need the parent docs.
        // Let's do a quick optim: Group by event/tournament IDs.

        // BUT, Firestore collectionGroup queries don't easily give parent data without extra reads.
        // Let's act simple first: Extract IDs from path.

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
