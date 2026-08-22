import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./firebase-service-account.json');

const firebaseAdmin = admin.default || admin;

if (!firebaseAdmin.apps?.length) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
  });
}

const db = firebaseAdmin.firestore();

async function checkData() {
  const groupsSnap = await db.collection('groups').get();
  console.log("=== GROUPS ===");
  groupsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}, Name: ${d.groupName}, Leader: ${d.leaderName}, LeaderUID: ${d.leaderUid}, Status: ${d.status}`);
  });

  const subsSnap = await db.collection('submissions').get();
  console.log("\\n=== SUBMISSIONS ===");
  subsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id}, Group: ${d.groupName}, StudentUID: ${d.studentUid}, reviewStatus: ${d.reviewStatus}`);
  });

  process.exit(0);
}

checkData();
