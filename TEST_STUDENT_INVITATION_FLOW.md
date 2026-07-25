# Testing: Complete Student Invitation Flow

## ✅ System Status

All components are working and integrated:

- ✅ Email Service (Port 3001) - Sends emails
- ✅ Research Adviser System (Port 5176) - Sends invitations
- ✅ Student Portal (Archivio, Port 5175) - Receives invitations & creates accounts
- ✅ Firebase - Stores invitation tokens & student data

---

## 🧪 Step-by-Step Test

### **Step 1: Start All Services**

**Terminal 1 - Email Service:**
```bash
cd email-service
npm start
```

Wait for:
```
╔═══════════════════════════════════════╗
║   ARCHIVIO Email Service Running      ║
║   Port: 3001                          ║
║   ✅ Ready to send invitations         ║
╚═══════════════════════════════════════╝
```

**Terminal 2 - Research Adviser System:**
```bash
cd research-adviser-system
npm run dev
```

Navigate to: http://localhost:5176

**Terminal 3 - Student Portal:**
```bash
npm run dev  # From root ARCHIVIO folder
```

Navigate to: http://localhost:5178

---

### **Step 2: Login to Research Adviser System**

1. Open http://localhost:5176
2. Login with adviser email and password
   - Example: `adviser@phinmaed.com`
   - Password: (your adviser password)

✅ You should see the adviser dashboard

---

### **Step 3: Send Student Invitation**

1. Click on **"Send Invitations"** in the menu
2. You should see:
   - A form titled "Send Student Registration Link"
   - Email input field
   - Send Link button

3. Enter student email: `prdo.vender.swu@phinmaed.com`
   - **IMPORTANT:** Must be @phinmaed.com domain

4. Click **"Send Link"** button

Expected result:
```
✅ Invitation sent to prdo.vender.swu@phinmaed.com!
```

---

### **Step 4: Check Email Inbox**

1. Open your email: **prdo.vender.swu@phinmaed.com**
2. Look for email from: **ARCHIVIO**
3. Subject: **"Student Invitation: Join ARCHIVIO Research Management System"**

Email content includes:
- Personal greeting
- Invitation message
- **"Create Your Student Account"** button (blue)
- Activation link (as backup)
- Expiration warning (7 days)

✅ Email should be in inbox or spam folder

---

### **Step 5: Click Activation Link**

1. Click the **blue button** "Create Your Student Account"
   - OR copy-paste the link

2. Link format:
   ```
   http://localhost:5178/student-activate?token=XXXXXXXXXXXXX
   ```

3. Browser redirects to Student Portal (Port 5178)

Expected page:
- Page title: "Activate Your Student Account"
- Shows student email (from invitation)
- Form fields:
  - First Name
  - Last Name
  - Password (with show/hide toggle)
  - Confirm Password (with show/hide toggle)
  - Agree to Terms checkbox
  - Activate Account button

✅ Activation page loaded successfully

---

### **Step 6: Fill Activation Form**

1. **First Name:** John
2. **Last Name:** Doe
3. **Password:** SecurePass@123
   - Requirements: 8+ characters, uppercase, lowercase, number, special character
4. **Confirm Password:** SecurePass@123
5. **Check:** "I agree to the terms and conditions"

✅ Form filled

---

### **Step 7: Activate Account**

1. Click **"Activate Account"** button
2. Loading state: Button shows "Activating..."
3. Processing:
   - Creates Firebase Auth account
   - Creates Firestore student profile
   - Updates invitation status to "active"

Expected result:
```
✅ Account activated successfully!
Redirecting to login...
```

The page auto-redirects to Login page after 3 seconds.

✅ Account created!

---

### **Step 8: Login to Student Portal**

1. You're now on **Student Login** page
2. Enter credentials:
   - Email: `prdo.vender.swu@phinmaed.com`
   - Password: `SecurePass@123`

3. Click **"Login"** button

Expected result:
```
✅ Login successful!
Redirecting to dashboard...
```

✅ Logged in to Student Portal!

---

### **Step 9: Verify Student Dashboard**

1. You should see:
   - Student name displayed
   - Main dashboard with sections:
     - Dashboard tab
     - Manuscript tab
     - Requirements tab
     - Progress tab
     - My Group tab
     - Settings tab
   - Sidebar with navigation
   - Logout button

