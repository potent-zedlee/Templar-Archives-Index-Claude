/**
 * Day 3 스트림 상세 확인
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
  const streamId = "NjO87uMdlqwh4yxWnXVY";
  const tournamentId = "3c9510c3-8e4c-49db-8f12-c5c734f1d257";
  const eventId = "ba51e7c2-3029-4586-bba2-393e562a16a3";

  const streamRef = db.collection("tournaments").doc(tournamentId)
    .collection("events").doc(eventId)
    .collection("streams").doc(streamId);

  const doc = await streamRef.get();

  if (!doc.exists) {
    console.log("스트림을 찾을 수 없습니다");
    return;
  }

  console.log("=== Day 3 스트림 상세 데이터 ===");
  const data = doc.data()!;

  console.log("name:", data.name);
  console.log("pipelineStatus:", data.pipelineStatus);
  console.log("published:", data.published);
  console.log("stats:", JSON.stringify(data.stats, null, 2));
  console.log("videoSource:", data.videoSource);
  console.log("videoUrl:", data.videoUrl);
  console.log("gcsUri:", data.gcsUri);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
