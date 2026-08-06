// CREATE ADMIN PROFILE IN FIRESTORE
// Run this to create the Firestore profile for your existing admin account
// Command: node src/createAdminProfile.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBWU7Mlk0Xykqtvb_gpuweLOv3VEtAp-AA",
  authDomain: "archivio-research-system.firebaseapp.com",
  projectId: "archivio-research-system",
  storageBucket: "archivio-research-system.firebasestorage.app",
  messagingSenderId: "798013707409",
  appId: "1:798013707409:web:59f945fa69fe5321265b30",
  measurementId: "G-8LNQMPEYC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// YOUR ADMIN DETAILS
const ADMIN_UID = 'USLjA9IilNPfWA5VOcMBuT0XCxW2'; // Your Firebase Auth UID
const ADMIN_EMAIL = 'prdo.vender.swu@phinmaed.com';
const ADMIN_NAME = 'Pronce Japhet Vender';
const ADMIN_DEPARTMENT = 'Information Technology';

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
