# 🚀 Quick Start: Test Student Invitation System

## 5-Minute Test

### **Terminal 1: Start Email Service**
```bash
cd email-service
npm start
```
✅ Wait for "✅ Ready to send invitations"

---

### **Terminal 2: Start Research Adviser System**
```bash
cd research-adviser-system
npm run dev
```
✅ Navigate to: http://localhost:5176

---

### **Terminal 3: Start Student Portal**
```bash
npm run dev
```
✅ Navigate to: http://localhost:5178

---

## Test Steps

### 1️⃣ **Login to Research Adviser (Port 5176)**
- Email: adviser@phinmaed.com
- Password: (your adviser password)

### 2️⃣ **Send Invitation**
- Click: "Send Invitations"
- Email: `prdo.vender.swu@phinmaed.com`
- Click: "Send Link"
- ✅ See: "Invitation sent to prdo.vender.swu@phinmaed.com!"

### 3️⃣ **Check Email**
- Open: prdo.vender.swu@phinmaed.com
- Look for: Email from ARCHIVIO
- Click: Blue button or link

### 4️⃣ **Activate Account (Port 5175)**
- First Name: John
- Last Name: Doe
- Password: SecurePass@123
- Confirm: SecurePass@123
- Check: "I agree to terms"
- Click: "Activate Account"
- ✅ Auto-redirects to Login

### 5️⃣ **Login (Port 5175)**
- Email: prdo.vender.swu@phinmaed.com
- Password: SecurePass@123
- Click: "Login"
- ✅ See: Student Dashboard

---

## ✅ It Works If You See:

| Step | Should See |
|------|-----------|
| Step 2 | ✅ Green success message |
| Step 3 | 📧 Email in inbox |
| Step 4 | ✅ "Account activated successfully!" |
| Step 5 | 🎓 Student dashboard with tabs |

---

## 🔧 If Email Doesn't Arrive

1. Check email service running in Terminal 1
2. Check inbox AND spam folder
3. Check you're using correct email: `prdo.vender.swu@phinmaed.com`
4. Try resending from Research Adviser System

---

## 📱 System Ports

| What | Port | URL |
|------|------|-----|
| Research Adviser | 5176 | http://localhost:5176 |
| Student Portal | 5178 | http://localhost:5178 |
| Email Service | 3001 | http://localhost:3001 (Backend) |

---

## 💾 Remember

- Email domain: Must be `@phinmaed.com`
- Password: 8+ chars, uppercase, number, special char
- Link expires: In 7 days
- Email: Check both inbox AND spam

---

## 📚 Full Docs

- Detailed testing: `TEST_STUDENT_INVITATION_FLOW.md`
- All 5 projects: `SETUP_ALL_5_PROJECTS.md`
- Technical details: `EMAIL_SERVICE_INTEGRATION.md`

---

**Status: ✅ READY TO TEST**

Start Terminal 1, then Terminals 2 & 3, then follow the 5 steps above!
