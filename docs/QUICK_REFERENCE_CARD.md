# 🎯 Quick Reference Card

## The Perfect Order (Copy This!)

### **DO THIS FIRST:**

**Terminal 1:**
```bash
cd email-service && npm start
```

**Terminal 2:**
```bash
cd research-adviser-system && npm run dev
```

**Terminal 3:**
```bash
npm run dev
```

---

## **Browser Order (IMPORTANT!):**

### **1️⃣ FIRST Browser Tab - Open ONLY This:**
```
http://localhost:5176
```

✅ Login → Send Invitation → Check Email

### **2️⃣ SECOND - Click Email Link**

Email will have:
```
http://localhost:5178/student-activate?token=xxxxx
```

⚠️ Click link = Port 5178 opens automatically

### **3️⃣ Fill Form → Activate → Login → Dashboard**

---

## ❌ WHAT NOT TO DO

❌ Open http://localhost:5178 manually before email link
❌ Open both 5176 and 5178 at the same time
❌ Refresh or navigate away from activation page
❌ Click back button before activation completes

---

## ✅ What SHOULD Happen

✅ Open 5176 only
✅ Send invitation from 5176
✅ Click email link
✅ 5178 opens automatically
✅ Activation page loads
✅ Complete flow works perfectly

---

## 📧 Email Link Format

```
http://localhost:5178/student-activate?token=RANDOM_TOKEN_HERE
```

This link:
- ✅ Opens Student Portal automatically
- ✅ Loads activation page
- ✅ Shows student email
- ✅ Ready to create account

---

## 🚀 Complete Flow (Copy/Paste Order)

```
Terminal 1: cd email-service && npm start
Terminal 2: cd research-adviser-system && npm run dev
Terminal 3: npm run dev
Browser:   http://localhost:5176
Action:    Login → Send Invitation
Check:     Email inbox
Click:     Link from email
See:       http://localhost:5178 opens
Fill:      First Name, Last Name, Password
Click:     Activate Account
Login:     Email + Password
Done:      ✅ Student Dashboard
```

---

**Key:** Open 5176 first, then let email link open 5178!
