/**
 * 핸드 데이터 이슈 분석
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

async function main() {
  const streamId = "NjO87uMdlqwh4yxWnXVY";

  console.log("=== Day 3 핸드 데이터 분석 ===\n");

  const hands = await db.collection("hands")
    .where("streamId", "==", streamId)
    .get();

  console.log(`총 핸드 수: ${hands.size}개\n`);

  // 1. 핸드 번호 분포 분석
  const handNumbers: number[] = [];
  const handNumberCounts: Record<string, number> = {};

  hands.docs.forEach(doc => {
    const data = doc.data();
    const num = parseInt(data.number, 10);
    handNumbers.push(num);

    const key = String(num);
    handNumberCounts[key] = (handNumberCounts[key] || 0) + 1;
  });

  // 중복 핸드 번호 찾기
  const duplicates = Object.entries(handNumberCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log("=== 1. 핸드 번호 분석 ===");
  console.log(`최소 핸드 번호: ${Math.min(...handNumbers)}`);
  console.log(`최대 핸드 번호: ${Math.max(...handNumbers)}`);
  console.log(`유니크 핸드 번호 수: ${new Set(handNumbers).size}`);
  console.log(`중복 핸드 번호 수: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log("\n중복된 핸드 번호 (상위 10개):");
    duplicates.slice(0, 10).forEach(([num, count]) => {
      console.log(`  Hand #${num}: ${count}회`);
    });
  }

  // 2. 타임스탬프 분포 분석
  console.log("\n=== 2. 타임스탬프 분석 ===");

  const timestamps = hands.docs.map(doc => {
    const data = doc.data();
    return {
      number: data.number,
      start: data.videoTimestampStart,
      end: data.videoTimestampEnd,
    };
  }).sort((a, b) => a.start - b.start);

  const minTime = Math.min(...timestamps.map(t => t.start));
  const maxTime = Math.max(...timestamps.map(t => t.end));

  console.log(`시작 시간: ${formatTime(minTime)} (${minTime}초)`);
  console.log(`종료 시간: ${formatTime(maxTime)} (${maxTime}초)`);
  console.log(`총 분석 구간: ${formatTime(maxTime - minTime)}`);

  // 3. 겹치는 타임스탬프 확인
  console.log("\n=== 3. 겹치는 타임스탬프 확인 ===");

  let overlaps = 0;
  for (let i = 0; i < timestamps.length - 1; i++) {
    const current = timestamps[i];
    const next = timestamps[i + 1];

    if (current.end > next.start) {
      overlaps++;
      if (overlaps <= 5) {
        console.log(`  Hand #${current.number} (${formatTime(current.start)}-${formatTime(current.end)}) 와`);
        console.log(`  Hand #${next.number} (${formatTime(next.start)}-${formatTime(next.end)}) 겹침`);
        console.log("");
      }
    }
  }
  console.log(`겹치는 구간 수: ${overlaps}`);

  // 4. 샘플 핸드 카드 데이터 확인
  console.log("\n=== 4. 샘플 핸드 카드 데이터 ===");

  const sampleHands = hands.docs.slice(0, 5);
  sampleHands.forEach((doc) => {
    const data = doc.data();
    console.log(`\n[Hand #${data.number}]`);
    console.log(`  시간: ${formatTime(data.videoTimestampStart)} - ${formatTime(data.videoTimestampEnd)}`);
    console.log(`  보드: ${JSON.stringify(data.boardFlop)} / ${data.boardTurn} / ${data.boardRiver}`);
    console.log(`  플레이어 수: ${data.players?.length || 0}`);
    if (data.players?.length > 0) {
      data.players.slice(0, 2).forEach((p: any) => {
        console.log(`    - ${p.name}: ${JSON.stringify(p.holeCards)}`);
      });
    }
  });
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("에러:", error);
    process.exit(1);
  });
