# Dean Login Troubleshooting Guide

## Issue
Dean cannot login with randomized temporary password in Dean System at localhost:5174

## Root Causes Fixed

### 1. ✅ Email Template Missing Temporary Password
**Problem:** Email service was sending dean invitation emails WITHOUT the temporary password in the body.
**Fix:** Updated `/api/send-dean-invitation-email` endpoint to:
- Accept `temporaryPassword` parameter from UserManagement
- Display credentials in a formatted box in the email template
- Show email and password clearly for copy-paste

### 2. ✅ Enhanced Debug Logging in Dean Login
**Problem:** Generic error messages didn't indicate what was actually failing
**Fix:** Added detailed console logging at each step:
- Email input validation
- Password length verification
- Firebase authentication attempt
- Firestore dean record lookup
- Dean status verification

### 3. ✅ Login Error Codes Expanded
**Problem:** Some Firebase error codes weren't handled
**Fix:** Added handling for:
- `auth/invalid-credential` (new error code)
- More detailed error messages showing actual error code

## Test Flow: Step-by-Step

### Step 1: Create Dean Account
1. Go to System Administrator: `http://localhost:5174`
2. Login as admin (if not already logged in)
3. Navigate to **User Management**
4. Click **Add New Dean**
5. Fill in form:
   - First Name: `Test`
   - Last Name: `Dean`
   - Email: `test.dean@phinmaed.com`
   - Department: `IT Department`
6. Click **Create Dean Account**
7. **Expected:** Success message "✅ Dean invitation sent"
8. **Check console (F12):** You should see:
   ```
   ✅ Firebase Auth account created for: test.dean@phinmaed.com UID: xxx
   ```

### Step 2: Check Email
1. Go to Mailtrap inbox: https://mailtrap.io/
2. Find email to `test.dean@phinmaed.com`
3. Look for **Temporary Credentials** section:
   ```
   Your Temporary Credentials:
   Email: test.dean@phinmaed.com
   Temporary Password: [Random 12-char password]
   ```
4. **Copy the exact temporary password** (including all symbols like !@#$%^&*)

### Step 3: Login as Dean
1. **Important:** Open Dean System in PRIVATE/INCOGNITO window (or clear cookies)
2. Go to: `http://localhost:5174`
3. You should see Dean Portal Login form
4. Enter:
   - Email: `test.dean@phinmaed.com`
   - Password: [Paste exact password from email]
5. Click **Sign In to ARCHIVIO**
6. **Expected:** Dashboard appears OR you see specific error

### Step 4: Debug If Login Fails
Open browser **Developer Console (F12)** and look for:

#### Scenario A: "Firebase auth successful"
- If you see ✅ in console, then Firebase Auth worked
- Problem is in Firestore: Dean record not found or status != 'active'
- Check Firestore: `deans` collection for email

#### Scenario B: Firebase auth fails
- Error code: `auth/wrong-password` → Password is incorrect
- Error code: `auth/user-not-found` → Email doesn't exist in Auth
- Error code: `auth/invalid-login-credentials` → Email/password combo wrong
- Error code: Other → See console for details

## Key Points

### Password Generation
- Length: 12 characters
- Contains: Uppercase + lowercase + numbers + symbols (!@#$%^&*)
- Examples: `MpM%pdr%!&q5`, `A7$bxKl9@#Qw`

### Email & Password Must Match EXACTLY
- Email stored as: **lowercase, trimmed**
- Password stored as: **exact case, including symbols**
- When typing: **Copy-paste from email to avoid typos**

### Firestore Structure
Each dean document should have:
```javascript
{
  email: "test.dean@phinmaed.com",  // lowercase
  uid: "firebase-uid-here",          // from Firebase Auth
  status: "active",                  // must be 'active'
  temporaryPassword: "MpM%pdr%!&q5", // for reference only
  displayName: "Test Dean",
  // ... other fields
}
```

### Firebase Auth Structure
Email account should exist in Firebase Console:
- Email: `test.dean@phinmaed.com`
- Password: (hidden, but matches temporary password)
- Status: Enabled (not disabled)

## Common Issues & Solutions

### Issue: "No account found with this email"
- **Cause:** Firebase Auth account wasn't created during dean account creation
- **Solution:** Check console for errors during dean creation step
- **Fix:** Re-create dean account and check for Firebase errors

### Issue: "Incorrect password"
- **Cause:** Password was typed incorrectly or doesn't match what was created
- **Solution:** Copy-paste directly from email instead of typing
- **Verify:** Check browser console for exact password length

### Issue: "Your account has been deactivated"
- **Cause:** Dean record exists in Firebase Auth but not in Firestore, or status != 'active'
- **Solution:** Check Firestore `deans` collection - should exist with status='active'
- **Fix:** Manually add to Firestore if missing

### Issue: "Your account is not activated yet"
- **Cause:** Dean status in Firestore is not 'active' (might be 'pending')
- **Solution:** Check Firestore - update status field to 'active'

## Files Modified

1. **email-service/server.js**
   - `/api/send-dean-invitation-email` endpoint
   - Added `temporaryPassword` parameter
   - Updated email template to show credentials

2. **dean-system/src/pages/Login.jsx**
   - Enhanced `handleLogin()` with detailed logging
   - Added more Firebase error codes
   - Better console output for debugging

3. **system-administrator/src/pages/UserManagement.jsx**
   - Added console logging during dean creation
   - Logs Firebase Auth UID after creation

## Testing Checklist

- [ ] Email service running on port 3001
- [ ] System Administrator running on port 5174
- [ ] Dean System running on port 5173 (or whatever port is configured)
- [ ] Firebase console shows Auth account for test dean
- [ ] Firestore shows dean document with status='active'
- [ ] Email received with temporary credentials visible
- [ ] Can copy-paste password without typos
- [ ] Browser console shows detailed logs
- [ ] Dean can login and reach dashboard

## Next Steps If Still Failing

1. **Check browser console (F12)** - screenshot any error messages
2. **Check Firestore** - verify dean record exists and status='active'
3. **Check Firebase Auth** - verify account exists and is enabled
4. **Check email** - verify credentials are correct and visible
5. **Try incognito mode** - clear any cached auth state
6. **Restart services** - restart email service, System Admin, and Dean System

---

**Last Updated:** July 23, 2026
**Status:** Ready for testing
