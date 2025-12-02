#!/usr/bin/env npx tsx
/**
 * Firestore 마이그레이션 스크립트
 *
 * 작업 내용:
 * 1. sub_events 컬렉션의 모든 문서를 events 컬렉션으로 복사
 * 2. streams 컬렉션의 subEventId 필드를 eventId로 변환
 * 3. 기존 sub_events 컬렉션 삭제
 *
 * 실행: npx tsx scripts/migrate-sub-events-to-events.ts
 */

import admin from 'firebase-admin'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const serviceAccount = require('../gcs-service-account-key.json')

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'templar-archives-index',
  })
}

const db = admin.firestore()

interface MigrationStats {
  subEventsFound: number
  eventsCopied: number
  streamsUpdated: number
  subEventsDeleted: number
  errors: string[]
}

async function migrateSubEventsToEvents(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    subEventsFound: 0,
    eventsCopied: 0,
    streamsUpdated: 0,
    subEventsDeleted: 0,
    errors: [],
  }

  console.log('🚀 마이그레이션 시작: sub_events → events\n')

  try {
    // 1. sub_events 컬렉션 조회
    console.log('📋 Step 1: sub_events 컬렉션 조회...')
    const subEventsSnapshot = await db.collection('sub_events').get()
    stats.subEventsFound = subEventsSnapshot.size
    console.log(`   발견된 문서: ${stats.subEventsFound}개\n`)

    if (stats.subEventsFound === 0) {
      console.log('✅ sub_events 컬렉션이 비어있거나 이미 마이그레이션되었습니다.')
      return stats
    }

    // 2. events 컬렉션으로 복사
    console.log('📝 Step 2: events 컬렉션으로 복사...')
    const batch1 = db.batch()
    const subEventIds: string[] = []

    for (const docSnap of subEventsSnapshot.docs) {
      const data = docSnap.data()
      const eventRef = db.collection('events').doc(docSnap.id)

      // 동일한 ID로 events 컬렉션에 복사
      batch1.set(eventRef, {
        ...data,
        migratedAt: admin.firestore.Timestamp.now(),
        migratedFrom: 'sub_events',
      })

      subEventIds.push(docSnap.id)
      stats.eventsCopied++
    }

    await batch1.commit()
    console.log(`   복사 완료: ${stats.eventsCopied}개\n`)

    // 3. streams 컬렉션의 subEventId → eventId 업데이트
    console.log('🔄 Step 3: streams 컬렉션 업데이트 (subEventId → eventId)...')
    const streamsSnapshot = await db.collection('streams')
      .where('subEventId', '!=', null)
      .get()

    console.log(`   subEventId가 있는 스트림: ${streamsSnapshot.size}개`)

    if (streamsSnapshot.size > 0) {
      // Firestore batch는 500개 제한이 있으므로 분할
      const BATCH_SIZE = 400
      let batchCount = 0
      let batch2 = db.batch()

      for (const streamDoc of streamsSnapshot.docs) {
        const data = streamDoc.data()
        const streamRef = db.collection('streams').doc(streamDoc.id)

        batch2.update(streamRef, {
          eventId: data.subEventId,  // subEventId 값을 eventId로 복사
          subEventId: null,          // 레거시 필드 제거 (null로 설정)
        })

        stats.streamsUpdated++
        batchCount++

        if (batchCount >= BATCH_SIZE) {
          await batch2.commit()
          console.log(`   ${batchCount}개 배치 커밋 완료`)
          batch2 = db.batch()
          batchCount = 0
        }
      }

      if (batchCount > 0) {
        await batch2.commit()
        console.log(`   마지막 ${batchCount}개 배치 커밋 완료`)
      }
    }
    console.log(`   업데이트 완료: ${stats.streamsUpdated}개\n`)

    // 4. sub_events 컬렉션 삭제
    console.log('🗑️  Step 4: sub_events 컬렉션 삭제...')
    const BATCH_DELETE_SIZE = 400
    let deleteCount = 0
    let batch3 = db.batch()

    for (const docId of subEventIds) {
      const subEventRef = db.collection('sub_events').doc(docId)
      batch3.delete(subEventRef)
      stats.subEventsDeleted++
      deleteCount++

      if (deleteCount >= BATCH_DELETE_SIZE) {
        await batch3.commit()
        console.log(`   ${deleteCount}개 삭제 배치 커밋 완료`)
        batch3 = db.batch()
        deleteCount = 0
      }
    }

    if (deleteCount > 0) {
      await batch3.commit()
      console.log(`   마지막 ${deleteCount}개 삭제 배치 커밋 완료`)
    }
    console.log(`   삭제 완료: ${stats.subEventsDeleted}개\n`)

  } catch (error: any) {
    stats.errors.push(error.message)
    console.error('❌ 마이그레이션 오류:', error)
  }

  return stats
}

async function main() {
  console.log('=' .repeat(60))
  console.log('Firestore 마이그레이션: sub_events → events')
  console.log('=' .repeat(60))
  console.log('')

  const stats = await migrateSubEventsToEvents()

  console.log('=' .repeat(60))
  console.log('📊 마이그레이션 결과')
  console.log('=' .repeat(60))
  console.log(`   sub_events 발견: ${stats.subEventsFound}개`)
  console.log(`   events 복사: ${stats.eventsCopied}개`)
  console.log(`   streams 업데이트: ${stats.streamsUpdated}개`)
  console.log(`   sub_events 삭제: ${stats.subEventsDeleted}개`)

  if (stats.errors.length > 0) {
    console.log(`   ❌ 오류: ${stats.errors.length}개`)
    stats.errors.forEach(err => console.log(`      - ${err}`))
  } else {
    console.log(`   ✅ 오류 없음`)
  }
  console.log('')

  process.exit(stats.errors.length > 0 ? 1 : 0)
}

main()
