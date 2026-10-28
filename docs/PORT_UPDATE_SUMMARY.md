# ✅ ARCHIVIO Port Configuration & Architecture Summary

## 🏛️ Standard Port Mapping

ARCHIVIO operates on standardized ports across its unified frontends and microservices:

| Application | Local Port | Local URL | Production URL | Description |
| :--- | :---: | :--- | :--- | :--- |
| **Unified Academic Portal** | **5173** | `http://localhost:5173` | [https://archivio-research-system.web.app](https://archivio-research-system.web.app) | Student, Adviser, Dean & Admin portals |
| **Public Research Archive** | **5174** | `http://localhost:5174` | [https://archivio-public.web.app](https://archivio-public.web.app) | Public thesis search, reader & citations |
| **Backend REST API** | **3001** | `http://localhost:3001` | [https://archivio-research-system.web.app/docs](https://archivio-research-system.web.app/docs) | Firebase Cloud Functions v2 (`api`) |

---

## 📧 Invitation & Activation Links

All invitation dispatch handlers route to the unified portal:

- **Student Co-Author Invitation:**  
  `https://archivio-research-system.web.app/student-activate?token=...`  
  *(Local: `http://localhost:5173/student-activate?token=...`)*

- **Faculty Adviser Invitation:**  
  `https://archivio-research-system.web.app/adviser-activate?token=...`  
  *(Local: `http://localhost:5173/adviser-activate?token=...`)*

- **College Dean Invitation:**  
  `https://archivio-research-system.web.app/dean-activate?token=...`  
  *(Local: `http://localhost:5173/dean-activate?token=...`)*

---

## 💡 Key Architectural Improvement
In previous prototype versions, each portal ran in an isolated repository on separate ports (`5174`, `5176`, `5178`).  
All academic roles have now been consolidated into the **Single Page Application (SPA)** at **Port 5173**, providing seamless role-gated navigation and centralized authentication state.
