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
  // 최근 분석 작업에서 streamId 확인
  console.log("=== 최근 분석 작업 ===");
  const jobs = await db.collection("analysisJobs")
    .orderBy("createdAt", "desc")
    .limit(3)
    .get();

  for (const job of jobs.docs) {
    const data = job.data();
    console.log("Job:", job.id);
    console.log("  streamId:", data.streamId);
    console.log("  tournamentId:", data.tournamentId);
    console.log("  eventId:", data.eventId);
    console.log("  status:", data.status);
    console.log("---");

    // 해당 스트림의 pipelineStatus 확인
    if (data.streamId && data.tournamentId && data.eventId) {
      const streamRef = db.collection("tournaments")
        .doc(data.tournamentId)
        .collection("events")
        .doc(data.eventId)
        .collection("streams")
        .doc(data.streamId);

      const streamDoc = await streamRef.get();
      if (streamDoc.exists) {
        const streamData = streamDoc.data();
        console.log("  Stream found:", {
          name: streamData?.name,
          pipelineStatus: streamData?.pipelineStatus,
          currentJobId: streamData?.currentJobId,
          gcsUri: streamData?.gcsUri ? "있음" : "없음"
        });
      } else {
        console.log("  Stream NOT found in nested collection");
      }
    }
    console.log("===");
  }
}

main().then(() => process.exit(0));
