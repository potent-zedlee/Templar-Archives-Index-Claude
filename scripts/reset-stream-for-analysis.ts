/**
 * 스트림을 분석 대기 상태로 리셋
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

  await streamRef.update({
    pipelineStatus: "pending",
    pipelineProgress: 0,
    pipelineError: null,
    currentJobId: null,
    "stats.handsCount": 0,
    updatedAt: new Date(),
  });

  console.log("스트림 리셋 완료!");
  console.log("  - pipelineStatus: pending");
  console.log("  - stats.handsCount: 0");
  console.log("");
  console.log("이제 Admin 페이지에서 분석을 다시 시작할 수 있습니다.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
