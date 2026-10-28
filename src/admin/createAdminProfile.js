// CREATE ADMIN PROFILE IN FIRESTORE
// Usage: ADMIN_UID=... ADMIN_EMAIL=... node src/admin/createAdminProfile.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../firebase/config.js';

// Initialize Firebase using centralized config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ADMIN DETAILS (Loaded securely from env)
const ADMIN_UID = process.env.ADMIN_UID || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swu.phinma.edu.ph';
const ADMIN_NAME = process.env.ADMIN_NAME || 'ARCHIVIO System Administrator';
const ADMIN_DEPARTMENT = process.env.ADMIN_DEPARTMENT || 'Information Technology';

async function createAdminProfile() {
  console.log('🔥 Creating Admin Profile in Firestore');
  console.log('======================================\n');

  try {
    // Create Admin Profile in Firestore
    console.log('📊 Creating admin profile...');
    console.log('   UID:', ADMIN_UID);
    console.log('   Email:', ADMIN_EMAIL);
    console.log('');

    await setDoc(doc(db, 'users', ADMIN_UID), {
      uid: ADMIN_UID,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: 'admin',
      department: ADMIN_DEPARTMENT,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: {
        manageDeans: true,
        manageAdvisers: true,
        manageStudents: true,
        manageDepartments: true,
        viewReports: true,
        systemSettings: true,
        manageCategories: true
      },
      profile: {
        firstName: ADMIN_NAME.split(' ')[0],
        lastName: ADMIN_NAME.split(' ').slice(1).join(' '),
        position: 'System Administrator'
      }
    });

    console.log('✅ Admin profile created successfully!');
    console.log('');
    console.log('🎉 DONE!');
    console.log('======================================');
    console.log('');
    console.log('You can now login with:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password: 23571113');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('⚠️  Firestore permission denied.');
      console.log('   Solution: Make sure Firestore is in TEST MODE.');
    }
  }

  process.exit(0);
}

createAdminProfile();
