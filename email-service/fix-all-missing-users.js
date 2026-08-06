const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function fixMissingUsers() {
  console.log('Finding Firebase Auth users missing from the users collection...');
  let pageToken;
  
  try {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    const users = listUsersResult.users;
    
    for (const authUser of users) {
      const userRef = db.collection('users').doc(authUser.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log(`Missing user document for ${authUser.email} (UID: ${authUser.uid})`);
        
        let role = 'student';
        let department = '';
        let displayName = authUser.displayName || authUser.email;
        
        // Check if student
        const studentSnap = await db.collection('students').where('email', '==', authUser.email).get();
        if (!studentSnap.empty) {
          role = 'student';
          department = studentSnap.docs[0].data().department || '';
          displayName = studentSnap.docs[0].data().displayName || displayName;
        } else {
          // Check if adviser
          const adviserSnap = await db.collection('advisers').where('email', '==', authUser.email).get();
          if (!adviserSnap.empty) {
            role = 'adviser';
            department = adviserSnap.docs[0].data().department || '';
            displayName = adviserSnap.docs[0].data().displayName || displayName;
          }
        }
        
        await userRef.set({
          uid: authUser.uid,
          email: authUser.email,
          displayName: displayName,
          role: role,
          department: department,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        
        console.log(`- Created users doc for ${authUser.email} with role: ${role}`);
      }
    }
    
    console.log('Finished fixing missing users!');
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  process.exit(0);
}

fixMissingUsers();
