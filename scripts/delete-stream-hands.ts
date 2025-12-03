/**
 * 스트림의 모든 핸드 삭제
 *
 * 사용법: npx tsx scripts/delete-stream-hands.ts <streamId>
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
  const streamId = process.argv[2] || "NjO87uMdlqwh4yxWnXVY";

  console.log("=== 스트림 핸드 삭제 ===");
  console.log(`streamId: ${streamId}`);
  console.log("");

  // 1. 핸드 조회
  const hands = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();

  console.log(`삭제할 핸드 수: ${hands.size}개`);

  if (hands.size === 0) {
    console.log("삭제할 핸드가 없습니다.");
    return;
  }

  // 2. 배치 삭제 (500개씩)
  const batchSize = 500;
  let deleted = 0;

  while (deleted < hands.size) {
    const batch = db.batch();
    const docsToDelete = hands.docs.slice(deleted, deleted + batchSize);

    docsToDelete.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deleted += docsToDelete.length;
    console.log(`삭제 진행: ${deleted}/${hands.size}`);
  }

  console.log("");
  console.log(`완료: ${hands.size}개 핸드 삭제됨`);

  // 3. 스트림 stats 리셋
  // 스트림 경로 찾기
  const handsSnapshot = await db.collection("hands")
    .where("streamId", "==", streamId)
    .limit(1)
    .get();

  // collectionGroup으로 스트림 찾기
  const streamsSnapshot = await db.collectionGroup("streams")
    .where(admin.firestore.FieldPath.documentId(), "==", streamId)
    .get();

  if (!streamsSnapshot.empty) {
    const streamDoc = streamsSnapshot.docs[0];
    await streamDoc.ref.update({
      "stats.handsCount": 0,
      pipelineStatus: "pending",
      pipelineProgress: 0,
      currentJobId: null,
      updatedAt: new Date(),
    });
    console.log(`스트림 상태 리셋 완료: ${streamDoc.ref.path}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
