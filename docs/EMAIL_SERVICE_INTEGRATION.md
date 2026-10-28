# ✉️ ARCHIVIO: Email & Notification Service Integration Guide

## 🏛️ Overview
The ARCHIVIO Notification Engine is an enterprise-grade service designed to dispatch transactional emails, OTP verifications, faculty/student invitations, and review alerts.

It is deployed as a **2nd Generation Firebase Cloud Function (Google Cloud Run)** and can also be executed locally on port `3001` for offline debugging.

---

## 🚀 Zero-Failure Multi-Tier Delivery Architecture

To bypass cloud provider outbound SMTP blocks (Render, GCP, AWS block outbound ports 25, 465, and 587), ARCHIVIO employs a **4-Tier Cascading Fallback Engine**:

```
[ Email Request ]
       │
       ▼
[ Tier 1: Brevo REST API (HTTPS Port 443) ] ──(Success)──► [ Sent ]
       │ (Failover / Limit Exceeded)
       ▼
[ Tier 2: Resend REST API (HTTPS Port 443) ] ──(Success)──► [ Sent ]
       │ (Failover)
       ▼
[ Tier 3: Google Apps Script Webhook (Port 443) ] ──(Success)──► [ Sent ]
       │ (Failover)
       ▼
[ Tier 4: Direct Nodemailer SMTP (Local / Development) ] ──► [ Sent ]
```

---

## 📡 Email Endpoints Reference

### 1. Send Adviser Onboarding Invitation
```http
POST /api/send-invitation-email
Content-Type: application/json

{
  "to": "adviser@phinmaed.com",
  "adviserName": "Prof. Juan Dela Cruz",
  "invitationLink": "https://archivio-research-system.web.app/adviser-activate?token=xyz",
  "senderName": "Dr. Academic Dean",
  "senderDepartment": "College of Information Technology",
  "message": "You have been designated as a research adviser in ARCHIVIO."
}
```

### 2. Send Student Co-Author Invitation
```http
POST /api/send-student-invitation-email
Content-Type: application/json

{
  "to": "student@phinmaed.com",
  "invitationLink": "https://archivio-research-system.web.app/student-activate?token=xyz",
  "senderName": "Team Leader Name",
  "groupName": "Capstone Group 4",
  "message": "You have been invited to join the research team."
}
```

### 3. Send College Dean Invitation
```http
POST /api/send-dean-invitation-email
Content-Type: application/json

{
  "to": "dean@phinmaed.com",
  "deanName": "Dr. Academic Dean",
  "invitationLink": "https://archivio-research-system.web.app/dean-activate?token=xyz"
}
```

### 4. Send One-Time Password (OTP) for Password Reset
```http
POST /api/send-otp
Content-Type: application/json

{
  "email": "user@phinmaed.com"
}
```
* Generates a cryptographically random 6-digit OTP.
* Hashed with **SHA-256** before being saved to Firestore.
* Expiration: 10 minutes.

### 5. Health Telemetry Endpoint
```http
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "uptime": 1284.52,
  "service": "ARCHIVIO Notification & AI Microservice",
  "timestamp": "2026-10-28T14:15:00.000Z"
}
```

---

## 🔐 Security & Validation Standards

1. **Strict Institutional Domain Check:**
   - Only validated institutional domains (`@swu.phinma.edu.ph` and `@phinmaed.com`) are authorized to initiate or receive academic credential notifications.
2. **Cryptographic Token Integrity:**
   - Invitation links contain time-limited cryptographically generated UUID tokens mapped directly to Firestore invitation documents.
3. **Environment Isolation:**
   - All API keys, SMTP credentials, and Firebase Service Accounts are isolated strictly in server-side environment variables and are never bundled into client packages.

---

## 📞 Architecture Port & Domain Mapping

| Service Layer | Local Environment | Production Cloud Domain |
| :--- | :---: | :--- |
| **Unified Portal** (Student, Adviser, Dean, Admin) | `http://localhost:5173` | [https://archivio-research-system.web.app](https://archivio-research-system.web.app) |
| **Public Research Archive** | `http://localhost:5174` | [https://archivio-public.web.app](https://archivio-public.web.app) |
| **Microservice & Swagger UI** | `http://localhost:3001` | [https://archivio-research-system.web.app/docs](https://archivio-research-system.web.app/docs) |
