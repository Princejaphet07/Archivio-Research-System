const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function wipeCollections() {
  console.log('Starting wipe of orphaned data...');
  const collections = ['groups', 'submissions', 'requirements', 'studentInvitations', 'activity_logs', 'systemLogs', 'notifications'];
  
  for (const col of collections) {
    console.log(`Wiping collection: ${col}`);
    const snapshot = await db.collection(col).get();
    
    if (snapshot.empty) {
      console.log(`- ${col} is already empty.`);
      continue;
    }
    
    // Firestore batches can only have 500 operations, but since this is for testing, there shouldn't be more than 500.
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`- Deleted ${snapshot.size} documents from ${col}.`);
  }
  
  console.log('Wipe complete!');
  process.exit(0);
}

wipeCollections().catch(console.error);
