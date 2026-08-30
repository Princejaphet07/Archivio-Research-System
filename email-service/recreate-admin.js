const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

// ✅ ADMIN CREDENTIALS
const adminEmail    = 'venderadmin@gmail.com';
const adminPassword = '23571113';
const adminName     = 'Pronce Japhet Vender';

async function recreateAdmin() {
  console.log('🔄 Recreating admin account...');

  let uid;

  // 1. Try to find existing auth account first
  try {
    const existing = await auth.getUserByEmail(adminEmail);
    uid = existing.uid;
    console.log(`✅ Auth account already exists. UID: ${uid}`);
  } catch (e) {
    // 2. Doesn't exist — create it
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    });
    uid = userRecord.uid;
    console.log(`✅ Auth account created! UID: ${uid}`);
  }

  // 3. Recreate Firestore profile
  await db.collection('users').doc(uid).set({
    uid,
    email: adminEmail,
    displayName: adminName,
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    permissions: {
      manageDeans: true,
      manageAdvisers: true,
      manageStudents: true,
      manageDepartments: true,
      viewReports: true,
      systemSettings: true
    }
  });

  console.log('✅ Firestore profile recreated!');
  console.log('');
  console.log('🎉 Done! Admin account is ready.');
  console.log('📧 Email   :', adminEmail);
  console.log('🔑 Password:', adminPassword);
  console.log('You can now log in to the System Administrator dashboard.');

  process.exit(0);
}

recreateAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
