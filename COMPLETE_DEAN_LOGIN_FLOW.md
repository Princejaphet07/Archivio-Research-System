# Complete Dean Login Flow - Step by Step

## Overview
This guide walks through the complete process of:
1. Admin creating a dean account
2. Dean receiving invitation with temporary password
3. Dean logging into Dean System with that password
4. Dean changing password (optional)

---

## PART 1: ADMIN CREATES DEAN ACCOUNT

### Step 1.1: Login to System Administrator
- **URL:** `http://localhost:5174`
- **Port:** 5174
- **What you see:** System Administrator dashboard if already logged in, or login page
- **Action:** Login as super admin if needed

### Step 1.2: Navigate to User Management
1. Click **Accounts** → **User Management**
2. Or use sidebar: **Accounts** section

### Step 1.3: Click "Add New Dean"
1. Look for **"Add New Dean"** button (top right or blue button)
2. Click it
3. A modal form will appear

### Step 1.4: Fill Out Dean Form
```
First Name:        John
Last Name:         Smith
Email:             john.smith@phinmaed.com
Department:        School of Information Technology
Programs:          BSIT (optional, comma-separated)
Role:              dean+adviser (default)
```

**Important Notes:**
- Email MUST be @phinmaed.com domain
- Department should be existing or new school name
- First name and last name are required

### Step 1.5: Click "Create Dean Account"
1. Button will show "Creating..." while processing
2. Wait for success message: "✅ Dean invitation sent to john.smith@phinmaed.com!"
3. Modal closes automatically

### Step 1.6: Verify in Console (Optional)
1. Open browser Developer Tools: **F12** or **Right-click → Inspect**
2. Go to **Console** tab
3. Look for logs like:
   ```
   ✅ Firebase Auth account created for: john.smith@phinmaed.com UID: xyz123abc
   ```

---

## PART 2: DEAN RECEIVES EMAIL WITH TEMPORARY PASSWORD

### Step 2.1: Check Mailtrap (Development/Testing)
- **URL:** https://mailtrap.io/
- **Login:** Use your Mailtrap account
- **Go to:** Inboxes → Select project → View emails

### Step 2.2: Find Email to Dean
- **From:** ARCHIVIO (noreply email)
- **To:** john.smith@phinmaed.com
- **Subject:** "Dean Invitation: Join ARCHIVIO Research Management System"
- **Should arrive within:** 1-5 seconds

### Step 2.3: View Email Body
1. Click the email to open it
2. You should see:

```
Hello John Smith,

You have been invited to join ARCHIVIO Research Management System as a Dean. 
Please use the temporary credentials below to log in and set up your account.

Your Temporary Credentials:

Email: john.smith@phinmaed.com
Temporary Password: MpM%pdr%!&q5

[Login to ARCHIVIO Dean Portal button]
```

### Step 2.4: Copy Temporary Password
1. **Carefully select and copy** the temporary password (or use browser context menu)
2. **Don't type it manually** - copy-paste to avoid errors
3. Password includes special characters like: `!@#$%^&*`
4. **Example format:** `A7$bxKl9@#Qw` (12 characters, mixed case)

### Step 2.5: Note the Email
- **Email for login:** john.smith@phinmaed.com
- **Exactly as shown:** lowercase, full email address

---

## PART 3: DEAN LOGS IN WITH TEMPORARY PASSWORD

### Step 3.1: Clear Browser Cache (CRITICAL)
1. **Option A - Best:** Open a **NEW INCOGNITO/PRIVATE** window
   - Chrome: `Ctrl+Shift+N` or `Cmd+Shift+N`
   - Firefox: `Ctrl+Shift+P` or `Cmd+Shift+P`
   - Safari: `Cmd+Shift+N`

2. **Option B:** Clear browser cookies/cache
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Preferences → Privacy → Clear Data

3. **Why:** Prevents Firefox cached auth tokens from interfering

