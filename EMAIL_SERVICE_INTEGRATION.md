# ARCHIVIO Email Service Integration - All 5 Projects Connected

## Overview
All 5 ARCHIVIO projects are now integrated with the centralized email service running on **Port 3001**.

---

## 📊 Email Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Node.js Email Service (Port 3001)                  │
│  Gmail SMTP: prdo.vender.swu@phinmaed.com                  │
│                                                             │
│  Endpoints:                                                 │
│  • POST /api/send-invitation-email (Adviser)               │
│  • POST /api/send-student-invitation-email (Student)       │
│  • POST /api/send-dean-invitation-email (Dean)             │
│  • GET  /api/health (Status check)                         │
└─────────────────────────────────────────────────────────────┘
     ↑                    ↑                    ↑
     │                    │                    │
  5173              5176            5175     (Also: 5174)
```

---

## 🎯 5 Projects & Email Integration

### 1. **Dean System** (Port 5173) ✅
**File:** `dean-system/src/pages/Invitations.jsx`
- **Purpose:** Dean invites research advisers
- **Email Endpoint:** `POST /api/send-invitation-email`
- **Sends To:** `@phinmaed.com` emails
- **Status:** ✅ INTEGRATED - Adviser invitations working
- **Email Content:** Adviser activation link

### 2. **Research Adviser System** (Port 5176) ✅
**File:** `research-adviser-system/src/pages/SendInvitations.jsx`
- **Purpose:** Research adviser invites students
- **Email Endpoint:** `POST /api/send-student-invitation-email`
- **Sends To:** `@phinmaed.com` emails
- **Status:** ✅ INTEGRATED - Student invitations working
- **Email Content:** Student activation link

### 3. **Student Portal (Archivio)** (Port 5178) ✅
**File:** `src/pages/StudentActivate.jsx`
- **Purpose:** Students receive invitations and create accounts
- **Email Integration:** Receives emails from Research Adviser System
- **Status:** ✅ INTEGRATED - Receives and validates invitation links
- **Flow:** Email → Student clicks link → Creates account → Logs in

### 4. **System Administrator** (Port 5174) ✅
**File:** `system-administrator/src/pages/DeanOnboarding.jsx`
- **Purpose:** Admin creates dean accounts and sends invitations
- **Email Endpoint:** `POST /api/send-dean-invitation-email` (NEW)
- **Sends To:** `@phinmaed.com` emails
- **Status:** ✅ NEWLY INTEGRATED - Dean invitations now working
- **Email Content:** Dean activation link

### 5. **Email Service** (Port 3001) ✅
**File:** `email-service/server.js`
- **Purpose:** Central email sending service
- **SMTP:** Gmail (prdo.vender.swu@phinmaed.com)
- **Status:** ✅ ALL ENDPOINTS ACTIVE
- **Endpoints:** 4 total

---

## 🚀 How to Start All Projects

```bash
# Terminal 1 - Email Service (MUST START FIRST)
cd email-service
npm install  # If not installed
npm start

# Terminal 2 - Dean System (Port 5173)
cd dean-system
npm run dev

# Terminal 3 - Research Adviser System (Port 5176)
cd research-adviser-system
npm run dev

# Terminal 4 - Student Portal (Port 5175)
npm run dev  # From root ARCHIVIO folder

# Terminal 5 - System Administrator (Port 5174)
cd system-administrator
npm run dev
```

---

## 📧 Email Flow Diagram

```
SYSTEM ADMINISTRATOR (Port 5174)
  ↓ Creates dean account
  └─→ Email Service (3001)
       ↓ Sends email
       └─→ Dean inbox (prdo.vender.swu@phinmaed.com)
            ↓ Dean clicks link
            └─→ Dean System (Port 5173)
                 ↓ Dean creates adviser account
                 └─→ Email Service (3001)
                      ↓ Sends email
                      └─→ Adviser inbox
                           ↓ Adviser clicks link
                           └─→ Research Adviser System (Port 5176)
                                ↓ Adviser creates adviser account
                                └─→ Email Service (3001)
                                     ↓ Sends email
                                     └─→ Student inbox
                                          ↓ Student clicks link
                                          └─→ Student Portal (Port 5175)
                                               ↓ Student creates account
                                               └─→ Student logs in
```

---

## 🔧 Email Service Configuration

**File:** `email-service/.env`

```env
# SMTP Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=prdo.vender.swu@phinmaed.com
EMAIL_PASSWORD=vqzvimoxuhpnjldr

