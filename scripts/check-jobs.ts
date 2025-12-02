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
  console.log("=== 최근 분석 작업 (analysisJobs) ===");
  const snapshot = await db.collection("analysisJobs")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(JSON.stringify({
      id: doc.id,
      status: data.status,
      progress: data.progress,
      phase: data.phase,
      error: data.error || null,
      handsFound: data.handsFound || 0,
      createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
    }, null, 2));
    console.log("---");
  });
}

main().then(() => process.exit(0));
