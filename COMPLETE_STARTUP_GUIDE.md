# 🚀 Complete Startup Guide - ALL Projects

## You Need 5 Terminal Windows Total

### **All Must Run!**

---

## Terminal 1: Email Service
```bash
cd email-service
npm start
```

**Output Should Show:**
```
╔═══════════════════════════════════════╗
║   ARCHIVIO Email Service Running      ║
║   Port: 3001                          ║
║   ✅ Ready to send invitations         ║
╚═══════════════════════════════════════╝
```

✅ **Leave running**

---

## Terminal 2: Research Adviser System
```bash
cd research-adviser-system
npm run dev
```

**Output Should Show:**
```
➜ Local: http://localhost:5176/
```

✅ **Leave running**

---

## Terminal 3: Student Portal (Archivio)
```bash
npm run dev
```

(From root ARCHIVIO folder)

**Output Should Show:**
```
➜ Local: http://localhost:5178/
```

✅ **Leave running**

---

## Terminal 4: Dean System (Optional but Good to Have)
```bash
cd dean-system
npm run dev
```

**Output Should Show:**
```
➜ Local: http://localhost:5173/
```

✅ **Leave running**

---

## Terminal 5: System Administrator (Optional but Good to Have)
```bash
cd system-administrator
npm run dev
```

**Output Should Show:**
```
➜ Local: http://localhost:5174/
```

✅ **Leave running**

---

## 📊 All 5 Projects Running

| # | Terminal | Command | Port | URL |
|---|----------|---------|------|-----|
| 1 | Terminal 1 | `npm start` (email-service) | 3001 | Backend |
| 2 | Terminal 2 | `npm run dev` (research-adviser-system) | 5176 | http://localhost:5176 |
| 3 | Terminal 3 | `npm run dev` (root) | 5178 | http://localhost:5178 |
| 4 | Terminal 4 | `npm run dev` (dean-system) | 5173 | http://localhost:5173 |
| 5 | Terminal 5 | `npm run dev` (system-administrator) | 5174 | http://localhost:5174 |

---

## 🎯 For Testing Student Invitation:

**Minimum (3 Terminals):**
1. Email Service (3001)
2. Research Adviser System (5176)
3. Student Portal (5178)

**Full Setup (5 Terminals):**
1. Email Service (3001)
2. Research Adviser System (5176)
3. Student Portal (5178)
4. Dean System (5173)
5. System Administrator (5174)

---

## Browser - Test Flow

### Step 1: Open Research Adviser (5176)
```
http://localhost:5176
```

### Step 2: Login & Send Invitation
- Email: adviser@phinmaed.com
- Password: (your adviser password)
- Go to: "Send Invitations"
- Enter: prdo.vender.swu@phinmaed.com
- Click: "Send Link"

### Step 3: Check Email & Click Link
- Email: prdo.vender.swu@phinmaed.com
- Find: ARCHIVIO email
- Click: Activation link

### Step 4: Student Portal Opens (5178)
- Auto-redirects to activation page
- Fill form:
  - First Name: John
  - Last Name: Doe
  - Password: SecurePass@123
  - Confirm: SecurePass@123
- Click: "Activate Account"

### Step 5: Login to Student Portal
- Email: prdo.vender.swu@phinmaed.com
- Password: SecurePass@123
- ✅ Dashboard loads!

---

## ✅ Verification Checklist

- [ ] Terminal 1: Email Service ready (shows "✅ Ready to send invitations")
- [ ] Terminal 2: Research Adviser running (shows port 5176)
- [ ] Terminal 3: Student Portal running (shows port 5178)
- [ ] Terminal 4: Dean System running (shows port 5173) - optional
- [ ] Terminal 5: System Admin running (shows port 5174) - optional
- [ ] Browser can access http://localhost:5176
- [ ] Can send invitation from 5176
- [ ] Email received
- [ ] Can click link
- [ ] Student Portal (5178) opens
- [ ] Can activate account
- [ ] Can login

---

## 🆘 If Something Stops Working

**1. Check All Terminals Are Running:**
```
Email Service:      Terminal 1 ✅
Research Adviser:   Terminal 2 ✅
Student Portal:     Terminal 3 ✅
Dean System:        Terminal 4 ✅ (optional)
System Admin:       Terminal 5 ✅ (optional)
```

**2. If a Terminal Stopped:**
- Close that terminal window
- Open a new terminal
- Navigate to the correct folder
- Run the command again

**3. If Port Already in Use:**
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force
```

Then start again.

---

## 📝 Terminal Commands Quick Copy

```bash
# Terminal 1 - Email Service
cd email-service
npm start

# Terminal 2 - Research Adviser System
cd research-adviser-system
npm run dev

# Terminal 3 - Student Portal
npm run dev

# Terminal 4 - Dean System (optional)
cd dean-system
npm run dev

# Terminal 5 - System Administrator (optional)
cd system-administrator
npm run dev
```

---

## 🎉 Once All Running

You have:
- ✅ Email sending (3001)
- ✅ Adviser system (5176)
- ✅ Student portal (5178)
- ✅ Dean system (5173)
- ✅ Admin system (5174)

Everything works together!

---

**Answer to your question:** 
**YES! All other projects also need `npm run dev`**
- Email Service uses: `npm start`
- Everything else uses: `npm run dev`