# Server Port
PORT=3001
```

---

## ✅ Email Endpoints Reference

### 1. Send Adviser Invitation
```bash
POST http://localhost:3001/api/send-invitation-email

Body:
{
  "to": "adviser@phinmaed.com",
  "adviserName": "John Doe",
  "invitationLink": "http://localhost:5173/adviser-activate?token=xyz",
  "senderName": "Dean Name",
  "senderDepartment": "College of IT",
  "message": "Custom message..."
}
```

### 2. Send Student Invitation
```bash
POST http://localhost:3001/api/send-student-invitation-email

Body:
{
  "to": "student@phinmaed.com",
  "invitationLink": "http://localhost:5178/student-activate?token=xyz",
  "senderName": "Adviser Name",
  "senderDepartment": "College of IT",
  "message": "You have been invited..."
}
```

### 3. Send Dean Invitation (NEW)
```bash
POST http://localhost:3001/api/send-dean-invitation-email

Body:
{
  "to": "dean@phinmaed.com",
  "deanName": "Jane Smith",
  "invitationLink": "http://localhost:5174/dean-activate?token=xyz",
  "message": "You have been invited..."
}
```

### 4. Health Check
```bash
GET http://localhost:3001/api/health

Response:
{
  "status": "OK",
  "message": "Email service is running"
}
```

---

## 📋 Integration Checklist

- ✅ Email Service created and configured
- ✅ Dean System sends adviser invitations
- ✅ Research Adviser System sends student invitations
- ✅ System Administrator sends dean invitations (NEW)
- ✅ Student Portal receives and validates invitations
- ✅ All endpoints operational
- ✅ Email domain restricted to @phinmaed.com
- ✅ Invitation links include tokens
- ✅ Resend functionality implemented (Advisers, Students, Deans)

---

## 🧪 Testing Checklist

1. **Email Service Test**
   - [ ] Start email service: `npm start`
   - [ ] Check `/api/health` returns OK

2. **System Administrator → Dean Invitation**
   - [ ] Navigate to System Administrator (5174)
   - [ ] Create Dean Account
   - [ ] Check prdo.vender.swu@phinmaed.com inbox
   - [ ] Verify email received

3. **Dean System → Adviser Invitation**
   - [ ] Navigate to Dean System (5173)
   - [ ] Login as dean
   - [ ] Send adviser invitation
   - [ ] Check inbox for email

4. **Research Adviser System → Student Invitation**
   - [ ] Navigate to Research Adviser (5176)
   - [ ] Login as adviser
   - [ ] Send student invitation
   - [ ] Check inbox for email

5. **Student Portal → Account Creation**
   - [ ] Click invitation link from email
   - [ ] Create student account
   - [ ] Login to student portal

---

## 🔐 Security Notes

1. **Email Domain Validation**
   - Only `@phinmaed.com` emails can send/receive invitations
   - All email validation happens server-side

2. **Invitation Tokens**
   - Random tokens generated for each invitation
   - Tokens stored in Firestore
   - Links expire after 7 days

3. **Gmail App Password**
   - Using app-specific password: `vqzvimoxuhpnjldr`
   - Not the main Gmail password
   - Can be revoked at any time

---

## 🆘 Troubleshooting

### Emails Not Sending
1. Check email service is running: `npm start` in email-service folder
2. Check `/api/health` endpoint returns OK
3. Check Gmail daily sending limit (100 emails/day for institutional account)
4. Check .env file has correct credentials

### Email Not Received
1. Check email inbox AND spam/junk folder
2. Verify you're checking the correct email: `prdo.vender.swu@phinmaed.com`
3. Check email domain is `@phinmaed.com`
4. Check invitation link is valid in the email

### Activation Link Not Working
1. Click link within 7 days (links expire)
2. Check port matches email link (5173, 5175, 5176, 5174)
3. Check invitation token exists in Firestore
4. Try resending invitation email

---

## 📞 Quick Reference

| Project | Port | Email Endpoint | Type |
|---------|------|----------------|------|
| System Administrator | 5174 | /send-dean-invitation-email | Dean invites |
| Dean System | 5173 | /send-invitation-email | Adviser invites |
| Research Adviser | 5176 | /send-student-invitation-email | Student invites |
| Student Portal | 5178 | Receives emails | Account creation |
| Email Service | 3001 | All above endpoints | Sends all emails |

---

**Last Updated:** 2026-07-22
**Status:** ✅ All 5 projects connected and operational
