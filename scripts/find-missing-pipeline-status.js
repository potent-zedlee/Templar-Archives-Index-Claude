require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  // GOOGLE_APPLICATION_CREDENTIALS 파일 경로 사용
  const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findStreamsWithoutPipelineStatus() {
  console.log('=== Searching for streams without pipelineStatus ===\n');

  const tournamentsRef = db.collection('tournaments');
  const tournaments = await tournamentsRef.get();

  const streamsToUpdate = [];

  for (const tournament of tournaments.docs) {
    const tournamentData = tournament.data();

    const eventsRef = tournament.ref.collection('events');
    const events = await eventsRef.get();

    for (const event of events.docs) {
      const eventData = event.data();

      const streamsRef = event.ref.collection('streams');
      const streams = await streamsRef.get();

      for (const stream of streams.docs) {
        const data = stream.data();

        // pipelineStatus가 없는 스트림 찾기
        if (!data.pipelineStatus) {
          console.log(`Found stream without pipelineStatus:`);
          console.log(`  Tournament: ${tournamentData.name}`);
          console.log(`  Event: ${eventData.name}`);
          console.log(`  Stream ID: ${stream.id}`);
          console.log(`  Stream Name: ${data.name}`);
          console.log(`  Video File: ${data.videoFile}`);
          console.log(`  Upload Status: ${data.uploadStatus}`);
          console.log(`  Path: tournaments/${tournament.id}/events/${event.id}/streams/${stream.id}`);
          console.log('');

          streamsToUpdate.push({
            path: `tournaments/${tournament.id}/events/${event.id}/streams/${stream.id}`,
            ref: stream.ref,
            tournamentName: tournamentData.name,
            eventName: eventData.name,
            streamName: data.name
          });
        }
      }
    }
  }

  console.log(`\n=== Found ${streamsToUpdate.length} streams without pipelineStatus ===\n`);

  if (streamsToUpdate.length > 0) {
    console.log('Updating streams with pipelineStatus: "pending"...\n');

    for (const stream of streamsToUpdate) {
      await stream.ref.update({
        pipelineStatus: 'pending',
        pipelineProgress: 0,
        pipelineUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        analysisAttempts: 0
      });
      console.log(`✓ Updated: ${stream.streamName} (${stream.tournamentName} > ${stream.eventName})`);
    }

    console.log('\n=== All streams updated! ===');
  }
}

findStreamsWithoutPipelineStatus()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
