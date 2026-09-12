# Research Adviser Invitation System - Complete Setup Guide

## 📋 Overview

The dean can now invite research advisers through the Invitations page in the Dean System. Advisers receive a personalized email with an activation link to create their account.

### System Flow:
```
1. Dean fills form (name, email, custom message)
   ↓
2. Invitation created in Firestore
   ↓
3. Email sent via Node.js backend
   ↓
4. Adviser receives activation link
   ↓
5. Adviser clicks link and creates account
   ↓
6. Status updates to "active" in dashboard
```

---

## 🚀 Part 1: Frontend Setup (Already Done!)

### Updated Files:
- ✅ `dean-system/src/pages/Invitations.jsx` - Invitation form with Firebase integration

### Features:
- ✅ Form to invite research advisers
- ✅ Email validation (@phinmaed.com domain)
- ✅ Custom invitation message
- ✅ Resend invitation capability
- ✅ Real-time status tracking
- ✅ Shows list of all sent invitations

---

## 📧 Part 2: Email Service Setup (Node.js Backend)

### Create Email Service Directory:

```powershell
mkdir email-service
cd email-service
npm init -y
```

### Install Dependencies:

```powershell
npm install express nodemailer cors dotenv
```

### Files Created:
- ✅ `email-service/server.js` - Main backend server
- ✅ `email-service/package.json` - Dependencies
- ✅ `email-service/.env.example` - Configuration template

---

## 🔧 Part 3: Email Configuration

### Option 1: Gmail (Easiest for Testing)

#### Step 1: Enable Gmail App Password
1. Go to [Google Account](https://myaccount.google.com/)
2. Click "Security" on the left
3. Enable "2-Step Verification" if not already done
4. Find "App passwords" option
5. Select "Mail" and "Windows Computer"
6. Google will generate a 16-character password

#### Step 2: Create `.env` file

```bash
# Copy .env.example to .env
cp .env.example .env
```

#### Step 3: Add Gmail Credentials to `.env`

```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
PORT=3001
```

⚠️ **IMPORTANT:**
- Use your Gmail address in EMAIL_USER
- Use the 16-character App Password (not your regular password!)
- Never commit `.env` to git

### Option 2: SendGrid (Production Ready)

```
npm install @sendgrid/mail
```

Update `server.js`:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: recipient,
  from: 'noreply@archivio.edu',
  subject: 'Invitation: Join ARCHIVIO',
  html: emailHTML,
};

await sgMail.send(msg);
```

---

## ▶️ Part 4: Start Email Service

### Development Mode:

```powershell
cd email-service
npm start
```

Expected output:
```
╔═══════════════════════════════════════╗
║   ARCHIVIO Email Service Running      ║
║   Port: 3001                          ║
║   ✅ Ready to send invitations        ║
╚═══════════════════════════════════════╝
```

### Production Mode (Optional):

Install PM2:
```powershell
npm install -g pm2
pm2 start server.js --name "archivio-email"
pm2 save
pm2 startup
```

---

## 🧪 Part 5: Testing the System

### Step 1: Start All Services

```powershell
# Terminal 1: Dean System
cd dean-system
npm run dev

