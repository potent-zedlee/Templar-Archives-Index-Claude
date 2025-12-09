'use server'

import { adminFirestore } from '@/lib/db/firebase-admin'
import { Stream, Hand } from '@/lib/types/archive'

export interface PublicReplayerData {
    stream: Stream
    hands: Hand[]
}

/**
 * Fetch stream and hands for the public replayer page.
 * @param streamId The ID of the stream (document ID)
 */
export async function getStreamAndHands(streamId: string): Promise<{ success: boolean; data?: PublicReplayerData; error?: string }> {
    try {
        const db = adminFirestore;

        // 1. Find the stream using collectionGroup. 
        // Try matching by 'id' field first (best practice if ID is stored).
        let streamsQuery = await db.collectionGroup('streams').where('id', '==', streamId).limit(1).get();

        if (streamsQuery.empty) {
            // Fallback: This is expensive but if 'id' field isn't stored, we scan. 
            // NOTE: In production with many streams, this is bad. 
            // Better: Ensure 'id' field is on every stream doc.
            // For now, let's try to fetch all streams and find by ID if the above failed.
            // Or try `__name__` check if streamId happens to be a path (unlikely).

            // Let's assume for now that failure here means stream not found or ID field missing.
            // We can try to list all streams only as a desperate fallback, limiting to recent? No.

            // Let's assume the system enforces 'id' field existence or we use this opportunity to fix it?
            // Checking `Stream` type, `id` is mandatory.

            return { success: false, error: 'Stream not found' }
        }

        const streamDoc = streamsQuery.docs[0];
        const streamData = streamDoc.data();

        // Construct Stream object
        const stream: Stream = {
            id: streamDoc.id,
            eventId: streamData.eventId,
            name: streamData.name,
            videoUrl: streamData.videoUrl,
            // Map other fields carefully
            videoSource: streamData.videoSource,
            status: streamData.status,
            publishedAt: streamData.publishedAt?.toDate?.()?.toISOString() || streamData.publishedAt,
            createdAt: streamData.createdAt?.toDate?.()?.toISOString() || streamData.createdAt,
            // ... explicit mapping or spread
            ...streamData,
            // Fix timestamps that might be Firestore Timestamps
            organizedAt: streamData.organizedAt?.toDate?.()?.toISOString() || streamData.organizedAt,
            pipelineUpdatedAt: streamData.pipelineUpdatedAt?.toDate?.()?.toISOString() || streamData.pipelineUpdatedAt,
            lastAnalysisAt: streamData.lastAnalysisAt?.toDate?.()?.toISOString() || streamData.lastAnalysisAt,
            gcsUploadedAt: streamData.gcsUploadedAt?.toDate?.()?.toISOString() || streamData.gcsUploadedAt,
        } as Stream;

        // 2. Fetch Hands
        // Hands are stored in root 'hands' collection according to `createHand` in `archive-manage.ts`
        const handsQuery = await db.collection('hands')
            .where('streamId', '==', streamId)
            // .orderBy('number', 'asc') // Create index if needed. If error, remove orderBy and sort in memory.
            .get();

        const hands: Hand[] = handsQuery.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                streamId: data.streamId,
                number: data.number,
                description: data.description || '',
                timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                videoTimestampStart: data.videoTimestampStart,
                videoTimestampEnd: data.videoTimestampEnd,
                // Map other necessary fields for replayer
                boardFlop: data.boardFlop || [],
                boardTurn: data.boardTurn || '',
                boardRiver: data.boardRiver || '',
                handPlayers: data.handPlayers || [], // This might need detailed mapping if it's an array of objects
                // Ensure other fields
                ...data
            } as Hand;
        });

        // Sort in memory to avoid index requirement for now
        hands.sort((a, b) => (a.number || 0) - (b.number || 0));

        return {
            success: true,
            data: {
                stream,
                hands
            }
        }

    } catch (error) {
        console.error('getStreamAndHands error:', error)
        return { success: false, error: 'Failed to fetch stream data' }
    }
}
