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
  // 토너먼트 목록
  const tournaments = await db.collection("tournaments").limit(3).get();

  for (const t of tournaments.docs) {
    console.log("Tournament:", t.id, t.data().name);

    const events = await db.collection("tournaments").doc(t.id).collection("events").limit(2).get();
    for (const e of events.docs) {
      console.log("  Event:", e.id, e.data().name);

      const streams = await db.collection("tournaments").doc(t.id).collection("events").doc(e.id).collection("streams").limit(5).get();
      for (const s of streams.docs) {
        const data = s.data();
        console.log("    Stream:", s.id, JSON.stringify({
          name: data.name,
          pipelineStatus: data.pipelineStatus,
          currentJobId: data.currentJobId,
          gcsUri: data.gcsUri ? "있음" : "없음"
        }));
      }
    }
  }
}

main().then(() => process.exit(0));
