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

async function findNullName() {
  const handsSnapshot = await db.collection("hands")
    .where("streamId", "==", "NjO87uMdlqwh4yxWnXVY")
    .get();

  console.log("Total hands:", handsSnapshot.size);

  let nullNameCount = 0;
  let undefinedPlayersCount = 0;

  for (const doc of handsSnapshot.docs) {
    const data = doc.data();

    if (data.players === undefined || data.players === null) {
      undefinedPlayersCount++;
      continue;
    }

    for (const p of data.players) {
      if (p.name === null || p.name === undefined) {
        nullNameCount++;
        console.log("Found null name in hand #" + data.number);
        console.log("  Player:", JSON.stringify(p));
      }
    }
  }

  console.log("\nNull name count:", nullNameCount);
  console.log("Undefined players count:", undefinedPlayersCount);
}

findNullName().catch(console.error);
