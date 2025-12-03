/**
 * EPT Barcelona 2025 스트림 확인 스크립트
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
  // EPT Barcelona 2025 토너먼트의 이벤트와 스트림 확인
  const tournamentId = "3c9510c3-8e4c-49db-8f12-c5c734f1d257";

  console.log("=== EPT Barcelona 2025 스트림 목록 ===");

  const eventsSnapshot = await db.collection("tournaments").doc(tournamentId)
    .collection("events").get();

  if (eventsSnapshot.empty) {
    console.log("이벤트가 없습니다");
    return;
  }

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    console.log("");
    console.log("이벤트:", eventData.name || eventDoc.id);
    console.log("  eventId:", eventDoc.id);

    const streamsSnapshot = await eventDoc.ref.collection("streams").get();

    if (streamsSnapshot.empty) {
      console.log("  (스트림 없음)");
      continue;
    }

    for (const streamDoc of streamsSnapshot.docs) {
      const data = streamDoc.data();
      console.log("");
      console.log("  스트림:", data.name);
      console.log("    ID:", streamDoc.id);
      console.log("    pipelineStatus:", data.pipelineStatus);
      console.log("    stats.handsCount:", data.stats?.handsCount || 0);
      console.log("    published:", data.published || false);

      // 해당 스트림의 핸드 수 확인
      const handsCount = await db.collection("hands")
        .where("streamId", "==", streamDoc.id)
        .count()
        .get();
      console.log("    실제 hands 컬렉션 핸드 수:", handsCount.data().count);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
