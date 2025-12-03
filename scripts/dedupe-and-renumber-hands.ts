/**
 * 핸드 중복 제거 및 타임스탬프 순 핸드 번호 재할당
 *
 * 1. streamId로 모든 핸드 조회
 * 2. videoTimestampStart 기준 5초 이내 중복 제거
 * 3. 타임스탬프 순 정렬
 * 4. 핸드 번호 1, 2, 3... 재할당
 * 5. 중복 핸드 삭제
 */

import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccount = require("../gcs-service-account-key.json");

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: "templar-archives-index"
  });
}

const db = admin.firestore();

interface HandDoc {
  id: string;
  number: number;
  videoTimestampStart: number;
  videoTimestampEnd: number;
  data: admin.firestore.DocumentData;
}

async function main() {
  const streamId = process.argv[2] || "NjO87uMdlqwh4yxWnXVY";
  const DEDUP_THRESHOLD = 5; // 5초 이내 시작시간은 동일 핸드로 간주

  console.log("=== 핸드 중복 제거 및 번호 재할당 ===");
  console.log(`Stream ID: ${streamId}`);
  console.log(`중복 기준: 시작 시간 ${DEDUP_THRESHOLD}초 이내`);
  console.log("");

  // 1. 모든 핸드 조회
  const snapshot = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();

  console.log(`총 핸드 수: ${snapshot.size}개`);

  if (snapshot.size === 0) {
    console.log("핸드가 없습니다.");
    return;
  }

  // 2. 핸드 데이터 추출 및 정렬
  const hands: HandDoc[] = snapshot.docs.map(doc => ({
    id: doc.id,
    number: doc.data().number || 0,
    videoTimestampStart: doc.data().videoTimestampStart || 0,
    videoTimestampEnd: doc.data().videoTimestampEnd || 0,
    data: doc.data(),
  }));

  // 타임스탬프 순 정렬
  hands.sort((a, b) => a.videoTimestampStart - b.videoTimestampStart);

  console.log(`정렬 완료 (시작 시간 기준)`);
  console.log(`시작 시간 범위: ${formatTime(hands[0].videoTimestampStart)} ~ ${formatTime(hands[hands.length - 1].videoTimestampStart)}`);
  console.log("");

  // 3. 중복 제거 (5초 이내 시작시간)
  const uniqueHands: HandDoc[] = [];
  const duplicateIds: string[] = [];

  for (const hand of hands) {
    const lastUnique = uniqueHands[uniqueHands.length - 1];

    if (!lastUnique) {
      uniqueHands.push(hand);
      continue;
    }

    const timeDiff = hand.videoTimestampStart - lastUnique.videoTimestampStart;

    if (timeDiff > DEDUP_THRESHOLD) {
      // 새로운 핸드
      uniqueHands.push(hand);
    } else {
      // 중복 - 더 긴 종료 시간을 가진 것 유지
      if (hand.videoTimestampEnd > lastUnique.videoTimestampEnd) {
        duplicateIds.push(lastUnique.id);
        uniqueHands[uniqueHands.length - 1] = hand;
      } else {
        duplicateIds.push(hand.id);
      }
    }
  }

  console.log(`유니크 핸드: ${uniqueHands.length}개`);
  console.log(`중복 핸드: ${duplicateIds.length}개`);
  console.log("");

  // 4. 핸드 번호 재할당 (배치 업데이트)
  console.log("=== 핸드 번호 재할당 ===");

  const updateBatch = db.batch();
  let updateCount = 0;

  for (let i = 0; i < uniqueHands.length; i++) {
    const hand = uniqueHands[i];
    const newNumber = i + 1;

    if (hand.number !== newNumber) {
      updateBatch.update(db.collection("hands").doc(hand.id), {
        number: newNumber,
        updatedAt: new Date(),
      });
      updateCount++;
    }
  }

  if (updateCount > 0) {
    await updateBatch.commit();
    console.log(`${updateCount}개 핸드 번호 업데이트 완료`);
  } else {
    console.log("업데이트할 핸드 없음");
  }

  // 5. 중복 핸드 삭제 (배치로 500개씩)
  if (duplicateIds.length > 0) {
    console.log("");
    console.log("=== 중복 핸드 삭제 ===");

    const batchSize = 500;
    let deleted = 0;

    while (deleted < duplicateIds.length) {
      const deleteBatch = db.batch();
      const idsToDelete = duplicateIds.slice(deleted, deleted + batchSize);

      idsToDelete.forEach(id => {
        deleteBatch.delete(db.collection("hands").doc(id));
      });

      await deleteBatch.commit();
      deleted += idsToDelete.length;
      console.log(`삭제 진행: ${deleted}/${duplicateIds.length}`);
    }

    console.log(`${duplicateIds.length}개 중복 핸드 삭제 완료`);
  }

  // 6. 결과 요약
  console.log("");
  console.log("=== 최종 결과 ===");
  console.log(`유니크 핸드: ${uniqueHands.length}개`);
  console.log(`핸드 번호 범위: #1 ~ #${uniqueHands.length}`);

  // 샘플 출력
  console.log("");
  console.log("=== 샘플 핸드 (처음 5개) ===");
  uniqueHands.slice(0, 5).forEach((hand, i) => {
    console.log(`#${i + 1}: ${formatTime(hand.videoTimestampStart)} - ${formatTime(hand.videoTimestampEnd)}`);
  });

  // 스트림 stats 업데이트
  const tournamentId = "3c9510c3-8e4c-49db-8f12-c5c734f1d257";
  const eventId = "ba51e7c2-3029-4586-bba2-393e562a16a3";

  await db
    .collection("tournaments").doc(tournamentId)
    .collection("events").doc(eventId)
    .collection("streams").doc(streamId)
    .update({
      "stats.handsCount": uniqueHands.length,
      pipelineStatus: "completed",
      pipelineProgress: 100,
      updatedAt: new Date(),
    });

  console.log("");
  console.log(`스트림 상태 업데이트: handsCount=${uniqueHands.length}, status=completed`);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
