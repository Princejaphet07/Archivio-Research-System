// HARDCODED ADMIN ACCOUNT SETUP
// Run this script ONCE to create your admin account and Firestore collections
// Command: node src/setupAdminAccount.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';

// Firebase Config (hardcoded)
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
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// HARDCODED ADMIN CREDENTIALS
// ⚠️ CHANGE THESE TO YOUR DETAILS!
// ============================================
const ADMIN_EMAIL = 'prdo.vender.swu@phinmaed.com';
const ADMIN_PASSWORD = '23571113';
const ADMIN_NAME = 'Pronce Japhet Vender';
const ADMIN_DEPARTMENT = 'Information Technology';

async function setupAdminAccount() {
  console.log('🔥 ARCHIVIO Admin Account Setup');
  console.log('================================\n');

  try {
    // Step 1: Create Authentication Account
    console.log('📧 Step 1: Creating authentication account...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );
    const user = userCredential.user;
    console.log('✅ Auth account created!');
    console.log('   UID:', user.uid);
    console.log('   Email:', user.email);
    console.log('');

    // Step 2: Create Admin Profile in Firestore
    console.log('📊 Step 2: Creating admin profile in Firestore...');
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
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
    console.log('✅ Admin profile created in users collection!');
    console.log('');

    // Step 3: Create Initial Collections with Sample Data
    console.log('📦 Step 3: Creating Firestore collections...');

    // Create departments collection
    await setDoc(doc(db, 'departments', 'dept-it'), {
      id: 'dept-it',
      name: 'College of Information Technology',
      shortName: 'CIT',
      programs: ['BSIT', 'BSCS', 'BSIS'],
      dean: null,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: departments');

    // Create categories collection
    await setDoc(doc(db, 'categories', 'cat-ml'), {
      id: 'cat-ml',
      name: 'Machine Learning',
      icon: '🤖',
      color: '#7a2e46',
      description: 'AI and Machine Learning research',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: categories');

    // Create research collection (empty, ready for submissions)
    await setDoc(doc(db, 'research', '_init'), {
      _note: 'This is a placeholder document to create the collection',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: research');

    // Create groups collection
    await setDoc(doc(db, 'groups', '_init'), {
      _note: 'This is a placeholder document to create the collection',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: groups');

    // Create notifications collection
    await setDoc(doc(db, 'notifications', '_init'), {
      _note: 'This is a placeholder document to create the collection',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: notifications');

    // Create settings collection
    await setDoc(doc(db, 'settings', 'system'), {
      systemName: 'ARCHIVIO Research Management System',
      institution: 'Southwestern University PHINMA',
      currentSchoolYear: '2026-2027',
      emailDomain: '@swu.phinma.edu.ph',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Created collection: settings');

    console.log('');
    console.log('================================');
    console.log('🎉 SETUP COMPLETE!');
    console.log('================================');
    console.log('');
    console.log('📋 Your Admin Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   UID:', user.uid);
    console.log('   Role: System Administrator');
    console.log('');
    console.log('✅ Collections Created:');
    console.log('   - users');
    console.log('   - departments');
    console.log('   - categories');
    console.log('   - research');
    console.log('   - groups');
    console.log('   - notifications');
    console.log('   - settings');
    console.log('');
    console.log('🚀 You can now login to the System Administrator portal!');
    console.log('');
    console.log('⚠️  IMPORTANT: Save these credentials securely!');
    console.log('⚠️  Delete this file after setup for security!');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  Email already registered in Firebase Authentication.');
      console.log('   Solution: Use Firebase Console to delete the existing user first.');
    } else if (error.code === 'auth/weak-password') {
      console.log('⚠️  Password is too weak. Use at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('⚠️  Invalid email format.');
    } else if (error.code === 'permission-denied') {
      console.log('⚠️  Firestore permission denied.');
      console.log('   Solution: Make sure Firestore is in TEST MODE.');
    }
  }

  process.exit(0);
}

// Run the setup
setupAdminAccount();
