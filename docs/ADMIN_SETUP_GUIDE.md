# ðŸ‘¨â€ðŸ’¼ System Administrator Account Setup Guide

## ðŸŽ¯ Goal
Create your personal System Administrator account to manage the entire ARCHIVIO system.

---

## ðŸ“‹ Prerequisites Checklist

Before starting, make sure:
- âœ… Firebase project created: `archivio-research-system`
- âœ… Firebase installed in system-administrator folder
- âœ… Firebase config file updated with your credentials
- âœ… Internet connection

---

## ðŸ”¥ Step 1: Enable Firebase Authentication

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: **archivio-research-system**
3. Click **"Authentication"** in left sidebar
4. Click **"Get started"**
5. Under "Sign-in method", click **"Email/Password"**
6. **Enable** the first toggle (Email/Password)
7. Click **"Save"**

**âœ… Screenshot:** You should see "Email/Password" status as "Enabled"

---

## ðŸ”¥ Step 2: Create Firestore Database

1. Click **"Firestore Database"** in left sidebar
2. Click **"Create database"**
3. Select **"Start in test mode"** âœ…
4. Click **"Next"**
5. Choose location: **asia-southeast1** (Singapore - closest to Philippines)
6. Click **"Enable"**
7. Wait 1-2 minutes for creation

**âœ… You should see:** Empty database with "Start collection" button

---

## ðŸ”¥ Step 3: Create Firestore Collections

Click **"Start collection"** and create these collections:

### Collection 1: `users`
- Collection ID: `users`
- Click "Next"
- Add first document:
  - Document ID: **Auto-ID**
  - Add fields:
    ```
    Field: email          Type: string    Value: (leave empty for now)
    Field: role           Type: string    Value: admin
    Field: displayName    Type: string    Value: (leave empty for now)
    Field: createdAt      Type: timestamp Value: (current time)
    Field: status         Type: string    Value: active
    ```
- Click **"Save"**

### Collection 2: `research`
- Collection ID: `research`
- Add empty document (we'll add real data later)

### Collection 3: `departments`
- Collection ID: `departments`
- Add empty document

---

## ðŸ”¥ Step 4: Enable Firebase Storage

1. Click **"Storage"** in left sidebar
2. Click **"Get started"**
3. Select **"Start in test mode"**
4. Click **"Next"**
5. Use same location as Firestore
6. Click **"Done"**

---

## ðŸ‘¨â€ðŸ’¼ Step 5: Create Your Admin Account

### **Option A: Using Firebase Console (Recommended for First Admin)**

1. Go to **Authentication** â†’ **Users** tab
2. Click **"Add user"** button
3. Fill in your details:
   ```
   Email: your-admin-email@example.com
   Password: YourSecurePassword123!
   ```
4. Click **"Add user"**
5. **IMPORTANT:** Copy the **User UID** (looks like: `abc123def456...`)

---

### **Option B: Using the Setup Script**

1. Open: `system-administrator/src/setupAdmin.js`
2. Change these lines (around line 10-12):
   ```javascript
   const adminEmail = 'admin@swu.phinma.edu.ph'; // Your email
   const adminPassword = 'Admin123!@#'; // Your password
   const adminName = 'Pronce Japhet Vender'; // Your name
   ```
3. Open terminal in `system-administrator` folder:
   ```cmd
   cd system-administrator
   node src/setupAdmin.js
   ```
4. You should see:
   ```
   âœ… Auth account created! UID: abc123...
   âœ… User profile created in Firestore!
   ðŸŽ‰ Admin account setup complete!
   ```

---

## ðŸ”¥ Step 6: Add Admin Profile to Firestore

1. Go to **Firestore Database**
2. Click on **"users"** collection
3. Click **"Add document"**
4. Set Document ID to your **User UID** from Step 5
5. Add these fields:

```
uid:          string    â†’ Your User UID (same as document ID)
email:        string    â†’ your-admin-email@example.com
displayName:  string    â†’ Your Full Name
role:         string    â†’ admin
status:       string    â†’ active
createdAt:    timestamp â†’ Click "Set to current time"
```

6. Click **"Save"**

---

## ðŸŽ‰ Step 7: Test Your Admin Login

1. Go to your System Administrator folder:
   ```cmd
   cd C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\system-administrator
   ```

2. Start the development server:
   ```cmd
   npm run dev
   ```

3. Open browser to: `http://localhost:5173` (or the URL shown)

4. Login with your credentials:
   - Email: `your-admin-email@example.com`
   - Password: `YourSecurePassword123!`

5. You should be redirected to the Dashboard!

---

## ðŸ” Security Rules (Important!)

After creating your admin account, update Firestore rules:

1. Go to **Firestore Database** â†’ **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Anyone can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only admins can write
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Research papers
    match /research/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Departments
    match /departments/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

3. Click **"Publish"**

---

## âœ… Verification Checklist

After completing all steps, verify:

- [ ] Authentication enabled (Email/Password method)
- [ ] Firestore database created
- [ ] Collections created: `users`, `research`, `departments`
- [ ] Storage enabled
- [ ] Admin user created in Authentication
- [ ] Admin profile in Firestore `users` collection
- [ ] Security rules updated
- [ ] Can login to System Administrator dashboard

---

## ðŸ†˜ Troubleshooting

### Issue: "Firebase: Error (auth/user-not-found)"
**Solution:** Your email is not in Firebase Authentication. Go back to Step 5.

### Issue: "Firebase: Error (auth/wrong-password)"
**Solution:** Check your password. Reset it in Firebase Console â†’ Authentication â†’ Users â†’ Click user â†’ Reset password.

### Issue: "Permission denied" in Firestore
**Solution:** Update security rules in Step "Security Rules"

### Issue: Can't find firebase config
**Solution:** Make sure you updated `system-administrator/src/firebase/config.js` with your Firebase credentials

---

## ðŸ“ž Your Firebase Project Info

```
Project Name: archivio-research-system
Project ID: archivio-research-system
```

Your config is already set in all 5 systems! âœ…

---

## ðŸŽ¯ What's Next?

After creating your admin account:

1. âœ… Login to System Administrator
2. âœ… Create your first Dean account
3. âœ… Test the invitation email system
4. âœ… Configure department settings
5. âœ… Start onboarding users!

---

## ðŸ’¾ Save Your Credentials Securely!

**Admin Email:** ___________________________

**Admin Password:** ___________________________

**User UID:** ___________________________

**âš ï¸ Keep this information safe and secure!**

---

**Good luck with your ARCHIVIO Research Management System! ðŸš€**

