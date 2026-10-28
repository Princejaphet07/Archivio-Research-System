# 🚀 ARCHIVIO: Complete Startup & Local Development Guide

## 🏛️ System Architecture Overview
The current ARCHIVIO architecture is divided into two responsive frontend applications and a high-performance backend microservice (deployed as a 2nd Gen Firebase Cloud Function):

1. **Unified Academic Portal (`/`)** — Handles all authenticated institutional roles:
   - 🎓 Student Portal (`/student`)
   - 👨‍🏫 Research Adviser Portal (`/adviser`)
   - 🏛️ College Dean Portal (`/dean`)
   - ⚙️ System Administrator Portal (`/admin`)
2. **Public Research Archive (`public-archive/`)** — Open-access repository for searching, citing, and viewing watermarked research manuscripts.
3. **Backend REST API (`email-service/`)** — Node.js & Express microservice powering Google Gemini AI, PDF watermarking, invitations, and OTP password recovery.

---

## 💻 Running the System Locally

### **Terminal 1: Unified Academic Portal (Port 5173)**
```bash
# In the root ARCHIVIO folder:
npm install
npm run dev
```
- **Local URL:** `http://localhost:5173`
- **Handles:** Student, Adviser, Dean, and Admin logins.

---

### **Terminal 2: Public Research Archive (Port 5174)**
```bash
# In a new terminal window:
cd public-archive
npm install
npm run dev
```
- **Local URL:** `http://localhost:5174`
- **Handles:** Public search, document viewing with institutional watermark, and citation generator.

---

### **Terminal 3 (Optional): Local Backend API (Port 3001)**
```bash
# In a new terminal window:
cd email-service
npm install
npm run dev
```
- **Local URL:** `http://localhost:3001`
- **Swagger Documentation:** `http://localhost:3001/docs`

> 💡 **Developer Note:** Running Terminal 3 locally is **optional**! ARCHIVIO's centralized `src/utils/backendUrl.js` automatically proxies API calls directly to the live Firebase Cloud Function (`https://archivio-research-system.web.app`) when testing on localhost, unless `VITE_USE_LOCAL_BACKEND=true` is explicitly set in `.env.local`.

---

## 🌐 Production Cloud URLs

| Component | Production Cloud URL | Hosting Platform |
| :--- | :--- | :--- |
| **Unified Academic Portal** | [https://archivio-research-system.web.app](https://archivio-research-system.web.app) | Firebase Hosting (`main` target) |
| **Public Research Archive** | [https://archivio-public.web.app](https://archivio-public.web.app) | Firebase Hosting (`public-archive` target) |
| **Backend API & Swagger Docs** | [https://archivio-research-system.web.app/docs](https://archivio-research-system.web.app/docs) | Firebase Cloud Functions Gen 2 (`api`) |
| **Cloud Database** | Cloud Firestore (`archivio-research-system`, `nam5`) | Google Cloud Platform |

---

## 🧪 Testing Role Portals & Workflows

### 1. Student Submission Flow
1. Navigate to `http://localhost:5173` (or production).
2. Register or log in with your institutional `@swu.phinma.edu.ph` account.
3. Form a capstone team, select your research adviser, and upload defense milestone chapters.

### 2. Adviser Review Flow
1. Log in with adviser credentials at `http://localhost:5173`.
2. Access the **Adviser Dashboard** (`/adviser`).
3. Inspect advisee submissions, provide rubric feedback, request revisions, or formally endorse the paper to the Dean.

### 3. Dean Approval Flow
1. Log in with Dean credentials at `http://localhost:5173`.
2. Access the **Dean Portal** (`/dean`).
3. Verify department endorsements, review manuscripts, and click **Approve for Archival**.

### 4. Public Discovery
1. Open `http://localhost:5174` (or `https://archivio-public.web.app`).
2. Search for the approved thesis title.
3. Read the watermarked manuscript and generate APA/MLA/IEEE citations.
