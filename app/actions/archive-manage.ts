/**
 * Archive Management Server Actions
 *
 * Admin Archive Manager에서 사용하는 Server Actions
 * - Stream/Event 이동
 * - Unsorted Video 할당
 * - 이름 변경
 * - 삭제
 * - Event/Stream 생성
 */

'use server'

import { adminFirestore, adminAuth } from '@/lib/db/firebase-admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

// ==================== Auth Helper ====================

/**
 * 관리자 권한 검증
 */
async function verifyAdmin(): Promise<{
  isAdmin: boolean
  error?: string
  userId?: string
}> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return { isAdmin: false, error: 'Unauthorized' }
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true)
    const userId = decodedToken.uid

    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return { isAdmin: false, error: 'User not found' }
    }

    const userData = userDoc.data()
    if (!['admin', 'high_templar'].includes(userData?.role)) {
      return { isAdmin: false, error: 'Admin access required' }
    }

    return { isAdmin: true, userId }
  } catch (error) {
    console.error('[verifyAdmin] Error:', error)
    return { isAdmin: false, error: 'Authentication failed' }
  }
}

// ==================== Move Operations ====================

/**
 * Stream을 다른 Event로 이동
 */
export async function moveStreamToEvent(
  streamId: string,
  targetEventId: string,
  targetTournamentId: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore

    // 1. 현재 Stream 문서 찾기 (collectionGroup으로 검색)
    const streamsQuery = await db
      .collectionGroup('streams')
      .where('__name__', '==', streamId)
      .limit(1)
      .get()

    if (streamsQuery.empty) {
      // streams 컬렉션에서도 찾기 (플랫 구조)
      const flatStreamDoc = await db.collection('streams').doc(streamId).get()
      if (!flatStreamDoc.exists) {
        return { success: false, error: 'Stream not found' }
      }
    }

    // Stream 문서의 전체 경로 찾기
    let sourceStreamRef: FirebaseFirestore.DocumentReference | null = null
    let sourceTournamentId: string | null = null
    let sourceEventId: string | null = null
    let streamData: FirebaseFirestore.DocumentData | undefined

    if (!streamsQuery.empty) {
      sourceStreamRef = streamsQuery.docs[0].ref
      streamData = streamsQuery.docs[0].data()
      // 경로에서 tournamentId와 eventId 추출
      // tournaments/{tournamentId}/events/{eventId}/streams/{streamId}
      const pathParts = sourceStreamRef.path.split('/')
      if (pathParts.length >= 6) {
        sourceTournamentId = pathParts[1]
        sourceEventId = pathParts[3]
      }
    }

    if (!sourceStreamRef || !sourceTournamentId || !sourceEventId) {
      return { success: false, error: 'Could not find stream location' }
    }

    // 같은 Event면 무시
    if (sourceEventId === targetEventId) {
      return { success: false, error: 'Stream is already in this event' }
    }

    const batch = db.batch()

    // 2. 새 위치에 Stream 생성
    const targetStreamRef = db
      .collection('tournaments')
      .doc(targetTournamentId)
      .collection('events')
      .doc(targetEventId)
      .collection('streams')
      .doc(streamId) // 같은 ID 유지

    batch.set(targetStreamRef, {
      ...streamData,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 3. 기존 Stream 삭제
    batch.delete(sourceStreamRef)

    // 4. 기존 Event의 streamsCount 감소
    const sourceEventRef = db
      .collection('tournaments')
      .doc(sourceTournamentId)
      .collection('events')
      .doc(sourceEventId)
    batch.update(sourceEventRef, {
      'stats.streamsCount': FieldValue.increment(-1),
    })

    // 5. 대상 Event의 streamsCount 증가
    const targetEventRef = db
      .collection('tournaments')
      .doc(targetTournamentId)
      .collection('events')
      .doc(targetEventId)
    batch.update(targetEventRef, {
      'stats.streamsCount': FieldValue.increment(1),
    })

    // 6. Tournament 간 이동인 경우 통계 업데이트
    if (sourceTournamentId !== targetTournamentId) {
      const sourceTournamentRef = db.collection('tournaments').doc(sourceTournamentId)
      const targetTournamentRef = db.collection('tournaments').doc(targetTournamentId)

      batch.update(sourceTournamentRef, {
        'stats.streamsCount': FieldValue.increment(-1),
      })
      batch.update(targetTournamentRef, {
        'stats.streamsCount': FieldValue.increment(1),
      })
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true }
  } catch (error) {
    console.error('moveStreamToEvent error:', error)
    return { success: false, error: 'Failed to move stream' }
  }
}

/**
 * Event를 다른 Tournament로 이동
 */
export async function moveEventToTournament(
  eventId: string,
  targetTournamentId: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore

    // 1. 현재 Event 찾기
    const eventsQuery = await db
      .collectionGroup('events')
      .where('__name__', '==', eventId)
      .limit(1)
      .get()

    if (eventsQuery.empty) {
      return { success: false, error: 'Event not found' }
    }

    const sourceEventRef = eventsQuery.docs[0].ref
    const eventData = eventsQuery.docs[0].data()

    // 경로에서 sourceTournamentId 추출
    const pathParts = sourceEventRef.path.split('/')
    const sourceTournamentId = pathParts[1]

    if (sourceTournamentId === targetTournamentId) {
      return { success: false, error: 'Event is already in this tournament' }
    }

    const batch = db.batch()

    // 2. 하위 Streams 조회
    const streamsSnapshot = await sourceEventRef.collection('streams').get()

    // 3. 새 위치에 Event 생성
    const targetEventRef = db
      .collection('tournaments')
      .doc(targetTournamentId)
      .collection('events')
      .doc(eventId) // 같은 ID 유지

    batch.set(targetEventRef, {
      ...eventData,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 4. 하위 Streams 이동
    for (const streamDoc of streamsSnapshot.docs) {
      const streamData = streamDoc.data()
      const targetStreamRef = targetEventRef
        .collection('streams')
        .doc(streamDoc.id)
      batch.set(targetStreamRef, streamData)
      batch.delete(streamDoc.ref)
    }

    // 5. 기존 Event 삭제
    batch.delete(sourceEventRef)

    // 6. Tournament 통계 업데이트
    const sourceTournamentRef = db.collection('tournaments').doc(sourceTournamentId)
    const targetTournamentRef = db.collection('tournaments').doc(targetTournamentId)

    batch.update(sourceTournamentRef, {
      'stats.eventsCount': FieldValue.increment(-1),
      'stats.streamsCount': FieldValue.increment(-streamsSnapshot.size),
    })
    batch.update(targetTournamentRef, {
      'stats.eventsCount': FieldValue.increment(1),
      'stats.streamsCount': FieldValue.increment(streamsSnapshot.size),
    })

    await batch.commit()

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true }
  } catch (error) {
    console.error('moveEventToTournament error:', error)
    return { success: false, error: 'Failed to move event' }
  }
}

/**
 * Unsorted Video를 Event에 할당 (새 Stream 생성)
 */
export async function assignUnsortedToEvent(
  unsortedId: string,
  targetEventId: string,
  targetTournamentId: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore

    // 1. Unsorted Video 조회
    const unsortedDoc = await db.collection('streams').doc(unsortedId).get()
    if (!unsortedDoc.exists) {
      return { success: false, error: 'Unsorted video not found' }
    }

    const unsortedData = unsortedDoc.data()!
    const batch = db.batch()

    // 2. Event 하위에 새 Stream 생성
    const newStreamRef = db
      .collection('tournaments')
      .doc(targetTournamentId)
      .collection('events')
      .doc(targetEventId)
      .collection('streams')
      .doc() // 새 ID

    batch.set(newStreamRef, {
      name: unsortedData.name,
      videoUrl: unsortedData.videoUrl,
      videoFile: unsortedData.videoFile,
      videoSource: unsortedData.videoSource || 'upload',
      gcsUri: unsortedData.gcsUri,
      gcsPath: unsortedData.gcsPath,
      gcsFileSize: unsortedData.gcsFileSize,
      gcsUploadedAt: unsortedData.gcsUploadedAt,
      status: 'draft',
      pipelineStatus: 'pending',
      stats: { handsCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 3. Unsorted Video 삭제
    batch.delete(unsortedDoc.ref)

    // 4. Event 통계 업데이트
    const eventRef = db
      .collection('tournaments')
      .doc(targetTournamentId)
      .collection('events')
      .doc(targetEventId)
    batch.update(eventRef, {
      'stats.streamsCount': FieldValue.increment(1),
    })

    // 5. Tournament 통계 업데이트
    const tournamentRef = db.collection('tournaments').doc(targetTournamentId)
    batch.update(tournamentRef, {
      'stats.streamsCount': FieldValue.increment(1),
    })

    await batch.commit()

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true, streamId: newStreamRef.id }
  } catch (error) {
    console.error('assignUnsortedToEvent error:', error)
    return { success: false, error: 'Failed to assign video' }
  }
}

// ==================== CRUD Operations ====================

/**
 * 노드 이름 변경
 */
export async function renameNode(
  nodeType: 'tournament' | 'event' | 'stream' | 'unsorted',
  nodeId: string,
  newName: string,
  tournamentId?: string,
  eventId?: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore
    let docRef: FirebaseFirestore.DocumentReference

    if (nodeType === 'tournament') {
      docRef = db.collection('tournaments').doc(nodeId)
    } else if (nodeType === 'event' && tournamentId) {
      docRef = db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('events')
        .doc(nodeId)
    } else if (nodeType === 'stream' && tournamentId && eventId) {
      docRef = db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('events')
        .doc(eventId)
        .collection('streams')
        .doc(nodeId)
    } else if (nodeType === 'unsorted') {
      docRef = db.collection('streams').doc(nodeId)
    } else {
      return { success: false, error: 'Invalid node type or missing IDs' }
    }

    await docRef.update({
      name: newName,
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true }
  } catch (error) {
    console.error('renameNode error:', error)
    return { success: false, error: 'Failed to rename' }
  }
}

/**
 * 노드 삭제
 */
export async function deleteNode(
  nodeType: 'tournament' | 'event' | 'stream' | 'unsorted',
  nodeId: string,
  tournamentId?: string,
  eventId?: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore
    const batch = db.batch()

    if (nodeType === 'tournament') {
      // Tournament 삭제 시 하위 Event/Stream도 삭제
      const tournamentRef = db.collection('tournaments').doc(nodeId)
      const eventsSnapshot = await tournamentRef.collection('events').get()

      for (const eventDoc of eventsSnapshot.docs) {
        const streamsSnapshot = await eventDoc.ref.collection('streams').get()
        streamsSnapshot.docs.forEach((streamDoc) => batch.delete(streamDoc.ref))
        batch.delete(eventDoc.ref)
      }
      batch.delete(tournamentRef)
    } else if (nodeType === 'event' && tournamentId) {
      // Event 삭제 시 하위 Stream도 삭제
      const eventRef = db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('events')
        .doc(nodeId)

      const streamsSnapshot = await eventRef.collection('streams').get()
      streamsSnapshot.docs.forEach((streamDoc) => batch.delete(streamDoc.ref))
      batch.delete(eventRef)

      // Tournament 통계 업데이트
      batch.update(db.collection('tournaments').doc(tournamentId), {
        'stats.eventsCount': FieldValue.increment(-1),
        'stats.streamsCount': FieldValue.increment(-streamsSnapshot.size),
      })
    } else if (nodeType === 'stream' && tournamentId && eventId) {
      // Stream 삭제
      const streamRef = db
        .collection('tournaments')
        .doc(tournamentId)
        .collection('events')
        .doc(eventId)
        .collection('streams')
        .doc(nodeId)
      batch.delete(streamRef)

      // Event/Tournament 통계 업데이트
      batch.update(
        db.collection('tournaments').doc(tournamentId).collection('events').doc(eventId),
        { 'stats.streamsCount': FieldValue.increment(-1) }
      )
      batch.update(db.collection('tournaments').doc(tournamentId), {
        'stats.streamsCount': FieldValue.increment(-1),
      })
    } else if (nodeType === 'unsorted') {
      // Unsorted Video 삭제
      batch.delete(db.collection('streams').doc(nodeId))
    } else {
      return { success: false, error: 'Invalid node type or missing IDs' }
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true }
  } catch (error) {
    console.error('deleteNode error:', error)
    return { success: false, error: 'Failed to delete' }
  }
}

/**
 * Tournament에 새 Event 생성
 */
export async function createEvent(tournamentId: string, name: string) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore
    const eventRef = db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('events')
      .doc()

    await eventRef.set({
      name,
      date: Timestamp.now(),
      status: 'draft',
      stats: { streamsCount: 0, handsCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Tournament 통계 업데이트
    await db.collection('tournaments').doc(tournamentId).update({
      'stats.eventsCount': FieldValue.increment(1),
    })

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true, eventId: eventRef.id }
  } catch (error) {
    console.error('createEvent error:', error)
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * Event에 새 Stream 생성
 */
export async function createStream(
  tournamentId: string,
  eventId: string,
  name: string
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore
    const streamRef = db
      .collection('tournaments')
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc()

    await streamRef.set({
      name,
      videoSource: 'upload',
      status: 'draft',
      pipelineStatus: 'pending',
      stats: { handsCount: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Event/Tournament 통계 업데이트
    const batch = db.batch()
    batch.update(
      db.collection('tournaments').doc(tournamentId).collection('events').doc(eventId),
      { 'stats.streamsCount': FieldValue.increment(1) }
    )
    batch.update(db.collection('tournaments').doc(tournamentId), {
      'stats.streamsCount': FieldValue.increment(1),
    })
    await batch.commit()

    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/manage')
    revalidatePath('/archive')

    return { success: true, streamId: streamRef.id }
  } catch (error) {
    console.error('createStream error:', error)
    return { success: false, error: 'Failed to create stream' }
  }
}

/**
 * Create Hand manually
 */
export async function createHand(
  streamId: string,
  handData: any // Simplified type for now
) {
  const authResult = await verifyAdmin()
  if (!authResult.isAdmin) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const db = adminFirestore

    // 1. Get Stream Info (to link tournament/event IDs)
    // Try collectionGroup to find the stream
    const streamsQuery = await db.collectionGroup('streams').where('__name__', '==', streamId).limit(1).get()

    let tournamentId = ''
    let eventId = ''

    if (!streamsQuery.empty) {
      const streamRef = streamsQuery.docs[0].ref
      const pathParts = streamRef.path.split('/')
      if (pathParts.length >= 6) {
        tournamentId = pathParts[1]
        eventId = pathParts[3]
      }
    }

    if (!tournamentId || !eventId) {
      return { success: false, error: 'Stream context not found' }
    }

    // 2. Prepare Hand Doc
    // Construct simplified hand history format JSON
    const handHistoryFormat = {
      variant: "NT", // No Limit Holdem Tournament
      blinds: { sb: handData.smallBlind, bb: handData.bigBlind, ante: handData.ante },
      players: handData.players.map((p: any) => ({
        seat: p.seat,
        name: p.name,
        stack: p.startStack ?? p.stack, // Support both field names
        cards: p.holeCards || []
      })),
      sections: {
        preflop: handData.actions.filter((a: any) => a.street === 'preflop').map((a: any) => formatActionString(a)),
        flop: handData.actions.filter((a: any) => a.street === 'flop').map((a: any) => formatActionString(a)),
        turn: handData.actions.filter((a: any) => a.street === 'turn').map((a: any) => formatActionString(a)),
        river: handData.actions.filter((a: any) => a.street === 'river').map((a: any) => formatActionString(a))
      },
      board: {
        flop: handData.boardFlop || [],
        turn: handData.boardTurn ? [handData.boardTurn] : [],
        river: handData.boardRiver ? [handData.boardRiver] : []
      }
    }

    const docData = {
      streamId,
      eventId,
      tournamentId,
      number: handData.number,
      timestamp: Timestamp.now(), // Recorded at
      videoTimestampStart: handData.videoTimestampStart,
      videoTimestampEnd: handData.videoTimestampEnd,

      // Metadata
      description: `Hand #${handData.number}`,
      aiSummary: "Manually recorded hand",

      // Blinds
      smallBlind: handData.smallBlind,
      bigBlind: handData.bigBlind,
      ante: handData.ante,

      // Board
      boardFlop: handData.boardFlop || [],
      boardTurn: handData.boardTurn ? [handData.boardTurn] : [],
      boardRiver: handData.boardRiver ? [handData.boardRiver] : [],

      // Players (Simplified for search/display)
      players: handData.players.map((p: any) => ({
        playerId: p.playerId,
        name: p.name,
        seat: p.seat,
        position: p.position,
        holeCards: p.holeCards || [],
        startStack: p.startStack ?? p.stack, // Support both field names
        isWinner: false // Manual until we add winner logic
      })),

      // Formats
      handHistoryFormat: handHistoryFormat,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }

    // 3. Auto-create players that don't have playerId
    const playersWithIds = await Promise.all(
      handData.players.map(async (p: any) => {
        if (p.playerId) {
          return p // Already has ID
        }
        if (!p.name) {
          return p // No name, skip
        }

        // Check if player with this name already exists
        const existingPlayer = await db.collection('players')
          .where('normalizedName', '==', p.name.toLowerCase().trim())
          .limit(1)
          .get()

        if (!existingPlayer.empty) {
          return { ...p, playerId: existingPlayer.docs[0].id }
        }

        // Create new player
        const newPlayerRef = await db.collection('players').add({
          name: p.name,
          normalizedName: p.name.toLowerCase().trim(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { ...p, playerId: newPlayerRef.id }
      })
    )

    // Update docData with resolved playerIds
    docData.players = playersWithIds.map((p: any) => ({
      playerId: p.playerId,
      name: p.name,
      seat: p.seat,
      position: p.position,
      holeCards: p.holeCards || [],
      startStack: p.startStack ?? p.stack,
      isWinner: false
    }))

    // 4. Save to 'hands' collection
    const handRef = await db.collection('hands').add(docData)

    // 5. Update Stream Stats
    // Update stats.handsCount on the stream document
    const streamRef = streamsQuery.docs[0].ref
    await streamRef.update({
      'stats.handsCount': FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    })

    revalidatePath(`/admin/streams/${streamId}/recorder`)
    revalidatePath('/archive')

    return { success: true, handId: handRef.id }

  } catch (error) {
    console.error('createHand error:', error)
    return { success: false, error: 'Failed to create hand' }
  }
}

function formatActionString(action: any) {
  let actionVerb = action.action
  if (actionVerb === 'bet') actionVerb = 'bets'
  if (actionVerb === 'raise') actionVerb = 'raises to'
  if (actionVerb === 'call') actionVerb = 'calls'
  if (actionVerb === 'check') actionVerb = 'checks'
  if (actionVerb === 'fold') actionVerb = 'folds'

  if (action.amount > 0 && ['bets', 'raises to', 'calls', 'all-in'].includes(actionVerb)) {
    return `${action.player} ${actionVerb} ${action.amount}`
  }
  return `${action.player} ${actionVerb}`
}
