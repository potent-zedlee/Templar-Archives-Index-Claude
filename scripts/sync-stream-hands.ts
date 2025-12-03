/**
 * 스트림 핸드 수 동기화 스크립트
 *
 * 사용법: npx tsx scripts/sync-stream-hands.ts <streamId> <tournamentId> <eventId>
 *
 * 예시:
 *   npx tsx scripts/sync-stream-hands.ts c9ec88f1-4dfe-4267-bf6f-1aae2a229fef ept-barcelona-2025 5k-main-event
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

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log("사용법: npx tsx scripts/sync-stream-hands.ts <streamId> <tournamentId> <eventId>");
    console.log("");
    console.log("예시:");
    console.log("  npx tsx scripts/sync-stream-hands.ts c9ec88f1-4dfe-4267-bf6f-1aae2a229fef ept-barcelona-2025 5k-main-event");
    process.exit(1);
  }

  const [streamId, tournamentId, eventId] = args;

  console.log("=== 스트림 핸드 수 동기화 ===");
  console.log(`streamId: ${streamId}`);
  console.log(`tournamentId: ${tournamentId}`);
  console.log(`eventId: ${eventId}`);
  console.log("");

  // 1. 핸드 수 계산
  const handsSnapshot = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();

  const handsCount = handsSnapshot.size;
  console.log(`hands 컬렉션에서 ${handsCount}개 핸드 발견`);

  // 2. 스트림 문서 확인
  const streamRef = db
    .collection("tournaments")
    .doc(tournamentId)
    .collection("events")
    .doc(eventId)
    .collection("streams")
    .doc(streamId);

  const streamDoc = await streamRef.get();

  if (!streamDoc.exists) {
    console.error("스트림을 찾을 수 없습니다:", streamRef.path);

    // 루트 streams 컬렉션 확인
    const rootStreamRef = db.collection("streams").doc(streamId);
    const rootStreamDoc = await rootStreamRef.get();
    if (rootStreamDoc.exists) {
      const data = rootStreamDoc.data();
      console.log("");
      console.log("루트 streams 컬렉션에서 발견됨!");
      console.log("  - tournamentId:", data?.tournamentId);
      console.log("  - eventId:", data?.eventId);
      console.log("");
      console.log("올바른 경로로 다시 시도하세요.");
    }
    process.exit(1);
  }

  const currentData = streamDoc.data();
  console.log("");
  console.log("현재 스트림 상태:");
  console.log("  - name:", currentData?.name);
  console.log("  - pipelineStatus:", currentData?.pipelineStatus);
  console.log("  - stats.handsCount:", currentData?.stats?.handsCount || 0);
  console.log("");

  // 3. 스트림 업데이트
  await streamRef.update({
    "stats.handsCount": handsCount,
    pipelineStatus: handsCount > 0 ? "completed" : currentData?.pipelineStatus,
    pipelineProgress: handsCount > 0 ? 100 : currentData?.pipelineProgress || 0,
    updatedAt: new Date(),
  });

  console.log("업데이트 완료!");
  console.log("  - stats.handsCount:", handsCount);
  console.log("  - pipelineStatus:", handsCount > 0 ? "completed" : currentData?.pipelineStatus);
  console.log("");

  // 4. 샘플 핸드 출력
  if (handsCount > 0) {
    console.log("=== 샘플 핸드 (최대 3개) ===");
    const sampleHands = handsSnapshot.docs.slice(0, 3);
    sampleHands.forEach((doc, i) => {
      const data = doc.data();
      console.log(`[${i + 1}] ${doc.id}`);
      console.log("    - number:", data.number);
      console.log("    - tournamentId:", data.tournamentId || "(없음)");
      console.log("    - eventId:", data.eventId || "(없음)");
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
