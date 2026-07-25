# Mailtrap Setup - Easy Guide

## Get Your Credentials (3 Steps)

### Step 1: Login to Mailtrap
Go to: https://mailtrap.io/

### Step 2: Go to Integrations
- Click your Inbox (should be default)
- Click **"Integrations"** button
- Find **"Nodemailer"**
- Click **"Show Credentials"** or **"Code"**

### Step 3: You'll See This:

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 465,
  auth: {
    user: "1a2b3c4d5e6f",      // <-- COPY THIS
    pass: "xyz789abc123"         // <-- COPY THIS
  }
});
```

## Update .env File

**File Location:** `C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\email-service\.env`

Replace `EMAIL_USER` and `EMAIL_PASSWORD` with your values from above:

```
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=465
EMAIL_USER=1a2b3c4d5e6f
EMAIL_PASSWORD=xyz789abc123
PORT=3001
```

## Start Email Service

Open PowerShell and run:

```powershell
cd "C:\Users\Pronce Japhet Vender\Desktop\ARCHIVIO\email-service"
npm install
npm start
```

## Test It

1. Go to Dean System (http://localhost:5173)
2. Login as Dean
3. Go to **Invitations**
4. Fill in adviser details
5. Click **Send Invitation**
6. Check Mailtrap inbox for the email!

## That's It! 🚀

Your email system is now working!
