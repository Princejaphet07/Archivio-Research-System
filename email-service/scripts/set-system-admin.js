const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

const ADMIN_EMAIL = 'archivio.admin@gmail.com';
const ADMIN_PASSWORD = '#Archivio_2026';
const ADMIN_NAME = 'Prince Japhet Vender';
const OLD_ADMIN_EMAIL = 'japhetvender00@gmail.com';

async function setSystemAdmin() {
  console.log('====================================================');
  console.log('🔧 Setting role to "admin" (System Administrator)');
  console.log('====================================================');

  const adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
  const uid = adminUser.uid;
  console.log(`Target Admin UID: ${uid}`);

  // 1. Update Firebase Auth display name and verify email
  await auth.updateUser(uid, {
    displayName: ADMIN_NAME,
    emailVerified: true
  });
  console.log('✅ Firebase Auth display name updated to:', ADMIN_NAME);

  // 2. Set role: 'admin' (System Administrator) in users collection
  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    uid: uid,
    email: ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'admin', // MUST BE 'admin', NOT 'super-admin'
    department: 'Information Technology',
    status: 'active',
    updatedAt: new Date().toISOString(),
    permissions: {
      manageDeans: true,
      manageAdvisers: true,
      manageStudents: true,
      manageDepartments: true,
      viewReports: true,
      systemSettings: true,
      userManagement: true
    }
  }, { merge: true });
  console.log('✅ users collection set to role: "admin" with full Administrator permissions');

  // 3. Remove from super_admins collection so they are NOT restricted to View-Only!
  try {
    await db.collection('super_admins').doc(uid).delete();
    console.log(`✅ Removed ${uid} from super_admins collection`);
  } catch (e) {
    console.log('super_admins doc delete note:', e.message);
  }

  // Also remove any super_admin doc with this email or old email
  const saQuery = await db.collection('super_admins').where('email', '==', ADMIN_EMAIL).get();
  for (const doc of saQuery.docs) {
    await doc.ref.delete();
    console.log(`✅ Deleted super_admins doc: ${doc.id}`);
  }
  const saOldQuery = await db.collection('super_admins').where('email', '==', OLD_ADMIN_EMAIL).get();
  for (const doc of saOldQuery.docs) {
    await doc.ref.delete();
    console.log(`✅ Deleted old super_admins doc: ${doc.id}`);
  }

  // 4. Ensure admins collection has archivio.admin@gmail.com with role: 'admin'
  await db.collection('admins').doc(ADMIN_EMAIL).set({
    uid: uid,
    email: ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'admin',
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`✅ admins/${ADMIN_EMAIL} recorded with role: 'admin'`);

  // Delete old admin doc if present
  try {
    await db.collection('admins').doc(OLD_ADMIN_EMAIL).delete();
    console.log(`✅ Removed ${OLD_ADMIN_EMAIL} from admins collection`);
  } catch (e) {}

  console.log('\n🎉 SUCCESS: System Administrator profile completely restored to full "admin" privileges!');
}

async function runWithRetry() {
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      console.log(`Attempt ${attempts}...`);
      await setSystemAdmin();
      process.exit(0);
    } catch (err) {
      console.error(`Attempt ${attempts} failed:`, err.message || err);
      if (attempts >= 5) {
        process.exit(1);
      }
      console.log('Retrying in 2 seconds...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

runWithRetry();
