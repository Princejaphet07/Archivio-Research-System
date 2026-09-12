# ARCHIVIO — Institutional Research & Capstone Management System

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_Integration-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Proprietary_Academic-blue)](#license)

**ARCHIVIO** is a modern, cloud-native research archival and capstone workflow management platform engineered for higher education institutions. Designed specifically to modernize academic repository workflows, ARCHIVIO replaces fragmented manual processes with an end-to-end digital lifecycle: from team creation and proposal drafting to adviser peer review, dean endorsements, and centralized institutional archiving.

---

## Table of Contents
- [Key Features](#key-features)
- [System Architecture & Role-Based Portals](#system-architecture--role-based-portals)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Email & Backend Microservice Setup](#3-email--backend-microservice-setup)
  - [4. Running the Application](#4-running-the-application)
- [Security & Access Control](#security--access-control)
- [Deployment](#deployment)
- [Project Team & Academic Notice](#project-team--academic-notice)
- [License](#license)

---

## Key Features

- 📂 **Centralized Cloud Research Repository**: Real-time storage and instant indexing of research manuscripts, abstracts, keywords, and publication metadata.
- 👥 **Multi-Tier Role-Based Access Control (RBAC)**: Custom role-tailored dashboards for Students, Advisers, College Deans, and System Administrators.
- 📝 **End-to-End Submission & Review Workflow**: Chapter-by-chapter or full manuscript uploads, revision history, inline feedback, and formal approval steps.
- 🤖 **AI-Assisted Research Insights**: Integrated with **Google Gemini AI** and **Groq** for automated abstract summaries, research analysis, and literature assistance.
- 📄 **Interactive PDF Document Viewer**: Embedded in-browser viewing with `react-pdf` and `pdf-lib` for seamless document reading and watermarking.
- ✉️ **Automated Notification Microservice**: Dedicated Node.js microservice delivering instant OTP verifications, faculty invitations, review notifications, and progress alerts via institutional email.
- 📊 **Real-Time Institutional Analytics**: Visualized research activity metrics, departmental submission distributions, and publication statistics powered by Recharts.
- 🔒 **Enterprise-Grade Cloud Security**: Secured with Firestore database-level security rules, SHA-256 OTP hashing, Firebase Bearer Token authentication, and CORS origin restrictions.

---

## System Architecture & Role-Based Portals

ARCHIVIO enforces a strictly partitioned 4-portal system to ensure smooth academic governance:

```
                                  ┌─────────────────────────────┐
                                  │      ARCHIVIO Platform      │
                                  └──────────────┬──────────────┘
                                                 │
            ┌───────────────────┬────────────────┴────────────────┬───────────────────┐
            ▼                   ▼                                 ▼                   ▼
    ┌───────────────┐   ┌───────────────┐                 ┌───────────────┐   ┌───────────────┐
    │    Student    │   │    Adviser    │                 │   Dean / HoD  │   │  SysAdmin     │
    │    Portal     │   │    Portal     │                 │    Portal     │   │    Portal     │
    └───────┬───────┘   └───────┬───────┘                 └───────┬───────┘   └───────┬───────┘
            │                   │                                 │                   │
            │ • Submit papers   │ • Review submissions            │ • Dept. oversight │ • User mgmt
            │ • Track milestones│ • Annotate feedback             │ • Faculty invites │ • System audit
            │ • Team management │ • Approve/Reject stages         │ • Endorsement     │ • Global settings
            └─────────┬─────────┴────────────────┬────────────────┴─────────┬─────────┘
                      │                          │                          │
                      ▼                          ▼                          ▼
         ┌─────────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐
         │ Google Cloud Firestore  │ │ Firebase Auth (JWT)   │ │ Email & AI Microservice │
         │ (Real-time NoSQL DB)    │ │ (Domain & RBAC Guard) │ │ (Node.js/Express API)   │
         └─────────────────────────┘ └───────────────────────┘ └─────────────────────────┘
```

### 1. 🎓 Student Portal (`/student`)
- Form research teams and assign capstone members.
- Upload manuscript chapters, revisions, and research artifacts.
- Real-time milestone tracker following institutional research roadmaps.
- Review inline remarks and actionable evaluation feedback from advisers.

### 2. 👨‍🏫 Adviser Portal (`/adviser`)
- Dedicated dashboard tracking all advisee groups and their current phases.
- Real-time manuscript review, score evaluation, and revision change-requests.
- Approve milestone progression towards defense readiness.

### 3. 🏛️ College Dean Portal (`/dean`)
- Program-level and departmental research progress oversight.
- Generate and dispatch faculty/adviser invitation tokens.
- Review college research outputs and approve institutional publication endorsements.

### 4. ⚙️ System Administrator Portal (`/admin`)
- Global user management (accounts, role assignment, active/inactive statuses).
- System-wide security logs, activity trails, and audit monitoring.
- Institutional configuration (departments, academic years, metadata taxonomies).

---

## Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, Vite 7 | High-performance SPA with client-side routing |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | Modern responsive design and institutional UI system |
| **Data Visualization** | Recharts | Departmental and publication trend charting |
| **Cloud Database** | **Google Cloud Firestore (NoSQL)** | Schema-flexible, real-time database with live listeners |
| **Authentication** | **Firebase Authentication** | Secure token-based auth with institutional email verification |
| **Backend Microservice** | Node.js, Express.js | Dedicated auxiliary service for mailers, AI, and admin tasks |
| **Email Transport** | Nodemailer (SMTP) | Automated transactional notifications, OTPs, and invites |
| **AI Intelligence** | Google Gemini AI (`@google/generative-ai`), Groq SDK | Abstract summarization, paper categorization, and research aids |
| **Document Storage** | Cloudinary & Firebase Storage | Secure cloud asset storage and media management |
| **Document Utilities** | `react-pdf`, `pdf-lib`, `pdf-parse` | In-browser PDF rendering, parsing, and manipulation |

---

## Project Directory Structure

```plaintext
ARCHIVIO/
├── email-service/               # Auxiliary Node.js / Express microservice
│   ├── server.js                # Microservice server entrypoint (port 3001)
│   ├── package.json             # Service dependencies (nodemailer, express, etc.)
│   └── .env.example             # Template for email service credentials
│
├── public/                      # Static web assets (logos, icons, manifest)
│
├── src/                         # Frontend React application source
│   ├── admin/                   # Administrator portal pages & components
│   │   ├── pages/               # AllUsers, AuditLogs, Reports, Settings
│   │   └── components/          # Admin-specific navigation & widgets
│   ├── adviser/                 # Adviser portal pages & components
│   │   ├── pages/               # Advisees, ReviewManuscript, Approvals
│   │   └── components/          # Adviser navigation & review tools
│   ├── dean/                    # Dean portal pages & components
│   │   ├── pages/               # DepartmentOverview, Invitations, UserManagement
│   │   └── components/          # Dean-specific components & charts
│   ├── student/                 # Student portal pages & components
│   │   ├── pages/               # Dashboard, SubmitManuscript, ProgressPage
│   │   └── components/          # Student navigation & submission modals
│   ├── components/              # Shared UI components (Modals, Navbars, Buttons)
│   ├── firebase/                # Firebase client initialization & helpers
│   │   ├── config.js            # Firebase SDK configuration
│   │   └── logActivity.js       # Centralized audit logging utility
│   ├── pages/                   # Public views (Login, Register, Public Archive)
│   ├── utils/                   # Shared utilities
│   │   └── authFetch.js         # Authenticated fetch wrapper (auto-attaches Bearer token)
│   ├── App.jsx                  # Main application routes & role gatekeeper
│   └── main.jsx                 # Application DOM entry point
│
├── firestore.rules              # Production Cloud Firestore Security Rules
├── firestore.indexes.json       # Firestore composite index definitions
├── firebase.json                # Firebase deployment & hosting configuration
├── vite.config.js               # Vite build configuration
└── package.json                 # Main frontend dependencies and scripts
```

---

## Getting Started

### Prerequisites
Before running the system, make sure you have the following installed on your machine:
- **Node.js**: `v18.x` or higher (v20+ recommended) — [Download Node.js](https://nodejs.org/)
- **npm**: `v9.x` or higher (bundled with Node.js)
- **Git**: For version control — [Download Git](https://git-scm.com/)
- A **Firebase Project** with **Cloud Firestore** and **Firebase Authentication** enabled.

---

### 1. Clone Repository

```bash
git clone https://github.com/Princejaphet07/Archivio-Research-System.git
cd Archivio-Research-System
```

---

### 2. Frontend Setup

1. **Install frontend dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase Client Credentials**:
   The Firebase web configuration is managed in `src/firebase/config.js`. Ensure your Firebase project credentials match:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_FIREBASE_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Configure Environment Variables (Optional)**:
   If using external AI API features on the frontend, check the root `.env`:
   ```env
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

---

### 3. Email & Backend Microservice Setup

The auxiliary email and verification service is located in the `email-service/` directory.

1. **Navigate to the email service directory**:
   ```bash
   cd email-service
   ```

2. **Install microservice dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file from the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Edit `email-service/.env` with your actual credentials:
   ```env
   # Institutional SMTP Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-institutional-email@phinmaed.com
   EMAIL_PASSWORD=your-google-app-password

   # Service Port
   PORT=3001

   # CORS Allowed Frontend Origin
   FRONTEND_URL=https://your-archivio-domain.vercel.app

   # Cloudinary Storage Credentials
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # AI Integration
   GEMINI_API_KEY=your-google-gemini-api-key
   ```

---

### 4. Running the Application

For full system functionality (including email invitations and OTP verification), run **both** the frontend development server and the email microservice:

#### Terminal 1 — Start the Frontend (Port 5173):
```bash
# In the root project folder:
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173`**

#### Terminal 2 — Start the Email & Backend Service (Port 3001):
```bash
# In a new terminal window:
cd email-service
node server.js
# Or with nodemon for auto-reloading:
npm run dev
```

---

## Security & Access Control

ARCHIVIO implements a multi-layer defense strategy to safeguard institutional academic records:

1. **Database-Level Firestore Rules**:
   - Every read and write query is evaluated against `firestore.rules`.
   - Direct database access is restricted strictly to authenticated users with matching role claims.
   - Deans and Admins are verified via server-checked collection documents or custom role tokens.
2. **Cryptographic OTP Security**:
   - One-Time Passwords (OTPs) are hashed using **SHA-256** prior to storage in Firestore to prevent exposure even to database viewers.
   - OTP records include strict expiration timestamps and single-use invalidation flags.
3. **API Endpoint Guard**:
   - Protected endpoints on the auxiliary microservice require a valid Firebase ID Token passed via `Authorization: Bearer <token>`, verified server-side using the `firebase-admin` SDK.
4. **CORS Hardening & Rate Limiting**:
   - API endpoints enforce origin whitelisting (`localhost` during development, production domains in deployment).
   - High-sensitivity routes (such as OTP requests and invitation dispatches) are guarded against abuse using `express-rate-limit`.

---

## Deployment

### Frontend (Vercel / Netlify / Firebase Hosting)
The frontend is optimized for static hosting platforms. Build the production bundle:
```bash
npm run build
```
The output will be generated in the `dist/` directory, ready to deploy to **Vercel**, **Netlify**, or **Firebase Hosting**.

### Email Microservice (Render / Railway / VPS / Cloud Run)
The Node.js `email-service` can be deployed independently as a microservice on platforms like **Render**, **Railway**, or any standard Linux VPS using a process manager like PM2:
```bash
pm2 start server.js --name "archivio-email-service"
```

---

## Project Team & Academic Notice

* **Project Title:** ARCHIVIO: Institutional Digital Research & Capstone Repository System
* **Lead Developer / Project Owner:** Prince Japhet
* **GitHub Repository:** [Princejaphet07/Archivio-Research-System](https://github.com/Princejaphet07/Archivio-Research-System)
* **Institution:** Southwestern University PHINMA

---

## License

**Academic Proprietary License**  
Copyright © 2026 Southwestern University PHINMA. All Rights Reserved.

This project was engineered for academic demonstration, evaluation, and institutional use under Southwestern University PHINMA. Unauthorized reproduction, modification, distribution, or commercialization of this codebase without explicit written consent from the project author and institutional authorities is strictly prohibited.