### Step 3.2: Navigate to Dean System
1. **URL:** `http://localhost:5174`
2. **Port:** 5174 (or 5173 depending on your configuration)
3. **What you see:** Dean Portal Login form

### Step 3.3: Enter Credentials
```
Email:    john.smith@phinmaed.com
Password: [Paste from Mailtrap email]
```

**Important:**
- Email is lowercase
- Password is EXACT - no changes
- Checkbox "Remember me" optional
- Do NOT try to activate account - just login

### Step 3.4: Click "Sign In to ARCHIVIO"
1. **Button shows:** "Signing In..."
2. **Processing time:** 2-5 seconds
3. **Expected Result:** Redirect to Dashboard

### Step 3.5: Success! View Dashboard
- **If successful:** You see Dean Dashboard with sidebar
- **What's visible:**
  - Sidebar: Dashboard, Profile, Settings, Logout
  - Main area: Relevant dean information
  - Calendar or reports (depends on modules)

### Step 3.6: Verify It Worked
1. **Check URL:** Should be `http://localhost:5174/dashboard` or similar
2. **Check sidebar:** Should show dean menu items
3. **Try a page:** Click "Profile" or "Settings" to verify navigation works

---

## PART 4: TROUBLESHOOTING IF LOGIN FAILS

### Issue: "Login failed. Please check your credentials."

**Step 1: Check Browser Console**
1. Press **F12** to open Developer Tools
2. Go to **Console** tab (not Elements)
3. Look for logs starting with 🔍 or ❌
4. **Copy the error message**

**Step 2: Verify Email**
1. Go back to Mailtrap
2. **Double-check:**
   - Email address shown in credentials box
   - Password shown in credentials box
   - Both are visible and readable
   - No truncation or missing characters

**Step 3: Clear Everything and Try Again**
1. Close the browser tab completely
2. Open a NEW incognito window
3. Navigate to localhost:5174
4. **Carefully re-enter credentials**
5. Try login again

**Step 4: Check Firestore (Advanced)**
1. Open Firebase Console
2. Go to Firestore Database
3. Find **deans** collection
4. Look for dean document with email: `john.smith@phinmaed.com`
5. Check fields:
   - **status:** Should be "active" ✓
   - **email:** Should match exactly (lowercase)
   - **uid:** Should have a Firebase UID value
   - **temporaryPassword:** Should match what's in email

**Step 5: Check Firebase Auth (Advanced)**
1. Open Firebase Console
2. Go to **Authentication** → **Users**
3. Look for user with email: `john.smith@phinmaed.com`
4. Verify:
   - Email is enabled (not disabled)
   - Status shows active
   - Account exists

### Issue: "Your account has been deactivated"
- **Cause:** Firestore record deleted or missing
- **Solution:** 
  - Admin needs to create dean account again
  - Or manually create Firestore document with status='active'

### Issue: "Your account is not activated yet"
- **Cause:** Firestore status field is not 'active' (might be 'pending')
- **Solution:**
  - Manually update Firestore `status` field to 'active'
  - Or ask admin to create dean account again

### Issue: "No account found with this email"
- **Cause:** Firebase Auth account doesn't exist
- **Solution:**
  - Admin should create dean account again
  - Make sure there are no errors during account creation

