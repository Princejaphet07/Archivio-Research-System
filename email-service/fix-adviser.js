const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function fixAdviser() {
  const email = 'prdo.vender.swu@phinmaed.com';
  console.log(`Looking up user by email: ${email}`);
  
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found UID: ${userRecord.uid}`);
    
    // Check if they are in advisers collection
    const snapshot = await db.collection('advisers').where('email', '==', email).get();
    let dept = '';
    let displayName = 'Prince Japhet Vender';
    
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      dept = data.department || '';
      displayName = data.displayName || displayName;
    }
    
    // Create the users document
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'adviser',
      department: dept,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    
    console.log('Successfully created users document!');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  process.exit(0);
}

fixAdviser();
