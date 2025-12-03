/**
 * 분석 시작 스크립트
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

const ORCHESTRATOR_URL = "https://video-orchestrator-700566907563.asia-northeast3.run.app";

async function main() {
  const streamId = "NjO87uMdlqwh4yxWnXVY";

  // 1. 스트림 정보 조회 (subcollection에서)
  const tournamentId = "3c9510c3-8e4c-49db-8f12-c5c734f1d257";
  const eventId = "ba51e7c2-3029-4586-bba2-393e562a16a3";

  const streamDoc = await db
    .collection("tournaments").doc(tournamentId)
    .collection("events").doc(eventId)
    .collection("streams").doc(streamId)
    .get();
  const stream = streamDoc.data();

  if (!stream) {
    console.error("Stream not found!");
    return;
  }

  console.log("=== Stream Info ===");
  console.log("Name:", stream.name);
  console.log("GCS URI:", stream.gcsUri);
  console.log("Pipeline Status:", stream.pipelineStatus);
  console.log("");

  // 2. 5개 구간 (이전 요청 기준 - 약 2시간 10분)
  // 시작: 2:51:30 (10290초), 종료: 10:50:00 (39000초)
  const segments = [
    { start: 10290, end: 15840 },   // 2:51:30 - 4:24:00 (구간 1)
    { start: 15840, end: 21390 },   // 4:24:00 - 5:56:30 (구간 2)
    { start: 21390, end: 26580 },   // 5:56:30 - 7:23:00 (구간 3)
    { start: 26580, end: 32010 },   // 7:23:00 - 8:53:30 (구간 4)
    { start: 32010, end: 39000 },   // 8:53:30 - 10:50:00 (구간 5)
  ];

  console.log("=== 분석 구간 (5개) ===");
  segments.forEach((seg, i) => {
    const startMin = Math.floor(seg.start / 60);
    const startSec = seg.start % 60;
    const endMin = Math.floor(seg.end / 60);
    const endSec = seg.end % 60;
    console.log(`구간 ${i + 1}: ${startMin}:${String(startSec).padStart(2, '0')} - ${endMin}:${String(endSec).padStart(2, '0')}`);
  });
  console.log("");

  // 3. Cloud Run Orchestrator 호출
  console.log("=== Cloud Run Orchestrator 호출 ===");
  console.log(`URL: ${ORCHESTRATOR_URL}/analyze`);

  const response = await fetch(`${ORCHESTRATOR_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      streamId,
      gcsUri: stream.gcsUri,
      segments,
      platform: "ept",
      tournamentId: stream.tournamentId || "3c9510c3-8e4c-49db-8f12-c5c734f1d257",
      eventId: stream.eventId || "ba51e7c2-3029-4586-bba2-393e562a16a3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Orchestrator error:", error);
    return;
  }

  const result = await response.json();
  console.log("");
  console.log("=== 분석 시작 성공! ===");
  console.log("Job ID:", result.jobId);
  console.log("Message:", result.message);

  // 4. 스트림 상태 업데이트
  await db
    .collection("tournaments").doc(tournamentId)
    .collection("events").doc(eventId)
    .collection("streams").doc(streamId)
    .update({
    pipelineStatus: "analyzing",
    pipelineProgress: 0,
    currentJobId: result.jobId,
    updatedAt: new Date(),
  });

  console.log("");
  console.log("스트림 상태가 'analyzing'으로 업데이트되었습니다.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