✅ Student Portal working!

---

## 🔄 Complete Flow Summary

```
Research Adviser System (5176)
    ↓ Adviser logs in
    ↓
Send Invitations page
    ↓ Adviser enters student email
    ↓ Clicks "Send Link"
    ↓
Email Service (3001)
    ↓ Generates invitation token
    ↓ Sends email with activation link
    ↓
Email Inbox (prdo.vender.swu@phinmaed.com)
    ↓ Student receives email
    ↓ Clicks activation link
    ↓
Student Portal (5175)
    ↓ Student Activation page loads
    ↓ Student fills form (name, password)
    ↓ Clicks "Activate Account"
    ↓
Firebase
    ↓ Creates Auth account
    ↓ Creates Firestore profile
    ↓ Updates invitation status
    ↓
Student Login Page
    ↓ Student enters credentials
    ↓ Clicks "Login"
    ↓
Student Dashboard (5175)
    ✅ Student logged in and ready to use portal
```

---

## ✅ Verification Checklist

- [ ] Email Service running (Port 3001)
- [ ] Research Adviser System running (Port 5176)
- [ ] Student Portal running (Port 5175)
- [ ] Adviser can login to Research Adviser System
- [ ] "Send Invitations" page visible
- [ ] Can enter @phinmaed.com email
- [ ] "Send Link" button works
- [ ] Success message appears
- [ ] Email received in inbox
- [ ] Email contains activation link
- [ ] Link opens Student Portal
- [ ] Activation page loads correctly
- [ ] Can fill form with valid password
- [ ] Account activation button works
- [ ] Redirected to login page
- [ ] Can login with new credentials
- [ ] Student dashboard displays
- [ ] Can access all portal features

---

## 🆘 Troubleshooting

### Email Not Received
1. Check inbox at: `prdo.vender.swu@phinmaed.com`
2. Check spam/junk folder
3. Check promotions tab (Gmail)
4. Verify email service is running (Terminal 1)
5. Check `/api/health` endpoint: http://localhost:3001/api/health

### Activation Link Not Working
1. Link must be used within 7 days
2. Check URL includes `?token=` parameter
3. Verify Student Portal is running (Port 5175)
4. Check browser console for errors (F12)
5. Try right-clicking link → Copy → Paste in address bar

### "Invalid or expired activation link"
1. Generate new invitation
2. Use new email link
3. Check token hasn't expired (7 days)
4. Check Firestore `studentInvitations` collection

### Password Requirements Not Met
Password must include:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (!@#$%^&*)

Example valid password: `SecurePass@123`

### Login After Activation
1. Make sure you're on login page
2. Enter email: `prdo.vender.swu@phinmaed.com`
3. Enter password: (what you set during activation)
4. Check Firebase is connected (check console)

---

## 📊 Database Records

After successful test, you should have:

**Firestore Collection: `studentInvitations`**
```json
{
  "studentEmail": "prdo.vender.swu@phinmaed.com",
  "sentBy": "adviser@phinmaed.com",
  "sentByName": "Adviser Name",
  "department": "College of IT",
  "status": "active",
  "invitationToken": "xxxxx",
  "invitationLink": "http://localhost:5178/student-activate?token=xxxxx",
  "invitationSentAt": "2026-07-22T...",
  "createdAt": "2026-07-22T..."
}
```

**Firebase Auth:**
```
User: prdo.vender.swu@phinmaed.com
Password: SecurePass@123 (hashed in Firebase)
```

**Firestore Collection: `users`** (Student Profile)
```json
{
  "uid": "firebase-uid",
  "email": "prdo.vender.swu@phinmaed.com",
  "displayName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "createdAt": "2026-07-22T...",
  "status": "active"
}
```

---

## 🎉 Success!

Once you complete all steps and see the student dashboard, the entire invitation flow is working perfectly!

**System Status: ✅ FULLY OPERATIONAL**

---

**Need to test again?**
1. Generate new invitation with different email
2. Or resend existing invitation from Research Adviser System
3. Repeat from Step 3

**Questions?** Check: `EMAIL_SERVICE_INTEGRATION.md`
