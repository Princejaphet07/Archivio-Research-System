# 🔥 Firebase Infrastructure & Architecture Summary

## 🏛️ Ecosystem Overview
ARCHIVIO is built on a serverless Google Cloud / Firebase architecture, powering both the **Unified Academic Portal** and the **Public Research Archive**:

### 1. Unified Client Architecture
- **Unified Academic Portal:** `src/firebase/config.js`  
  Powers the Student, Adviser, Dean, and Administrator portals within a single Vite application.
- **Public Research Archive:** `public-archive/src/firebase/config.js`  
  Powers public manuscript discovery, citations, and watermarked reading.

### 2. Backend & Serverless API
- **Firebase Cloud Functions (Gen 2):** `email-service/` deployed to `us-central1` on Google Cloud Run.
- **Firebase Hosting Rewrites:** Routes `/api/**` on both frontend domains straight to the Cloud Function with zero CORS issues.
- **Firestore Trigger Extension:** `ext-firestore-send-email-processqueue` handles queued transactional mailers.

---

## 🚀 Quick Deployment Reference
```bash
# Production builds
npm run build
cd public-archive && npm run build && cd ..

# Deploy all services
firebase deploy
```
