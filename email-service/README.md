# ARCHIVIO REST API Microservice

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Swagger](https://img.shields.io/badge/Swagger_UI-OpenAPI_3.1.0-85EA2D?logo=swagger&logoColor=black)](https://swagger.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase Admin](https://img.shields.io/badge/Firebase_Admin-v14-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Firebase Functions](https://img.shields.io/badge/Firebase_Functions-v2_(Cloud_Run)-039BE5?logo=firebase&logoColor=white)](https://firebase.google.com/docs/functions)

> **Interactive API Documentation:**  
> 🌐 **[https://archivio-public.web.app/docs](https://archivio-public.web.app/docs)**  
> 🌐 **[https://archivio-research-system.web.app/docs](https://archivio-research-system.web.app/docs)**

---

## 🏛️ Project & Institutional Overview

The **ARCHIVIO REST API Microservice** is the backend engine powering the **ARCHIVIO Institutional Digital Research & Capstone Management System** for **Southwestern University PHINMA**. 

Built with Node.js and Express, this microservice handles mission-critical backend tasks that require elevated administrative privileges, external AI services, and zero-failure transactional notifications.

### 👥 Capstone Project Team (SWU PHINMA BSIT)
- **Prince Japhet Vender** — Lead Programmer & Full-Stack Developer
- **Jerika Zamoras** — UI/UX Designer
- **Hylla Mae Tejada** — Project Manager
- **Andrea Cañete Perote** — Assistant Programmer

---

## 🚀 Key Responsibilities

1. **AI & Research Intelligence (Google Gemini & Groq):**
   - Grounded conversational academic Q&A over submitted theses (`/api/ai/chat`, `/api/ai/chat/stream`).
   - Automated manuscript pre-defense evaluation against institutional rubrics (`/api/ai/precheck`).
   - Keyword & tag generation for search indexing (`/api/ai/extract-keywords`).
   - Plagiarism & title duplication screening (`/api/ai/similarity-check`).
   - Automated PDF thesis summarization (`/api/ai/summarize-pdf`).

2. **Zero-Failure Multi-Provider Notification Engine:**
   - 4-Tier fallback architecture: **Brevo HTTPS API (Port 443)** ➔ **Resend HTTPS API** ➔ **Google Apps Script Webhook** ➔ **Nodemailer SMTP**.
   - Bypasses cloud host SMTP port blocks (Render/AWS/GCP block outbound ports 25, 465, 587).
   - Generates & delivers cryptographically random 6-digit SHA-256 hashed OTPs for secure password resets.

3. **Academic Role Governance & Invitations:**
   - Onboarding invitations for Research Advisers, College Deans, and Student co-authors.
   - Synchronized group acceptance across `studentInvitations`, `students`, and `groups` collections in Firestore.
   - Automated member account provisioning with temporary credentials.

4. **Document Security & Watermarking:**
   - Dynamic institutional verification watermark injection (`pdf-lib`) onto research manuscripts.
   - Tamper-evident timestamp and repository ledger stamping.

---

## 📖 API Endpoints Summary

| Category | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **System** | `GET` | `/api/health` | Service health telemetry & timestamp |
| **System** | `GET` | `/api/debug-smtp` | Diagnostic of cloud email dispatch providers |
| **System** | `GET` | `/docs` | Interactive Swagger UI API documentation |
| **System** | `GET` | `/docs/openapi.json` | OpenAPI 3.1.0 JSON specification |
| **System** | `POST` | `/api/system/bootstrap` | Initialize database collections and system foundation |
| **System** | `POST` | `/api/system/defense-reset` | Reset database to pristine state for defense presentation |
| **Auth** | `POST` | `/api/send-otp` | Request 6-digit SHA-256 hashed password reset OTP |
| **Auth** | `POST` | `/api/verify-otp` | Verify OTP code against Firestore |
| **Auth** | `POST` | `/api/reset-password` | Update user password in Firebase Auth using verified OTP |
| **Auth** | `POST` | `/api/check-auth-user` | Check if user exists in Firebase Authentication |
| **Auth** | `POST` | `/api/disable-auth-user` | Disable user account (Bearer token protected) |
| **Auth** | `POST` | `/api/enable-auth-user` | Re-enable suspended user account |
| **Auth** | `POST` | `/api/admin-delete-user-completely` | Cascading account deletion across Auth and Firestore |
| **Invitations** | `POST` | `/api/send-invitation-email` | Send onboarding invite to Research Adviser |
| **Invitations** | `POST` | `/api/send-dean-invitation-email` | Send onboarding invite to College Dean |
| **Invitations** | `POST` | `/api/send-student-invitation-email` | Invite student co-author to capstone group |
| **Invitations** | `POST` | `/api/accept-student-invitation` | Confirm and synchronize student group acceptance |
| **Invitations** | `POST` | `/api/create-group-member-account` | Provision student member Auth account with temp credentials |
| **Invitations** | `POST` | `/api/verify-school-email` | Validate `@swu.phinma.edu.ph` institutional domain & MX |
| **Messages** | `POST` | `/api/send-student-message` | Send formal adviser review feedback to students |
| **Messages** | `POST` | `/api/send-adviser-message` | Send student consultation inquiry to adviser |
| **Messages** | `POST` | `/api/send-status-email` | Notify authors of manuscript status changes |
| **AI** | `POST` | `/api/ai/chat` | Grounded academic Q&A over manuscript |
| **AI** | `POST` | `/api/ai/chat/stream` | Server-Sent Events (SSE) streaming chat |
| **AI** | `POST` | `/api/ai/precheck` | Automated pre-defense thesis rubric evaluation |
| **AI** | `POST` | `/api/ai/extract-keywords` | Automatic academic keyword extraction |
| **AI** | `POST` | `/api/ai/extract-abstract` | Structured abstract extraction from manuscript text |
| **AI** | `POST` | `/api/ai/summarize-pdf` | Executive summary generation from PDF URL |
| **AI** | `POST` | `/api/ai/similarity-check` | Plagiarism & topic duplication screening |
| **Documents** | `POST` | `/api/watermark-pdf` | Apply institutional PDF security watermarks |
| **Documents** | `POST` | `/api/delete-cloudinary` | Purge obsolete manuscript assets from Cloudinary |

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### 2. Installation
```bash
git clone https://github.com/Princejaphet07/Archivio-API.git
cd Archivio-API
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3001
FRONTEND_URL=https://archivio-public.web.app

# Firebase Service Account (JSON string or path to firebase-service-account.json)
FIREBASE_SERVICE_ACCOUNT=

# Google Gemini AI & Groq
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Zero-Failure Email Dispatch (Port 443 HTTPS APIs)
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=archivio.noreply@gmail.com
RESEND_API_KEY=
GOOGLE_SCRIPT_WEBHOOK_URL=

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 4. Running the Server
```bash
# Start production server
npm start

# Start development server with auto-reload
npm run dev
```

Once started, open your browser and visit:
👉 **`http://localhost:3001/docs`** for interactive Swagger UI documentation.

---

## ☁️ Deployment
 
 This service is deployed as a **2nd Generation Firebase Cloud Function** (`api`) running on Google Cloud in region `us-central1`:
 - **Runtime:** Node.js 20
 - **Memory Allocation:** 1 GiB (optimized for PDF parsing and manuscript analysis)
 - **Timeout:** 300 seconds (5 minutes)
 - **Trigger:** HTTPS Request / Cloud Run
 - **Production Endpoint:** `https://archivio-research-system.web.app/api/**` (rewritten via Firebase Hosting)
 - **Public Archive Endpoint:** `https://archivio-public.web.app/api/**`

---

## 📄 Academic License

Copyright © 2026 Southwestern University PHINMA.  
Engineered for academic evaluation under Capstone 2 (ITE 367). All rights reserved.
