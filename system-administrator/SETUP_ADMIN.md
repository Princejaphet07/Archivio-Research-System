# 👨‍💼 Hardcoded Admin Setup - Quick Guide

## 🎯 What This Does

This automated script will:
- ✅ Create your admin account in Firebase Authentication
- ✅ Create your admin profile in Firestore
- ✅ Automatically create all necessary Firestore collections
- ✅ Add sample data to get you started

---

## 📋 Prerequisites

1. ✅ Firebase project created: `archivio-research-system`
2. ✅ **Authentication enabled** (Email/Password)
3. ✅ **Firestore created in TEST MODE**
4. ✅ Firebase installed in system-administrator folder

---

## 🔥 Step 1: Enable Firebase Services

### A. Enable Authentication:
1. Go to Firebase Console → Authentication
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Click "Save"

### B. Create Firestore (TEST MODE):
1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. **IMPORTANT:** Select **"Start in test mode"** ✅
4. Choose location: **asia-southeast1** (Singapore)
5. Click "Enable"

---

## ⚙️ Step 2: Customize Your Credentials

Open: `src/setupAdminAccount.js`

Change these lines (around line 25-28):

```javascript
const ADMIN_EMAIL = 'venderadmin@gmail.com';     // Your email
const ADMIN_PASSWORD = 'Admin123!@#';             // Your password (min 6 chars)
const ADMIN_NAME = 'Pronce Japhet Vender';        // Your full name
const ADMIN_DEPARTMENT = 'Information Technology'; // Your department
```

**⚠️ Make sure to use a STRONG password!**

---

## 🚀 Step 3: Run the Setup Script

Open terminal in `system-administrator` folder:

```cmd
cd C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\system-administrator
npm run setup-admin
```

You should see:

```
🔥 ARCHIVIO Admin Account Setup
================================

📧 Step 1: Creating authentication account...
✅ Auth account created!
   UID: abc123...
   Email: venderadmin@gmail.com

📊 Step 2: Creating admin profile in Firestore...
✅ Admin profile created in users collection!

📦 Step 3: Creating Firestore collections...
✅ Created collection: departments
✅ Created collection: categories
✅ Created collection: research
✅ Created collection: groups
✅ Created collection: notifications
✅ Created collection: settings

================================
🎉 SETUP COMPLETE!
================================

📋 Your Admin Credentials:
   Email: venderadmin@gmail.com
   Password: Admin123!@#
   UID: abc123...
   Role: System Administrator

✅ Collections Created:
   - users
   - departments
   - categories
   - research
   - groups
   - notifications
   - settings

🚀 You can now login to the System Administrator portal!
```

---

## 🎉 Step 4: Test Your Login

1. Start the development server:
   ```cmd
   npm run dev
   ```

2. Open browser to: `http://localhost:5173`

3. Login with your credentials:
   - **Email:** `venderadmin@gmail.com` (or what you set)
   - **Password:** `Admin123!@#` (or what you set)

4. You should be redirected to the Dashboard! 🎊

---

## 🔐 Step 5: Secure Your System (IMPORTANT!)

After successful setup:

1. ✅ **Save your credentials securely**
2. ✅ **Delete** `src/setupAdminAccount.js` (contains hardcoded password)
3. ✅ Update Firestore rules to PRODUCTION mode

### Production Firestore Rules:

Go to Firestore → Rules tab, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to get user data
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper function to check user role
    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }
    
    function isDean() {
      return isAuthenticated() && getUserData().role == 'dean';
    }
    
    function isAdviser() {
      return isAuthenticated() && getUserData().role == 'adviser';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Departments
    match /departments/{deptId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Categories
    match /categories/{catId} {
      allow read: if true; // Public read
      allow write: if isAdmin() || isDean();
    }
    
    // Research submissions
    match /research/{researchId} {
      allow read: if true; // Public can read published
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin() || isDean() || isAdviser();
    }
    
    // Groups
    match /groups/{groupId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }
    
    // Notifications
    match /notifications/{notifId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // System settings
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

Click **"Publish"**

---

## 🆘 Troubleshooting

### Error: "Email already in use"
**Solution:** Delete the existing user in Firebase Console → Authentication → Users

### Error: "Permission denied" 
**Solution:** Make sure Firestore is in **TEST MODE**

### Error: "Firebase not found"
**Solution:** Run `npm install firebase` in the system-administrator folder

### Script doesn't run
**Solution:** Make sure you're in the right folder:
```cmd
cd C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\system-administrator
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Can see user in Firebase Authentication
- [ ] Can see your profile in Firestore `users` collection
- [ ] All 7 collections created in Firestore
- [ ] Can login to System Administrator dashboard
- [ ] Redirected to dashboard after login

---

## 🎯 What's Next?

After successful login:

1. ✅ Create your first Dean account
2. ✅ Configure departments and programs
3. ✅ Set up research categories
4. ✅ Invite advisers
5. ✅ Start managing the system!

---

**Good luck! 🚀**
