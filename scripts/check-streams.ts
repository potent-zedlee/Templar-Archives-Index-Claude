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
  console.log("=== 최근 스트림 (pipelineStatus 확인) ===");
  const snapshot = await db.collection("streams")
    .orderBy("updatedAt", "desc")
    .limit(5)
    .get();

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(JSON.stringify({
      id: doc.id,
      name: data.name,
      pipelineStatus: data.pipelineStatus,
      currentJobId: data.currentJobId,
      uploadStatus: data.uploadStatus,
      gcsUri: data.gcsUri ? '있음' : '없음',
      updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
    }, null, 2));
    console.log("---");
  });
}

main().then(() => process.exit(0));
