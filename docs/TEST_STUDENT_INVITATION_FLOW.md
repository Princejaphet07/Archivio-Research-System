# 🧪 Testing: Complete Student Invitation & Activation Flow

## 🏛️ System Architecture Status

All components are fully unified and integrated:

- ✅ **Unified Academic Portal (Port 5173)** — Houses Student, Adviser, Dean, and Admin dashboards
- ✅ **Public Research Archive (Port 5174)** — Open repository for search and viewing
- ✅ **Notification Engine & API (Port 3001 / Cloud Functions)** — Sends multi-tier fallback emails and verifies tokens
- ✅ **Cloud Firestore** — Central synchronized storage for `studentInvitations`, `groups`, and `users`

---

## 🚀 Step-by-Step Testing Guide

### **Step 1: Start Applications**

**Terminal 1 — Unified Academic Portal:**
```bash
# In the root ARCHIVIO folder:
npm run dev
```
Navigate to: **`http://localhost:5173`**

**Terminal 2 (Optional) — Email & Backend Service:**
```bash
cd email-service
npm run dev
```
*(Note: If not started, API requests are automatically handled by the live Firebase Cloud Function)*

---

### **Step 2: Send Co-Author Invitation from Student Portal**

1. Open **`http://localhost:5173`** and log in as a Student Group Leader.
2. Go to **Team Management** / **Manage Members**.
3. Enter the student co-author's institutional email (e.g. `student.name@swu.phinma.edu.ph` or `@phinmaed.com`).
4. Click **Send Invitation Link**.
5. The system creates a pending record in the `studentInvitations` collection with a unique security token and dispatches the invitation email.

---

### **Step 3: Receive and Accept Invitation**

1. The invited student checks their institutional inbox for the **ARCHIVIO Invitation**.
2. Click the secure activation link:
   ```
   http://localhost:5173/student-activate?token=XXXXXXXXXXXXXXXX
   ```
   *(In production: `https://archivio-research-system.web.app/student-activate?token=XXXXXXXXXXXXXXXX`)*
3. The browser validates the token against Firestore in real time.
4. The student sets their password, confirms their full legal name, and clicks **Complete Activation**.

---

### **Step 4: Automatic Group Synchronization**

Once activated, the system automatically performs atomic synchronization across Firestore:
- Updates `studentInvitations` status to `'accepted'`.
- Appends the student's profile to the `members` array in the `groups` collection.
- Provisions their authenticated profile in the `users` collection with role `'student'`.
- The student is immediately redirected to their **Student Dashboard** (`/student`) with access to the capstone group!
