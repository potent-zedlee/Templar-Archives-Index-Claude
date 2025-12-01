#!/usr/bin/env npx tsx
/**
 * EPT/Triton 외 카테고리 데이터 전체 삭제 스크립트
 *
 * 사용법:
 *   npx tsx scripts/cleanup-non-ept-triton.ts --dry-run  # 삭제 대상만 확인
 *   npx tsx scripts/cleanup-non-ept-triton.ts            # 실제 삭제
 *
 * 환경 변수:
 *   GOOGLE_APPLICATION_CREDENTIALS - 서비스 계정 JSON 파일 경로
 *   또는 FIREBASE_ADMIN_SDK_KEY - 서비스 계정 JSON 문자열
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, type Firestore, type WriteBatch } from 'firebase-admin/firestore'

// ========== 설정 ==========
const KEEP_CATEGORIES = ['EPT', 'Triton']
const BATCH_SIZE = 500

// ========== Firebase 초기화 ==========
function initializeFirebase(): Firestore {
  if (getApps().length > 0) {
    return getFirestore()
  }

  // FIREBASE_ADMIN_SDK_KEY 우선
  if (process.env.FIREBASE_ADMIN_SDK_KEY) {
    const credential = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY) as ServiceAccount
    initializeApp({ credential: cert(credential) })
  } else {
    // GOOGLE_APPLICATION_CREDENTIALS 또는 ADC
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
    })
  }

  return getFirestore()
}

// ========== 타입 정의 ==========
interface DeleteStats {
  tournaments: number
  events: number
  streams: number
  hands: number
  handSubcollections: number
  analysisJobs: number
}

// ========== 배치 삭제 헬퍼 ==========
class BatchDeleter {
  private db: Firestore
  private batch: WriteBatch
  private operationCount = 0
  private totalDeleted = 0
  private dryRun: boolean

  constructor(db: Firestore, dryRun: boolean) {
    this.db = db
    this.batch = db.batch()
    this.dryRun = dryRun
  }

  async addDelete(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
    if (this.dryRun) {
      this.totalDeleted++
      return
    }

    this.batch.delete(docRef)
    this.operationCount++
    this.totalDeleted++

    if (this.operationCount >= BATCH_SIZE) {
      await this.commit()
    }
  }

  async commit(): Promise<void> {
    if (this.dryRun || this.operationCount === 0) return
    await this.batch.commit()
    this.batch = this.db.batch()
    this.operationCount = 0
  }

  get deleted(): number {
    return this.totalDeleted
  }
}

// ========== 메인 로직 ==========
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('='.repeat(60))
  console.log('EPT/Triton 외 카테고리 데이터 삭제 스크립트')
  console.log('='.repeat(60))
  console.log(`모드: ${dryRun ? '🔍 DRY-RUN (삭제 없음)' : '🔥 실제 삭제'}`)
  console.log(`유지할 카테고리: ${KEEP_CATEGORIES.join(', ')}`)
  console.log('')

  const db = initializeFirebase()
  const stats: DeleteStats = {
    tournaments: 0,
    events: 0,
    streams: 0,
    hands: 0,
    handSubcollections: 0,
    analysisJobs: 0,
  }

  // 1. 삭제 대상 Tournament 조회
  console.log('📋 삭제 대상 Tournament 조회 중...')
  const tournamentsSnapshot = await db.collection('tournaments').get()

  const tournamentsToDelete: { id: string; name: string; category: string }[] = []

  for (const doc of tournamentsSnapshot.docs) {
    const data = doc.data()
    const category = data.category as string
    if (!KEEP_CATEGORIES.includes(category)) {
      tournamentsToDelete.push({
        id: doc.id,
        name: data.name as string,
        category,
      })
    }
  }

  if (tournamentsToDelete.length === 0) {
    console.log('✅ 삭제할 Tournament가 없습니다.')
    return
  }

  console.log(`\n삭제 대상 Tournament (${tournamentsToDelete.length}개):`)
  for (const t of tournamentsToDelete) {
    console.log(`  - [${t.category}] ${t.name} (${t.id})`)
  }

  // 2. 각 Tournament에서 streamId 수집
  console.log('\n📋 Stream ID 수집 중...')
  const streamIds: string[] = []
  const eventRefs: FirebaseFirestore.DocumentReference[] = []
  const streamRefs: FirebaseFirestore.DocumentReference[] = []

  for (const tournament of tournamentsToDelete) {
    const eventsSnapshot = await db
      .collection('tournaments')
      .doc(tournament.id)
      .collection('events')
      .get()

    stats.events += eventsSnapshot.size

    for (const eventDoc of eventsSnapshot.docs) {
      eventRefs.push(eventDoc.ref)

      const streamsSnapshot = await eventDoc.ref.collection('streams').get()
      stats.streams += streamsSnapshot.size

      for (const streamDoc of streamsSnapshot.docs) {
        streamIds.push(streamDoc.id)
        streamRefs.push(streamDoc.ref)
      }
    }
  }

  stats.tournaments = tournamentsToDelete.length
  console.log(`  Tournaments: ${stats.tournaments}`)
  console.log(`  Events: ${stats.events}`)
  console.log(`  Streams: ${stats.streams}`)

  // 3. Hand 삭제 (서브컬렉션 포함)
  if (streamIds.length > 0) {
    console.log('\n📋 Hands 조회 중...')

    // Firestore 'in' 쿼리는 최대 30개까지만 지원
    const handDeleter = new BatchDeleter(db, dryRun)
    const subDeleter = new BatchDeleter(db, dryRun)

    for (let i = 0; i < streamIds.length; i += 30) {
      const chunk = streamIds.slice(i, i + 30)
      const handsSnapshot = await db
        .collection('hands')
        .where('streamId', 'in', chunk)
        .get()

      for (const handDoc of handsSnapshot.docs) {
        // 서브컬렉션 삭제
        for (const subName of ['likes', 'tags', 'comments']) {
          const subSnapshot = await handDoc.ref.collection(subName).get()
          for (const subDoc of subSnapshot.docs) {
            await subDeleter.addDelete(subDoc.ref)
            stats.handSubcollections++
          }
        }
        // Hand 문서 삭제
        await handDeleter.addDelete(handDoc.ref)
        stats.hands++
      }
    }

    await subDeleter.commit()
    await handDeleter.commit()
    console.log(`  Hands: ${stats.hands}`)
    console.log(`  Hand 서브컬렉션: ${stats.handSubcollections}`)
  }

  // 4. AnalysisJobs 삭제
  if (streamIds.length > 0) {
    console.log('\n📋 AnalysisJobs 조회 중...')
    const jobDeleter = new BatchDeleter(db, dryRun)

    for (let i = 0; i < streamIds.length; i += 30) {
      const chunk = streamIds.slice(i, i + 30)
      const jobsSnapshot = await db
        .collection('analysisJobs')
        .where('streamId', 'in', chunk)
        .get()

      for (const jobDoc of jobsSnapshot.docs) {
        await jobDeleter.addDelete(jobDoc.ref)
        stats.analysisJobs++
      }
    }

    await jobDeleter.commit()
    console.log(`  AnalysisJobs: ${stats.analysisJobs}`)
  }

  // 5. Stream, Event, Tournament 삭제 (역순)
  console.log('\n📋 Tournament 구조 삭제 중...')
  const structureDeleter = new BatchDeleter(db, dryRun)

  // Streams
  for (const ref of streamRefs) {
    await structureDeleter.addDelete(ref)
  }

  // Events
  for (const ref of eventRefs) {
    await structureDeleter.addDelete(ref)
  }

  // Tournaments
  for (const t of tournamentsToDelete) {
    await structureDeleter.addDelete(db.collection('tournaments').doc(t.id))
  }

  await structureDeleter.commit()

  // 6. 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '🔍 DRY-RUN 결과 (실제 삭제 없음)' : '✅ 삭제 완료')
  console.log('='.repeat(60))
  console.log(`  Tournaments: ${stats.tournaments}`)
  console.log(`  Events: ${stats.events}`)
  console.log(`  Streams: ${stats.streams}`)
  console.log(`  Hands: ${stats.hands}`)
  console.log(`  Hand 서브컬렉션: ${stats.handSubcollections}`)
  console.log(`  AnalysisJobs: ${stats.analysisJobs}`)
  console.log('')
  console.log(`총 문서 수: ${
    stats.tournaments +
    stats.events +
    stats.streams +
    stats.hands +
    stats.handSubcollections +
    stats.analysisJobs
  }`)

  if (dryRun) {
    console.log('\n💡 실제 삭제를 실행하려면 --dry-run 없이 실행하세요:')
    console.log('   npx tsx scripts/cleanup-non-ept-triton.ts')
  }
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error)
  process.exit(1)
})
