# 🎯 ARCHIVIO Localhost Testing Order & Quick Start

## 📋 Running the Applications

### **Step 1: Start Applications**

1. **Terminal 1: Unified Academic Portal**
   ```bash
   npm run dev
   ```
   Access at: **`http://localhost:5173`**

2. **Terminal 2: Public Research Archive**
   ```bash
   cd public-archive
   npm run dev
   ```
   Access at: **`http://localhost:5174`**

*(Backend API is served via Firebase Cloud Functions automatically, or run `cd email-service && npm run dev` on port 3001 if modifying backend code).*

---

## 🧪 Testing Invitation & Multi-Role Flows

### Student Co-Author Onboarding:
1. Log into `http://localhost:5173` as a Student Group Leader.
2. Under **Team Management**, send an invite to your co-author's `@swu.phinma.edu.ph` / `@phinmaed.com` email.
3. Open the activation link from the received email:
   `http://localhost:5173/student-activate?token=...`
4. Set credentials and activate account.
5. Log in — the new co-author is immediately enrolled into the group roster!
