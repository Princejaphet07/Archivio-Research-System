# Dean System Login - Firebase Integration Guide

## ✅ What's Updated

### Dean Login Page (`dean-system/src/pages/Login.jsx`)
- **Firebase Authentication** - Sign in with @phinmaed.com emails
- **Email Validation** - Only accepts @phinmaed.com domain
- **Account Activation** - Set password on first login
- **Status Check** - Verifies dean account is active
- **Role Verification** - Confirms user is a dean

---

## 🔄 Complete Flow

### Step 1: Admin Creates Dean Account
```
System Administrator → Dean Onboarding → Create Dean Account
```
- Admin fills in dean information
- Email MUST be @phinmaed.com (e.g., `test.dean@phinmaed.com`)
- Dean record created in Firestore with status: "pending"

### Step 2: Dean Activates Account
```
Dean → Clicks "Activate Account" on login page
```
- Dean enters their email (same as invitation email)
- Dean creates a strong password:
  - ✓ At least 8 characters
  - ✓ Contains a number
  - ✓ Contains uppercase letter  
  - ✓ Contains special character
- Dean clicks "Activate Account"

**What Happens:**
1. Creates Firebase Auth account
2. Updates dean record: status → "active", adds UID
3. Creates user profile in `users` collection
4. Shows success message and redirects to login

### Step 3: Dean Logs In
```
Dean → Login with email + password → Dashboard
```
- Dean enters email (@phinmaed.com) and password
- System verifies:
  1. User exists in Firebase Auth
  2. User exists in `deans` collection
  3. Account status is "active"
- Success → Navigate to Dean Dashboard

---

## 🧪 Testing Guide

### Test 1: Create Dean Account (System Administrator)
1. Login as admin: `japhetvender00@gmail.com` / `23571113`
2. Go to **Dean Onboarding**
3. Click **"Create Dean Account"**
4. Fill in:
   ```
   First Name: Test
   Last Name: Dean
   Email: test.dean@phinmaed.com
   Department: College of Information Technology
   Programs: BSIT, BSCS
   Role: Dean + Research Adviser
   ```
5. Click **"Send Invite & Create Account"**
6. ✅ Success message appears
7. Verify in Firestore Console → `deans` collection

### Test 2: Activate Dean Account
1. Start dean-system: `npm run dev` (in dean-system folder)
2. Open dean login page
3. Click **"Activate Account"**
4. Fill in:
   ```
   Email: test.dean@phinmaed.com
   New Password: TestDean123!
   Confirm Password: TestDean123!
   ```
5. Click **"Activate Account"**
6. ✅ Success message appears
7. Verify in Firestore:
   - `deans` collection → status changed to "active"
   - `users` collection → new user created

### Test 3: Login as Dean
1. On dean login page
2. Enter:
   ```
   Email: test.dean@phinmaed.com
   Password: TestDean123!
   ```
3. Click **"Sign In to ARCHIVIO"**
4. ✅ Should navigate to Dean Dashboard

---

## 📊 Database Structure

### Firestore Collections

#### `/deans/{deanId}`
```javascript
{
  firstName: "Test",
  lastName: "Dean",
  displayName: "Test Dean",
  email: "test.dean@phinmaed.com",
  department: "College of Information Technology",
  programs: ["BSIT", "BSCS"],
  role: "dean+adviser", // or "dean"
  status: "active", // or "pending"
  uid: "firebase_auth_uid", // added after activation
  invitationSent: true,
  invitationDate: "2026-07-22T...",
  activatedAt: "2026-07-22T...", // added after activation
  createdAt: "2026-07-22T...",
  updatedAt: "2026-07-22T...",
  createdBy: "admin_uid"
}
```

#### `/users/{userId}`
```javascript
{
  uid: "firebase_auth_uid",
  email: "test.dean@phinmaed.com",
  displayName: "Test Dean",
  role: "dean+adviser", // or "dean"
  department: "College of Information Technology",
  status: "active",
  createdAt: "2026-07-22T..."
}
```

---

## 🔒 Email Validation

### ✅ Valid Emails
- `test.dean@phinmaed.com`
- `prdo.vender.swu@phinmaed.com`
- `maria.santos@phinmaed.com`

### ❌ Invalid Emails (Will Show Error)
- `dean@swu.phinma.edu.ph` - Wrong domain
- `test@gmail.com` - Wrong domain
- `dean@phinma.com` - Wrong domain

**Error Message:** "Please use your @phinmaed.com email address"

---

## 🚨 Common Errors & Solutions

### Error: "No invitation found for this email address"
**Cause:** Dean account not created by admin yet
**Solution:** Admin must create dean account first in System Administrator → Dean Onboarding

### Error: "This account is already activated. Please login instead."
**Cause:** Dean already activated their account
**Solution:** Use "Sign In" instead of "Activate Account"

### Error: "Your account is not activated yet"
**Cause:** Dean trying to login before activating
**Solution:** Click "Activate Account" first to set password

### Error: "Access denied. This portal is for Deans only."
**Cause:** User exists in Firebase Auth but not in `deans` collection
**Solution:** User is not a dean - contact administrator

### Error: "Password must meet all requirements"
**Cause:** Password doesn't meet strength requirements
**Solution:** Ensure password has:
- At least 8 characters
- One number
- One uppercase letter
- One special character

---

## 🎯 Next Steps

### Already Working ✅
- [x] Admin creates dean accounts
- [x] Dean activation flow
- [x] Dean login with Firebase
- [x] Email validation (@phinmaed.com)
- [x] Password strength requirements
- [x] Status verification (pending → active)

### Coming Soon 🔜
- [ ] Email invitation system (send actual emails)
- [ ] Forgot password functionality
- [ ] Dean dashboard with real data
- [ ] Dean profile management
- [ ] Adviser invitation flow (dean creates advisers)

---

## 🏃 Quick Start Commands

### Start System Administrator
```powershell
cd "c:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\system-administrator"
npm run dev
```

### Start Dean System
```powershell
cd "c:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\dean-system"
npm run dev
```

---

## 📝 Notes

1. **One Firebase Project** - All systems share the same Firebase project (`archivio-research-system`)
2. **Role-Based Access** - Access control via `role` field in Firestore
3. **Email Domain** - All dean emails must be @phinmaed.com
4. **Status Flow** - pending (invitation) → active (after password setup)
5. **Dual Roles** - Deans can also be research advisers (role: "dean+adviser")

---

## 🎉 Ready to Test!

Your Dean System is now ready! Follow the testing guide above to try the complete flow:
1. Create dean account as admin
2. Activate dean account
3. Login as dean

Good luck! 🚀
