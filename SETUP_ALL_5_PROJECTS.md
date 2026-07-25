# Setup Guide: Running All 5 ARCHIVIO Projects

## 🎯 Quick Start (5 Terminal Windows)

### Prerequisites
- Node.js installed
- All dependencies installed (`npm install` in each project folder)
- Email service `.env` configured

---

## Step-by-Step Setup

### **Terminal 1: Email Service (START FIRST!)**
```bash
cd email-service
npm start
```

Expected output:
```
╔═══════════════════════════════════════╗
║   ARCHIVIO Email Service Running      ║
║   Port: 3001                          ║
║   ✅ Ready to send invitations        ║
╚═══════════════════════════════════════╝

Endpoints:
  POST /api/send-invitation-email
  POST /api/send-student-invitation-email
  POST /api/send-dean-invitation-email
  GET  /api/health
```

✅ **Email service is ready!**

---

### **Terminal 2: System Administrator (Port 5174)**
```bash
cd system-administrator
npm run dev
```

✅ Navigate to: http://localhost:5174
- Admin login
- Create dean accounts
- Send dean invitations via email

---

### **Terminal 3: Dean System (Port 5173)**
```bash
cd dean-system
npm run dev
```

✅ Navigate to: http://localhost:5173
- Dean login (with link from email)
- Create adviser accounts
- Send adviser invitations via email

---

### **Terminal 4: Research Adviser System (Port 5176)**
```bash
cd research-adviser-system
npm run dev
```

✅ Navigate to: http://localhost:5176
- Adviser login (with link from email)
- Create student accounts
- Send student invitations via email

---

### **Terminal 5: Student Portal (Port 5178)**
```bash
npm run dev
```

(From root ARCHIVIO directory)

✅ Navigate to: http://localhost:5178
- Student login (with link from email)
- Student dashboard
- View research projects

---

## 📊 Port Summary

| Project | Port | URL | Purpose |
|---------|------|-----|---------|
| System Administrator | 5174 | http://localhost:5174 | Create Deans |
| Dean System | 5173 | http://localhost:5173 | Create Advisers |
| Research Adviser | 5176 | http://localhost:5176 | Create Students |
| Student Portal | 5178 | http://localhost:5178 | Student Access |
| Email Service | 3001 | (Backend only) | Send Emails |

---

## 🧪 Test the Complete Flow

### 1. **Create Dean Account**
- Open System Administrator (5174)
- Click "Create Dean Account"
- Fill in dean info with @phinmaed.com email
- Click "Send Invite & Create Account"
- ✅ Dean receives email with activation link

### 2. **Activate Dean Account**
- Open email inbox (prdo.vender.swu@phinmaed.com)
- Click activation link from System Administrator
- Create dean account in Dean System
- ✅ Dean account activated

### 3. **Send Adviser Invitation**
- Navigate to Dean System (5173)
- Login as dean
- Go to "Send Invitations"
- Enter adviser email (@phinmaed.com)
- Click "Send Link"
- ✅ Adviser receives email

### 4. **Activate Adviser Account**
- Open email and click activation link
- Create adviser account
- ✅ Adviser logged in to Research Adviser System

### 5. **Send Student Invitation**
- Navigate to Research Adviser System (5176)
- Login as adviser
- Go to "Send Invitations"
- Enter student email (@phinmaed.com)
- Click "Send Link"
- ✅ Student receives email

### 6. **Activate Student Account**
- Open email and click activation link
- Create student account
- Login to Student Portal
- ✅ Full flow complete!

---

## 🔍 Health Check

Test email service is working:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Email service is running"
}
```

---

## 📧 Email Testing

### Send Test Email (Advanced)
```bash
curl -X POST http://localhost:3001/api/send-dean-invitation-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "prdo.vender.swu@phinmaed.com",
    "deanName": "Test User",
    "invitationLink": "http://localhost:5173/dean-activate?token=testtoken",
    "message": "This is a test email"
  }'
```

---

## ⚠️ Troubleshooting

### "Port already in use"
Kill existing process:
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force

# Or find specific port
netstat -ano | findstr :5174
taskkill /PID [PID] /F
```

### "Cannot find module 'express'"
```bash
npm install
```

### "Email not sending"
1. Check email service is running (Terminal 1)
2. Check .env file in email-service folder
3. Check Gmail inbox and spam folder
4. Check network connectivity

### "Invitation link not working"
1. Make sure you clicked within 7 days
2. Check the port matches (5173, 5175, 5176)
3. Try resending the invitation
4. Check browser console for errors

---

## 🎉 You're All Set!

All 5 projects are now connected and ready to use:

✅ System Administrator → Creates deans
✅ Dean System → Creates advisers
✅ Research Adviser → Creates students
✅ Student Portal → Student access
✅ Email Service → Sends all invitations

**Start with Terminal 1 (Email Service) first, then the others!**

---

**Need help?** Check the detailed integration guide: `EMAIL_SERVICE_INTEGRATION.md`
