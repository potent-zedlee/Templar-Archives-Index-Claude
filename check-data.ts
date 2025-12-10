
import 'dotenv/config';
import { adminFirestore } from './lib/db/firebase-admin';

async function listAllStreams() {
    console.log('Listing ALL streams to check casing...');
    try {
        const snapshot = await adminFirestore.collectionGroup('streams').limit(20).get();
        if (snapshot.empty) {
            console.log('No streams found.');
        } else {
            snapshot.forEach(doc => {
                console.log(`- ID: ${doc.id}, Name: "${doc.data().name}"`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listAllStreams();
