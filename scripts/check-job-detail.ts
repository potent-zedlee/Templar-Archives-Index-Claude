import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./gcs-service-account-key.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkJob() {
  const jobId = "9a8a0d42-7349-46d2-9f9c-e6c8ede098a8";

  console.log("=== 작업 상세 정보 ===\n");

  // 작업 정보 조회
  const jobDoc = await db.collection("analysisJobs").doc(jobId).get();
  const job = jobDoc.data();

  console.log("Job ID:", jobId);
  console.log("Stream ID:", job?.streamId || "N/A");
  console.log("YouTube URL:", job?.youtubeUrl || "N/A");
  console.log("GCS URI:", job?.gcsUri || "N/A");
  console.log("Platform:", job?.platform || "N/A");
  console.log("진행률:", job?.progress || 0, "%");
  console.log("총 세그먼트:", job?.totalSegments || "N/A");
  console.log("완료 세그먼트:", job?.completedSegments || "N/A");
  console.log("생성:", job?.createdAt?.toDate?.()?.toISOString() || "N/A");
  console.log("");

  // 스트림 정보 조회
  const streamId = job?.streamId;
  if (streamId) {
    console.log("=== 스트림 정보 ===\n");

    // streams 컬렉션에서 찾기
    const streamDoc = await db.collection("streams").doc(streamId).get();
    if (streamDoc.exists) {
      const stream = streamDoc.data();
      console.log("스트림 이름:", stream?.name || "N/A");
      console.log("파이프라인 상태:", stream?.pipelineStatus || "N/A");
      console.log("소스 타입:", stream?.sourceType || "N/A");
    } else {
      // collectionGroup에서 찾기
      const snap = await db.collectionGroup("streams").where("id", "==", streamId).limit(1).get();
      if (snap.docs.length > 0) {
        const stream = snap.docs[0].data();
        console.log("스트림 경로:", snap.docs[0].ref.path);
        console.log("스트림 이름:", stream?.name || "N/A");
        console.log("파이프라인 상태:", stream?.pipelineStatus || "N/A");
      }
    }

    // 핸드 조회
    console.log("\n=== 분석된 핸드 ===\n");
    const handsSnap = await db.collection("hands")
      .where("streamId", "==", streamId)
      .orderBy("number", "asc")
      .get();

    console.log("총 핸드 수:", handsSnap.size);

    if (handsSnap.size > 0) {
      console.log("\n핸드 목록:");
      handsSnap.docs.forEach(doc => {
        const h = doc.data();
        console.log("  #" + h.number, "| Pot:", h.potSize, "| Players:", h.players?.length || 0);
      });
    }
  }
}

checkJob().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
