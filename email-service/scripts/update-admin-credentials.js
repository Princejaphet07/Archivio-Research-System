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

const OLD_ADMIN_EMAIL = 'japhetvender00@gmail.com';
const NEW_ADMIN_EMAIL = 'archivio.admin@gmail.com';
const NEW_ADMIN_PASSWORD = '#Archivio_2026';
const ADMIN_NAME = 'Prince Japhet Vender (Administrator)';

async function updateAdminCredentials() {
  console.log('====================================================');
  console.log('🔐 Updating ARCHIVIO Admin Credentials in Firebase');
  console.log('====================================================');

  let adminUser = null;

  // 1. Check if NEW_ADMIN_EMAIL already exists in Firebase Auth
  try {
    adminUser = await auth.getUserByEmail(NEW_ADMIN_EMAIL);
    console.log(`ℹ️ User with new email (${NEW_ADMIN_EMAIL}) already exists. UID: ${adminUser.uid}`);
    // Update password & displayName
    await auth.updateUser(adminUser.uid, {
      password: NEW_ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
      emailVerified: true
    });
    console.log(`✅ Updated password and profile for ${NEW_ADMIN_EMAIL}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`ℹ️ ${NEW_ADMIN_EMAIL} not found yet in Firebase Auth.`);
    } else {
      console.error('Error checking new email:', err);
    }
  }

  // 2. If not found, check if OLD_ADMIN_EMAIL exists in Firebase Auth
  if (!adminUser) {
    try {
      const oldUser = await auth.getUserByEmail(OLD_ADMIN_EMAIL);
      console.log(`ℹ️ Found old admin account (${OLD_ADMIN_EMAIL}). UID: ${oldUser.uid}`);
      // Migrate old account to new email and new password
      adminUser = await auth.updateUser(oldUser.uid, {
        email: NEW_ADMIN_EMAIL,
        password: NEW_ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true
      });
      console.log(`✅ Successfully updated Firebase Auth email from ${OLD_ADMIN_EMAIL} to ${NEW_ADMIN_EMAIL}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`ℹ️ ${OLD_ADMIN_EMAIL} not found in Firebase Auth either.`);
      } else {
        console.error('Error checking old email:', err);
      }
    }
  }

  // 3. If neither exists, create fresh user in Firebase Auth
  if (!adminUser) {
    console.log(`✨ Creating fresh Firebase Auth user: ${NEW_ADMIN_EMAIL}`);
    adminUser = await auth.createUser({
      email: NEW_ADMIN_EMAIL,
      password: NEW_ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
      emailVerified: true
    });
    console.log(`✅ Created user in Firebase Auth! UID: ${adminUser.uid}`);
  }

  const uid = adminUser.uid;
  console.log(`\n📌 Target Admin UID: ${uid}`);

  // 4. Update Firestore `users` collection
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const existingData = userSnap.exists ? userSnap.data() : {};

  const updatedUserData = {
    ...existingData,
    uid: uid,
    email: NEW_ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'super-admin',
    department: existingData.department || 'Information Technology',
    status: 'active',
    updatedAt: new Date().toISOString(),
    permissions: {
      ...(existingData.permissions || {}),
      manageDeans: true,
      manageAdvisers: true,
      manageStudents: true,
      manageDepartments: true,
      viewReports: true,
      systemSettings: true,
      superAdminSettings: true
    }
  };

  if (!existingData.createdAt) {
    updatedUserData.createdAt = new Date().toISOString();
  }

  await userRef.set(updatedUserData, { merge: true });
  console.log(`✅ Updated Firestore doc in 'users/${uid}' with email: ${NEW_ADMIN_EMAIL} and role: super-admin`);

  // 5. Update Firestore `super_admins` collection (by UID and by email query support)
  await db.collection('super_admins').doc(uid).set({
    uid: uid,
    email: NEW_ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'super-admin',
    status: 'active',
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`✅ Ensured Firestore doc in 'super_admins/${uid}' exists.`);

  // 6. Update Firestore `admins` collection (by email doc ID if used in backend)
  await db.collection('admins').doc(NEW_ADMIN_EMAIL).set({
    uid: uid,
    email: NEW_ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    role: 'super-admin',
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`✅ Ensured Firestore doc in 'admins/${NEW_ADMIN_EMAIL}' exists.`);

  console.log('\n====================================================');
  console.log('🎉 SUCCESS: Admin credentials completely updated!');
  console.log(`📧 New Email    : ${NEW_ADMIN_EMAIL}`);
  console.log(`🔑 New Password : ${NEW_ADMIN_PASSWORD}`);
  console.log(`🆔 Admin UID    : ${uid}`);
  console.log('====================================================\n');
}

updateAdminCredentials()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to update admin credentials:', err);
    process.exit(1);
  });
