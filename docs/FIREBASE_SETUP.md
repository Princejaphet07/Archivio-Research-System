# 🔥 Firebase Setup & Infrastructure Guide for ARCHIVIO

## 📋 Institutional Architecture
ARCHIVIO is built on a serverless Google Cloud / Firebase ecosystem:
- **Project ID:** `archivio-research-system`
- **Location:** `nam5` (Firestore Multi-Region) / `us-central1` (Cloud Functions)
- **Database Engine:** Google Cloud Firestore (NoSQL)
- **Auth Engine:** Firebase Authentication (JWT with custom role authorization)
- **Serverless Compute:** Firebase Cloud Functions Gen 2 (Google Cloud Run)
- **Static Hosting:** Firebase Hosting with multi-target site mappings (`main` & `public-archive`)

---

## 📱 Web Apps & Codebases in Firebase

You only maintain **two client frontend apps** and **one Cloud Function**:

| Component | Target Name | Directory | Production Hosting URL |
| :--- | :--- | :--- | :--- |
| **Unified Academic Portal** | `main` | `src/` (root) | [https://archivio-research-system.web.app](https://archivio-research-system.web.app) |
| **Public Research Archive** | `public-archive` | `public-archive/` | [https://archivio-public.web.app](https://archivio-public.web.app) |
| **Backend REST API** | `default` (Cloud Function) | `email-service/` | `https://archivio-research-system.web.app/api/**` (rewritten) |

---

## 🔧 Firebase Services Configuration

### 1. Authentication
- Provider: **Email/Password**
- Institutional Domain Guard: Client and backend enforce `@swu.phinma.edu.ph` / `@phinmaed.com`.
- Password Recovery: 6-digit SHA-256 hashed OTPs generated via the API microservice.

### 2. Cloud Firestore Database
- Mode: **Production**
- Rules Reference: `firestore.rules` (Security version 2 with role-gated collections).
- Indexing Reference: `firestore.indexes.json` (Compound indexes for filtered thesis searches).

### 3. Cloud Functions (Gen 2 / Cloud Run)
- Defined in `email-service/index.js`:
  ```javascript
  exports.api = onRequest({
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
    maxInstances: 10,
    region: 'us-central1',
    invoker: 'public'
  }, app);
  ```
- Memory: **1 GiB** (optimized for PDF extraction and AI processing).
- Timeout: **300 seconds** (5 minutes).

### 4. Extensions
- **Trigger Email from Firestore (`ext-firestore-send-email-processqueue`)**:
  - Automatically dispatches queued email documents written to Firestore.

---

## 🚀 Deployment Commands

Deploy the entire system with the Firebase CLI:
```bash
# Build both web apps:
npm run build
cd public-archive && npm run build && cd ..

# Deploy everything:
firebase deploy

# Or deploy specific services:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,storage:rules
```
