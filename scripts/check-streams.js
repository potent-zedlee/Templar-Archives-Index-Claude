require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkRecentStreams() {
  const tournamentsSnapshot = await db.collection('tournaments')
    .where('name', '==', 'EPT Barcelona 2025')
    .limit(5)
    .get();

  for (const tournamentDoc of tournamentsSnapshot.docs) {
    console.log('Tournament:', tournamentDoc.id, '-', tournamentDoc.data().name);

    const eventsSnapshot = await tournamentDoc.ref.collection('events').get();

    for (const eventDoc of eventsSnapshot.docs) {
      console.log('  Event:', eventDoc.id, '-', eventDoc.data().name);

      const streamsSnapshot = await eventDoc.ref.collection('streams').get();

      for (const streamDoc of streamsSnapshot.docs) {
        const data = streamDoc.data();
        console.log('    Stream:', streamDoc.id);
        console.log('      name:', data.name);
        console.log('      uploadStatus:', data.uploadStatus);
        console.log('      pipelineStatus:', data.pipelineStatus);
        console.log('      gcsUri:', data.gcsUri || 'N/A');
        console.log('');
      }
    }
  }
}

checkRecentStreams().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
