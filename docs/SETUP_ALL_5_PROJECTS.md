# 🎯 ARCHIVIO: Unified Platform Architecture & Setup

> 📌 **Notice:** The project has been modernized and unified into the single **ARCHIVIO Unified Academic System** + **Public Research Archive**. Running 5 separate project terminals is obsolete.

---

## 🏛️ Modern Architecture Layout

Instead of maintaining 5 disconnected apps on different ports (`5173`, `5174`, `5176`, `5178`), ARCHIVIO now operates on a clean, decoupled 2-Frontend + Serverless Cloud Function architecture:

| Component | Directory | Local Port | Production URL |
| :--- | :--- | :---: | :--- |
| **Unified Academic Portal** (Student, Adviser, Dean, Admin) | `src/` (root) | `5173` | [https://archivio-research-system.web.app](https://archivio-research-system.web.app) |
| **Public Research Archive** (Search, Viewer, Citations) | `public-archive/` | `5174` | [https://archivio-public.web.app](https://archivio-public.web.app) |
| **REST API Microservice** (AI, OTP, Email, Watermarking) | `email-service/` | `3001` | [https://archivio-research-system.web.app/docs](https://archivio-research-system.web.app/docs) |

---

## ⚡ Quick Start (Only 2 Terminals Needed!)

### **Terminal 1: Unified Academic Portal**
```bash
# In the root ARCHIVIO folder:
npm run dev
```
Navigate to: **`http://localhost:5173`**
- Role-based automatic routing:
  - 🎓 **Student Portal:** `http://localhost:5173/student`
  - 👨‍🏫 **Adviser Portal:** `http://localhost:5173/adviser`
  - 🏛️ **Dean Portal:** `http://localhost:5173/dean`
  - ⚙️ **Administrator Portal:** `http://localhost:5173/admin`

### **Terminal 2: Public Research Archive**
```bash
cd public-archive
npm run dev
```
Navigate to: **`http://localhost:5174`**
- Open-access public thesis discovery and watermarked reading.

---

## ☁️ Cloud Functions (Backend API)
The backend runs natively as a **2nd Generation Firebase Cloud Function (Google Cloud Run)** in `us-central1`.

- Local development automatically proxies calls to the live function via `src/utils/backendUrl.js`.
- If you need to make changes to backend endpoints, run:
  ```bash
  cd email-service
  npm run dev
  ```
