/**
 * 스트림 위치 찾기 스크립트
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
  const streamId = "c9ec88f1-4dfe-4267-bf6f-1aae2a229fef";

  console.log("=== 스트림 위치 찾기 ===");
  console.log(`streamId: ${streamId}`);
  console.log("");

  // 1. hands 컬렉션에서 해당 streamId의 핸드 확인
  const handsSnapshot = await db.collection("hands")
    .where("streamId", "==", streamId)
    .limit(1)
    .get();

  if (!handsSnapshot.empty) {
    const handData = handsSnapshot.docs[0].data();
    console.log("핸드 데이터:");
    console.log("  - streamId:", handData.streamId);
    console.log("  - tournamentId:", handData.tournamentId || "(없음)");
    console.log("  - eventId:", handData.eventId || "(없음)");
  } else {
    console.log("핸드를 찾을 수 없습니다");
  }

  console.log("");

  // 2. 루트 streams 컬렉션 확인
  const rootStream = await db.collection("streams").doc(streamId).get();
  if (rootStream.exists) {
    const data = rootStream.data();
    console.log("루트 streams에서 발견:");
    console.log("  - name:", data?.name);
    console.log("  - tournamentId:", data?.tournamentId);
    console.log("  - eventId:", data?.eventId);
    console.log("  - pipelineStatus:", data?.pipelineStatus);
    console.log("  - stats.handsCount:", data?.stats?.handsCount || 0);
  } else {
    console.log("루트 streams에서 찾을 수 없음");
  }

  console.log("");

  // 3. 핸드 총 개수 확인
  const allHands = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();
  console.log(`총 핸드 수: ${allHands.size}개`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
