const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkPresence() {
  const email = 'prdo.vender.swu@phinmaed.com';
  const q = await db.collection('users').where('email', '==', email).get();
  
  if (q.empty) {
    console.log('No user document found for', email);
  } else {
    const data = q.docs[0].data();
    console.log('User document:', data);
    console.log('Last active date:', data.lastActive ? data.lastActive.toDate() : 'none');
    console.log('Current date:', new Date());
  }
  process.exit(0);
}

checkPresence();
