/**
 * Day 3 스트림 publishedAt 필드 추가
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

  const data = doc.data()!;
  console.log("=== 현재 상태 ===");
  console.log("name:", data.name);
  console.log("publishedAt:", data.publishedAt || "(없음)");
  console.log("createdAt:", data.createdAt);

  // publishedAt 필드 추가
  const publishedAt = data.createdAt || new Date();

  await streamRef.update({
    publishedAt: publishedAt,
    updatedAt: new Date(),
  });

  console.log("");
  console.log("=== 업데이트 완료 ===");
  console.log("publishedAt 추가됨:", publishedAt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
