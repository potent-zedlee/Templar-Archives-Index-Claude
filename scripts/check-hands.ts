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

async function checkHands() {
  // 1. hands 컬렉션에서 최근 핸드 조회
  const handsSnapshot = await db.collection("hands")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  console.log("=== 최근 핸드 ===");
  for (const doc of handsSnapshot.docs) {
    const data = doc.data();
    console.log("Hand ID:", doc.id);
    console.log("  streamId:", data.streamId);
    console.log("  number:", data.number);
    console.log("");
  }

  // 2. 첫 번째 핸드의 streamId로 스트림 찾기
  if (handsSnapshot.docs.length > 0) {
    const streamId = handsSnapshot.docs[0].data().streamId;
    console.log("=== 스트림 검색 (streamId:", streamId, ") ===");

    // 2-1. streams 컬렉션에서 찾기
    const streamDoc = await db.collection("streams").doc(streamId).get();
    if (streamDoc.exists) {
      console.log("Found in streams collection (unsorted)");
      const data = streamDoc.data();
      console.log("  name:", data?.name);
      console.log("  pipelineStatus:", data?.pipelineStatus);
    } else {
      console.log("Not found in streams collection");
    }

    // 2-2. collectionGroup으로 찾기
    const snapshot = await db.collectionGroup("streams")
      .where("id", "==", streamId)
      .limit(1)
      .get();

    if (snapshot.docs.length > 0) {
      const doc = snapshot.docs[0];
      console.log("\nFound in tournament subcollection");
      console.log("  path:", doc.ref.path);
      console.log("  name:", doc.data()?.name);
      console.log("  pipelineStatus:", doc.data()?.pipelineStatus);
      console.log("  videoUrl:", doc.data()?.videoUrl);
    } else {
      console.log("Not found in any streams subcollection via collectionGroup");
    }
  }
}

checkHands().catch(console.error);