# Terminal 2: Email Service
cd email-service
npm start
```

### Step 2: Invite an Adviser

1. Login as Dean (http://localhost:5173)
2. Go to **Invitations** page
3. Fill in form:
   - First Name: `Test`
   - Last Name: `Adviser`
   - Email: `test.adviser@phinmaed.com` ← Must use @phinmaed.com!
   - Message: Leave blank for default
4. Click **"Send Invitation Link"**
5. ✅ Should see success message

### Step 3: Check Email

1. Open your Gmail inbox (or whatever you configured)
2. Look for email from your sender address
3. Click the activation link
4. Should redirect to activation page (to be implemented)

### Step 4: Verify in Firestore

1. Go to Firebase Console
2. Navigate to `advisers` collection
3. See new adviser record with:
   - Email: `test.adviser@phinmaed.com`
   - Status: `pending`
   - Invitation link

---

## 📊 Database Structure

### Firestore: `/advisers/{adviserId}`

```javascript
{
  id: "doc_id",
  firstName: "Test",
  lastName: "Adviser",
  displayName: "Test Adviser",
  email: "test.adviser@phinmaed.com",
  invitedBy: "dean@phinmaed.com",        // Dean's email
  invitedByName: "Dean Name",             // Dean's name
  department: "College of IT",            // Dean's department
  status: "pending" | "active",
  invitationToken: "abc123xyz...",        // Random token for link
  invitationLink: "http://localhost:5173/adviser-activate?token=...",
  message: "Email message sent",
  invitationSentAt: "2026-07-22T14:30:00.000Z",
  createdAt: "2026-07-22T14:30:00.000Z"
}
```

---

## 🔐 Email Template Features

The email includes:
- ✅ Professional header with ARCHIVIO branding
- ✅ Personalized greeting
- ✅ Custom invitation message
- ✅ Prominent activation button
- ✅ Backup link (in case button doesn't work)
- ✅ Sender information (Dean name + department)
- ✅ Expiration warning (7 days)
- ✅ FAQ section
- ✅ Responsive design (mobile-friendly)

---

## 🛠️ Troubleshooting

### Email Not Sending

**Error: "Invalid login credentials"**
- Solution: Check EMAIL_USER and EMAIL_PASSWORD in .env
- Ensure Gmail App Password is correct (16 characters)

**Error: "Failed to connect to SMTP server"**
- Solution: Check internet connection
- Verify PORT is not blocked
- Try restarting email service

### Email Arrives in Spam

- Add your email to verified senders
- Use SendGrid for better deliverability
- Check spam folder for test emails

### Link Not Working

- Check URL in email matches your frontend URL
- Ensure `.env` PORT matches client expectations
- Verify CORS is enabled for frontend origin

### Email Service Not Starting

- Check if port 3001 is already in use:
  ```powershell
  netstat -ano | findstr :3001
  ```
- Kill process and restart:
  ```powershell
  taskkill /PID [PID] /F
  npm start
  ```

---

## 📝 Next Steps

### Still To Build:
- [ ] Adviser activation page (`adviser-activate` route)
- [ ] Adviser account creation flow
- [ ] Password setup for advisers
- [ ] Firestore update when adviser activates
- [ ] Email templates in Settings
- [ ] Resend functionality with rate limiting

### Optional Enhancements:
- [ ] Email scheduling (send at specific time)
- [ ] Bulk invitation (CSV import)
- [ ] Email templates customization
- [ ] Invitation expiration auto-cleanup
- [ ] Email delivery tracking
- [ ] Bounce handling

---

## 📞 Support

### Common Questions:

**Q: Can I use a different email service?**
A: Yes! Modify `server.js` to use your provider (SendGrid, AWS SES, etc.)

**Q: Is this secure?**
A: Yes. Email addresses are hashed in the URL, and tokens expire after 7 days.

**Q: What if adviser doesn't receive email?**
A: Check spam folder. Dean can resend from Invitations page.

**Q: Can I customize the email template?**
A: Yes! Edit the HTML template in `server.js`.

---

## 📚 API Reference

### Send Invitation Email Endpoint

**POST** `/api/send-invitation-email`

Request body:
```javascript
{
  to: "adviser@phinmaed.com",
  adviserName: "Test Adviser",
  message: "Custom invitation message",
  invitationLink: "http://localhost:5173/adviser-activate?token=...",
  senderName: "Dean Name",
  senderDepartment: "College of IT"
}
```

Response:
```javascript
{
  success: true,
  message: "Email sent successfully",
  messageId: "message_id_from_provider"
}
```

---

**Your invitation system is ready!** 🎉

Start the email service and test sending your first invitation!
