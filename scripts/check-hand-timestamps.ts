/**
 * 핸드 타임스탬프 필드 확인
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

  console.log("=== Day 3 핸드 타임스탬프 확인 ===");
  console.log("");

  const hands = await db.collection("hands")
    .where("streamId", "==", streamId)
    .limit(3)
    .get();

  hands.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`[Hand ${i + 1}] ${doc.id}`);
    console.log("  number:", data.number);
    console.log("  videoTimestampStart:", data.videoTimestampStart || "(없음)");
    console.log("  videoTimestampEnd:", data.videoTimestampEnd || "(없음)");
    console.log("  timestamp:", data.timestamp || "(없음)");
    console.log("  timestampStart:", data.timestampStart || "(없음)");
    console.log("  timestampEnd:", data.timestampEnd || "(없음)");
    console.log("");
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
