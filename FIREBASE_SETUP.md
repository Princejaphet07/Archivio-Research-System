# 🔥 Firebase Setup Guide for ARCHIVIO Research System

## 📋 Prerequisites
- Node.js installed
- Google Account
- Internet connection

---

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**
   ```
   https://console.firebase.google.com/
   ```

2. **Create New Project**
   - Click **"Add project"**
   - Project name: `archivio-research-system`
   - Click **"Continue"**
   - Google Analytics: **Disable** (or enable if you prefer)
   - Click **"Create project"**
   - Wait 30-60 seconds for creation

---

## 🔧 Step 2: Enable Firebase Services

### A. Enable Authentication
1. In left sidebar: **Build** → **Authentication**
2. Click **"Get started"**
3. Click **"Email/Password"** provider
4. **Enable** both toggles (Email/Password & Email link)
5. Click **"Save"**

### B. Enable Firestore Database
1. In left sidebar: **Build** → **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (for development)
4. Choose location: **us-central1** (or your preferred region)
5. Click **"Enable"**
6. Wait for database creation

### C. Enable Storage
1. In left sidebar: **Build** → **Storage**
2. Click **"Get started"**
3. Select **"Start in test mode"**
4. Use default location
5. Click **"Done"**

---

## 📱 Step 3: Register Web Apps

You need to register **5 separate web apps** (one for each system):

### Register Each App:

1. In Project Overview, click **"+ Add app"**
2. Click the **Web icon** (`</>`)
3. Enter app nickname (see list below)
4. **Check** "Also set up Firebase Hosting" ✅
5. Click **"Register app"**
6. **COPY THE CONFIGURATION** - You'll need this!
7. Click **"Continue to console"**

### App Nicknames to Register:
1. ✅ `Research Adviser System`
2. ✅ `Dean System`
3. ✅ `System Administrator`
4. ✅ `Public Archive`
5. ✅ `Student System`

---

## 💻 Step 4: Install Firebase in Each Project

Run these commands in **Windows PowerShell** or **Command Prompt**:

### 1. Research Adviser System
```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\research-adviser-system"
npm install firebase
```

### 2. Dean System
```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\dean-system"
npm install firebase
```

### 3. System Administrator
```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\system-administrator"
npm install firebase
```

### 4. Public Archive
```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\public-archive"
npm install firebase
```

### 5. Student System
```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO"
npm install firebase
```

---

## ⚙️ Step 5: Configure Firebase in Each Project

For each system, you need to update the Firebase config file:

### Location of Config Files:
1. **Research Adviser**: `research-adviser-system/src/firebase/config.js`
2. **Dean System**: `dean-system/src/firebase/config.js`
3. **System Admin**: `system-administrator/src/firebase/config.js`
4. **Public Archive**: `public-archive/src/firebase/config.js`
5. **Student System**: `src/firebase/config.js`

### How to Get Your Config:

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Scroll down to **"Your apps"**
3. Click on the app you want to configure
4. Scroll to **"SDK setup and configuration"**
5. Select **"Config"** option
6. Copy the `firebaseConfig` object

### Example Configuration:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1X2Y3Z4...",
  authDomain: "archivio-research-system.firebaseapp.com",
  projectId: "archivio-research-system",
  storageBucket: "archivio-research-system.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

### Replace in Each Config File:
1. Open the `config.js` file in VS Code
2. Replace the placeholder values with your actual Firebase config
3. Save the file

---

## 🔐 Step 6: Update Firestore Security Rules (Production)

When ready for production, update rules in Firebase Console:

### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Research papers - public read, auth write
    match /research/{researchId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Add more rules as needed
  }
}
```

### Storage Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /research/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📊 Step 7: Create Firestore Collections

Create these collections in Firestore:

1. **users** - User profiles and roles
2. **research** - Research papers/submissions
3. **categories** - Research categories
4. **groups** - Research groups
5. **notifications** - User notifications
6. **requirements** - Submission requirements
7. **activity_logs** - System activity tracking

### How to Create:
1. Go to **Firestore Database**
2. Click **"Start collection"**
3. Enter collection name
4. Add a sample document
5. Click **"Save"**

---

## ✅ Step 8: Test Firebase Connection

Create a test file to verify connection:

### Test File: `src/testFirebase.js`
```javascript
import { auth, db, storage } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';

async function testConnection() {
  try {
    console.log('🔥 Firebase App:', auth.app.name);
    console.log('✅ Auth initialized');
    console.log('✅ Firestore initialized');
    console.log('✅ Storage initialized');
    
    // Test Firestore
    const snapshot = await getDocs(collection(db, 'users'));
    console.log('📊 Firestore connected! Docs:', snapshot.size);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnection();
```

Run test:
```powershell
node src/testFirebase.js
```

---

## 🎯 Quick Reference

### Import Firebase in Your Components:
```javascript
import { auth, db, storage } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
```

### Common Operations:

**Sign Up:**
```javascript
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
```

**Sign In:**
```javascript
const userCredential = await signInWithEmailAndPassword(auth, email, password);
```

**Add Document:**
```javascript
await addDoc(collection(db, 'users'), { name: 'John', role: 'adviser' });
```

**Upload File:**
```javascript
const storageRef = ref(storage, `research/${filename}`);
await uploadBytes(storageRef, file);
```

---

## 🆘 Troubleshooting

### Issue: "Firebase: No Firebase App '[DEFAULT]' has been created"
- **Solution**: Make sure you imported the config file in your component

### Issue: "Permission denied" errors
- **Solution**: Check Firestore/Storage security rules in Firebase Console

### Issue: npm install fails
- **Solution**: Run PowerShell as Administrator
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## 📞 Need Help?

- Firebase Documentation: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com/
- Stack Overflow: Search "Firebase" + your issue

---

## ✨ Next Steps

1. ✅ Complete all 8 steps above
2. 📝 Test authentication in each system
3. 🗄️ Set up Firestore collections structure
4. 🔒 Update security rules for production
5. 🚀 Start building your features!

---

**Created for ARCHIVIO Research System**
**Good luck with your Firebase backend! 🔥**
