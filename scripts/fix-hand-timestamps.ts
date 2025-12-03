/**
 * 핸드 타임스탬프를 문자열에서 초 단위로 변환
 *
 * 사용법: npx tsx scripts/fix-hand-timestamps.ts <streamId>
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

/**
 * "HH:MM:SS" 또는 "MM:SS" 형식의 타임스탬프를 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp: string): number {
  if (typeof timestamp !== "string") return 0;

  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

async function main() {
  const streamId = process.argv[2] || "NjO87uMdlqwh4yxWnXVY";

  console.log("=== 핸드 타임스탬프 변환 ===");
  console.log(`streamId: ${streamId}`);
  console.log("");

  const hands = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();

  console.log(`총 ${hands.size}개 핸드 발견`);
  console.log("");

  let updated = 0;
  let skipped = 0;

  const batch = db.batch();

  for (const doc of hands.docs) {
    const data = doc.data();
    const start = data.videoTimestampStart;
    const end = data.videoTimestampEnd;

    // 이미 숫자인 경우 스킵
    if (typeof start === "number" && typeof end === "number") {
      skipped++;
      continue;
    }

    // 문자열인 경우 변환
    if (typeof start === "string" || typeof end === "string") {
      const startSeconds = typeof start === "string" ? parseTimestampToSeconds(start) : start;
      const endSeconds = typeof end === "string" ? parseTimestampToSeconds(end) : end;

      batch.update(doc.ref, {
        videoTimestampStart: startSeconds,
        videoTimestampEnd: endSeconds,
        updatedAt: new Date(),
      });

      updated++;

      if (updated <= 3) {
        console.log(`[${updated}] Hand ${data.number}: "${start}" -> ${startSeconds}초, "${end}" -> ${endSeconds}초`);
      }
    }
  }

  if (updated > 0) {
    await batch.commit();
    console.log("");
    console.log(`완료: ${updated}개 업데이트, ${skipped}개 스킵`);
  } else {
    console.log("업데이트할 핸드가 없습니다.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
