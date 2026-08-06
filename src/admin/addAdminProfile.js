// ADD ADMIN PROFILE TO EXISTING FIREBASE USER
// Run this after manually creating user in Firebase Console
// Command: node src/addAdminProfile.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
const auth = getAuth(app);
const db = getFirestore(app);

// YOUR ADMIN CREDENTIALS
const ADMIN_EMAIL = 'japhetvender00@gmail.com';
const ADMIN_PASSWORD = '23571113';
const ADMIN_NAME = 'Pronce Japhet Vender';
const ADMIN_DEPARTMENT = 'Information Technology';

async function addAdminProfile() {
  console.log('🔥 Adding Admin Profile to Firestore');
  console.log('====================================\n');

  try {
    // Step 1: Sign in to get the UID
    console.log('🔐 Signing in to get user UID...');
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const user = userCredential.user;
    
    console.log('✅ Signed in successfully!');
    console.log('   Email:', user.email);
    console.log('   UID:', user.uid);
    console.log('');

    // Step 2: Create Admin Profile in Firestore
    console.log('📊 Creating admin profile in Firestore...');
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
    
    console.log('✅ Admin profile created in Firestore!');
    console.log('');

    // Step 3: Create initial collections
    console.log('📦 Creating initial Firestore collections...');

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
    console.log('  ✅ departments');

    // Create categories collection
    await setDoc(doc(db, 'categories', 'cat-ml'), {
      id: 'cat-ml',
      name: 'Machine Learning',
      icon: '🤖',
      color: '#7a2e46',
      description: 'AI and Machine Learning research',
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ categories');

    // Create research collection
    await setDoc(doc(db, 'research', '_init'), {
      _note: 'Placeholder to initialize collection',
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ research');

    // Create settings collection
    await setDoc(doc(db, 'settings', 'system'), {
      systemName: 'ARCHIVIO Research Management System',
      institution: 'Southwestern University PHINMA',
      currentSchoolYear: '2026-2027',
      emailDomain: '@swu.phinma.edu.ph',
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ settings');

    console.log('');
    console.log('====================================');
    console.log('🎉 SETUP COMPLETE!');
    console.log('====================================');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   UID:', user.uid);
    console.log('   Role: System Administrator');
    console.log('');
    console.log('🚀 You can now login to the System Administrator portal!');

    // Sign out
    await signOut(auth);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    
    if (error.code === 'auth/wrong-password') {
      console.log('⚠️  Wrong password. Please check your password.');
    } else if (error.code === 'auth/user-not-found') {
      console.log('⚠️  User not found. Please create the user in Firebase Console first.');
    } else if (error.code === 'permission-denied') {
      console.log('⚠️  Firestore permission denied.');
      console.log('   Make sure Firestore is in TEST MODE in Firebase Console.');
    }
  }

  process.exit(0);
}

addAdminProfile();
