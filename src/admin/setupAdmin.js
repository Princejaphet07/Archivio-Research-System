// Setup Script - Create System Administrator Account
// Run this ONCE to create your admin account

import { auth, db } from './firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

async function createAdminAccount() {
  try {
    // CHANGE THESE TO YOUR DETAILS
    const adminEmail = 'venderadmin@gmail.com'; // Your admin email
    const adminPassword = '23571113'; // Your secure password
    const adminName = 'Pronce Japhet Vender'; // Your name

    console.log('🔥 Creating admin account...');

    // Step 1: Create authentication account
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      adminEmail, 
      adminPassword
    );

    const user = userCredential.user;
    console.log('✅ Auth account created! UID:', user.uid);

    // Step 2: Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: adminEmail,
      displayName: adminName,
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
      permissions: {
        manageDeans: true,
        manageAdvisers: true,
        manageStudents: true,
        manageDepartments: true,
        viewReports: true,
        systemSettings: true
      }
    });

    console.log('✅ User profile created in Firestore!');
    console.log('🎉 Admin account setup complete!');
    console.log('');
    console.log('📋 Your Admin Credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('UID:', user.uid);
    console.log('');
    console.log('⚠️ IMPORTANT: Save these credentials securely!');
    console.log('You can now login to the System Administrator dashboard.');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ This email is already registered.');
    } else if (error.code === 'auth/weak-password') {
      console.log('⚠️ Password is too weak. Use at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('⚠️ Invalid email format.');
    }
  }
}

// Run the setup
createAdminAccount();
