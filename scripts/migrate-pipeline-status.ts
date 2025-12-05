/**
 * Pipeline Status Migration Script
 *
 * 7단계 파이프라인 → 3단계로 마이그레이션
 *
 * 변환 매핑:
 * - pending → uploaded
 * - needs_classify → uploaded
 * - analyzing → analyzing (유지)
 * - completed → published
 * - needs_review → published
 * - published → published (유지)
 * - failed → failed (유지)
 *
 * 실행: npx tsx scripts/migrate-pipeline-status.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";

// Firebase Admin 초기화
const serviceAccount = JSON.parse(
  fs.readFileSync("./gcs-service-account-key.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 상태 매핑
const STATUS_MAPPING: Record<string, string> = {
  'pending': 'uploaded',
  'needs_classify': 'uploaded',
  'analyzing': 'analyzing',
  'completed': 'published',
  'needs_review': 'published',
  'published': 'published',
  'failed': 'failed',
};

interface MigrationResult {
  collection: string;
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  details: Record<string, number>;
}

async function migrateCollection(collectionPath: string): Promise<MigrationResult> {
  console.log(`\n📦 Migrating: ${collectionPath}`);

  const result: MigrationResult = {
    collection: collectionPath,
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: {},
  };

  try {
    const snapshot = await db.collection(collectionPath).get();
    result.total = snapshot.size;
    console.log(`   Found ${result.total} documents`);

    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentStatus = data.pipelineStatus;

      if (!currentStatus) {
        result.skipped++;
        continue;
      }

      const newStatus = STATUS_MAPPING[currentStatus];

      if (!newStatus) {
        console.log(`   ⚠️ Unknown status: ${currentStatus} in doc ${doc.id}`);
        result.skipped++;
        continue;
      }

      if (currentStatus === newStatus) {
        result.skipped++;
        continue;
      }

      // 변환 기록
      result.details[`${currentStatus} → ${newStatus}`] =
        (result.details[`${currentStatus} → ${newStatus}`] || 0) + 1;

      batch.update(doc.ref, {
        pipelineStatus: newStatus,
        pipelineStatusLegacy: currentStatus, // 백업용
        pipelineMigratedAt: FieldValue.serverTimestamp(),
      });

      batchCount++;
      result.updated++;

      // 배치 크기 제한
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`   ✅ Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✅ Committed final batch of ${batchCount} updates`);
    }

  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    result.errors++;
  }

  return result;
}

async function migrateSubcollections(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // tournaments → events → streams 서브컬렉션
  console.log('\n🔍 Finding tournament/event/stream subcollections...');

  const tournamentsSnapshot = await db.collection('tournaments').get();

  for (const tournamentDoc of tournamentsSnapshot.docs) {
    const eventsSnapshot = await db
      .collection('tournaments')
      .doc(tournamentDoc.id)
      .collection('events')
      .get();

    for (const eventDoc of eventsSnapshot.docs) {
      const streamsPath = `tournaments/${tournamentDoc.id}/events/${eventDoc.id}/streams`;
      const result = await migrateCollection(streamsPath);
      if (result.updated > 0) {
        results.push(result);
      }
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Pipeline Status Migration Started');
  console.log('=====================================');
  console.log('Status mapping:');
  Object.entries(STATUS_MAPPING).forEach(([old, newStatus]) => {
    if (old !== newStatus) {
      console.log(`  ${old} → ${newStatus}`);
    }
  });
  console.log('=====================================');

  const allResults: MigrationResult[] = [];

  // 1. streams 컬렉션 (플랫 구조)
  const streamsResult = await migrateCollection('streams');
  allResults.push(streamsResult);

  // 2. 서브컬렉션 (tournaments/events/streams)
  const subcollectionResults = await migrateSubcollections();
  allResults.push(...subcollectionResults);

  // 결과 요약
  console.log('\n=====================================');
  console.log('📊 Migration Summary');
  console.log('=====================================');

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const result of allResults) {
    if (result.updated > 0) {
      console.log(`\n${result.collection}:`);
      console.log(`  Total: ${result.total}`);
      console.log(`  Updated: ${result.updated}`);
      console.log(`  Skipped: ${result.skipped}`);
      if (Object.keys(result.details).length > 0) {
        console.log('  Details:');
        Object.entries(result.details).forEach(([transition, count]) => {
          console.log(`    ${transition}: ${count}`);
        });
      }
    }
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n=====================================');
  console.log(`Total Updated: ${totalUpdated}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log('=====================================');
  console.log('✅ Migration completed!');
}

// Dry run 모드 확인
const isDryRun = process.argv.includes('--dry-run');
if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made');
  // TODO: dry run 구현
}

main().catch(console.error);