### Issue: "Incorrect password"
- **Cause:** Password typed wrong or doesn't match
- **Solution:**
  - Go back to Mailtrap
  - Copy password again (don't type)
  - Clear browser and try again in incognito window

---

## PART 5: AFTER FIRST LOGIN - CHANGING PASSWORD

### Note About Temporary Password
- Temporary password works for the first login
- You can change it to a permanent password from dashboard
- Instructions:
  1. Click **Profile** or **Settings** (depends on implementation)
  2. Look for "Change Password" option
  3. Enter current password (the temporary one)
  4. Enter new permanent password
  5. Confirm new password
  6. Click "Update Password"

---

## COMPLETE FLOW CHECKLIST

### ✅ Admin Side
- [ ] Logged into System Administrator (localhost:5174)
- [ ] Navigated to User Management
- [ ] Clicked "Add New Dean"
- [ ] Filled all required fields
- [ ] Used @phinmaed.com email
- [ ] Clicked "Create Dean Account"
- [ ] Saw success message
- [ ] Checked console for UID confirmation

### ✅ Email Side
- [ ] Went to Mailtrap
- [ ] Found email to dean
- [ ] Opened email body
- [ ] Located "Your Temporary Credentials:" section
- [ ] Found Email: john.smith@phinmaed.com
- [ ] Found Temporary Password: (12-char string)
- [ ] Copied password to clipboard

### ✅ Dean Side
- [ ] Opened new incognito window
- [ ] Navigated to localhost:5174
- [ ] Saw Dean Portal Login form
- [ ] Entered email: john.smith@phinmaed.com
- [ ] Pasted temporary password
- [ ] Clicked "Sign In to ARCHIVIO"
- [ ] Saw "Signing In..." message
- [ ] Redirected to Dashboard
- [ ] Verified sidebar menu appears
- [ ] Clicked on profile/settings to confirm it works

### ✅ Verification
- [ ] Browser console shows ✅ logs (F12)
- [ ] Firestore `deans` collection has entry
- [ ] Firebase Auth shows account as enabled
- [ ] Can navigate between dean system pages
- [ ] Logout works from dashboard menu

---

## COMMON MISTAKES & FIXES

| Mistake | Solution |
|---------|----------|
| Using same browser tab → cached auth | Open new INCOGNITO window |
| Typing password instead of copy-paste | Use Ctrl+C / Cmd+C to copy from email |
| Missing special characters in password | Copy directly from Mailtrap email |
| Email uppercase (John@phinmaed.com) | Must be lowercase: john@phinmaed.com |
| Wrong port (5173 instead of 5174) | Use 5174 for dean system login |
| Email service not running | Start email service on port 3001 first |
| Firebase project mismatch | Use same Firebase project for both apps |

---

## QUICK REFERENCE

### Ports
- System Administrator: 5174
- Dean System: 5174 (or check your config)
- Email Service: 3001

### Key URLs
- System Admin: `http://localhost:5174`
- Dean Login: `http://localhost:5174`
- Mailtrap: `https://mailtrap.io`
- Firebase: `https://console.firebase.google.com`

### Required Email Domain
- Must use: `@phinmaed.com`
- Examples: `john.smith@phinmaed.com`, `mary.jane@phinmaed.com`

### Email Structure
- Sender: ARCHIVIO System
- Subject: "Dean Invitation: Join ARCHIVIO Research Management System"
- Contains: Email + Temporary Password in a credentials box

### Password Specifications
- Length: 12 characters
- Characters: Uppercase + Lowercase + Numbers + Symbols
- Example: `MpM%pdr%!&q5`
- Valid symbols: `!@#$%^&*`

---

## NEXT STEPS AFTER SUCCESSFUL LOGIN

1. **Change Password:** Update to permanent password from settings
2. **Configure Profile:** Add department and other details
3. **Create Advisers:** Use Research Adviser System
4. **Manage Students:** Invite students through adviser system
5. **View Dashboard:** Access reports and analytics

---

## SUPPORT & DEBUGGING

### If You Get Stuck:

1. **Check browser console** (F12 → Console tab)
2. **Check Mailtrap** for email content
3. **Check Firestore** for dean record
4. **Check Firebase Auth** for account status
5. **Try incognito window** to clear cache
6. **Try again** after waiting a minute
7. **Ask for logs** from admin if available

### Screenshots to Collect for Support:
- Email from Mailtrap showing credentials
- Browser console error messages
- Firestore dean document
- Firebase Auth user details
- Browser URL when error occurs

---

**Version:** 1.0 - July 23, 2026  
**Status:** Complete Dean Login System ✅  
**Ready for:** Production Testing
