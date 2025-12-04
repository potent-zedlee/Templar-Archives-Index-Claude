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

async function findAllStreams() {
  const tournaments = await db.collection("tournaments").get();
  
  console.log("=== 토너먼트별 스트림 (YouTube URL 포함) ===\n");
  
  for (const tourDoc of tournaments.docs) {
    const tourData = tourDoc.data();
    console.log("Tournament:", tourData.name || tourDoc.id);
    
    const events = await db.collection("tournaments").doc(tourDoc.id).collection("events").get();
    
    for (const eventDoc of events.docs) {
      const eventData = eventDoc.data();
      console.log("  Event:", eventData.name || eventDoc.id);
      
      const streams = await db.collection("tournaments").doc(tourDoc.id)
        .collection("events").doc(eventDoc.id)
        .collection("streams").get();
      
      for (const streamDoc of streams.docs) {
        const streamData = streamDoc.data();
        console.log("    Stream ID:", streamDoc.id);
        console.log("    Stream Name:", streamData.name || "No name");
        console.log("      YouTube URL:", streamData.youtubeUrl || streamData.videoUrl || "NONE");
        console.log("      Duration:", streamData.videoDurationSeconds || "unknown");
        console.log("      Pipeline Status:", streamData.pipelineStatus || "none");
        console.log("");
      }
    }
  }
}

findAllStreams().catch(console.error);
