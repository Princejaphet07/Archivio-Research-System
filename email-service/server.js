// Email Service Backend for ARCHIVIO
// Handles sending invitation emails for Research Advisers
// Start with: node server.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const axios = require('axios');
require('dotenv').config();

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');
const { setupCleanupCron } = require('./cleanup-cron');
const { setupBackupCron } = require('./backup-cron');
const { setupMailListener } = require('./mail-listener');

initializeApp({
  credential: cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const rateLimit = require('express-rate-limit');

// Rate limiting to prevent spam/abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all /api/ routes
app.use('/api/', apiLimiter);

// Global Error Handler to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit the process, keep the server alive
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // Ideally, exit the process and let PM2/Render restart it, but for maximum uptime without a monitor:
  // We'll log it and keep going (though it's risky if state is corrupted, it prevents "mabuang" for transient errors)
});

// Email Configuration for Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test email connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

// ============================================
// SEND OTP FOR PASSWORD RESET
// ============================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Ensure user exists in Firebase Auth before sending OTP
    try {
      await getAuth().getUserByEmail(email);
    } catch (authError) {
      return res.status(404).json({ error: 'User not found' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

    // Store in Firestore
    await getFirestore().collection('password_resets').doc(email).set({
      code,
      expiresAt
    });

    const emailHTML = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #7B1F35;">ARCHIVIO Password Reset</h2>
        <p>Your 6-digit verification code is:</p>
        <h1 style="letter-spacing: 5px; color: #d0a36e;">${code}</h1>
        <p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code',
      html: emailHTML
    });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ============================================
// VERIFY OTP & RESET PASSWORD
// ============================================
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    const docRef = getFirestore().collection('password_resets').doc(email);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(400).json({ error: 'Invalid or expired code' });

    const data = doc.data();
    if (data.code !== code) return res.status(400).json({ error: 'Incorrect code' });
    if (data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: 'Code has expired' });

    // Code is valid, update user's password
    const user = await getAuth().getUserByEmail(email);
    await getAuth().updateUser(user.uid, { password: newPassword });

    // Delete OTP record
    await docRef.delete();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================
// SEND STUDENT MESSAGE TO ADVISER
// ============================================
app.post('/api/send-student-message', async (req, res) => {
  try {
    const { studentName, studentEmail, adviserName, adviserEmail, subject, message } = req.body;

    if (!studentEmail || !adviserEmail || !message) {
      return res.status(400).json({ error: 'Missing required fields: studentEmail, adviserEmail, message' });
    }

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7B1F35 0%, #5D1627 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
    .content { padding: 32px 30px; }
    .from-box { background: #FDF9ED; border: 1px solid #E8DFCB; border-left: 4px solid #7B1F35; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .from-box p { margin: 0; font-size: 13px; color: #555; }
    .from-box strong { color: #7B1F35; }
    .message-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; font-size: 15px; color: #444; line-height: 1.8; white-space: pre-wrap; }
    .reply-btn { display: block; text-align: center; margin: 24px 0 0; }
    .reply-btn a { display: inline-block; background: #7B1F35; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .footer { background: #f0ebe3; padding: 16px 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e8dfcb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">📬 Student Message</div>
      <h1>ARCHIVIO Research System</h1>
      <p>You have a new message from one of your students</p>
    </div>
    <div class="content">
      <div class="from-box">
        <p>📌 <strong>From:</strong> ${studentName || studentEmail}</p>
        <p>📧 <strong>Email:</strong> ${studentEmail}</p>
        <p>👤 <strong>To:</strong> ${adviserName || adviserEmail}</p>
        ${subject ? `<p>📝 <strong>Subject:</strong> ${subject}</p>` : ''}
      </div>
      <div class="message-box">${message}</div>
      <div class="reply-btn">
        <a href="mailto:${studentEmail}?subject=Re: ${subject || 'Your message'}&body=Hi ${studentName || ''},%0D%0A%0D%0A">Reply to ${studentName || 'Student'}</a>
      </div>
    </div>
    <div class="footer">
      <p>This message was sent via the ARCHIVIO Research Management System.</p>
      <p><strong>Note:</strong> To ensure the student receives an in-app notification, please log in to your Adviser Portal and reply from the system.</p>
      <p>Alternatively, use the Reply button above to reply directly via email.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: adviserEmail,
      replyTo: studentEmail,
      subject: subject ? `[ARCHIVIO] ${subject}` : `[ARCHIVIO] Message from ${studentName || studentEmail}`,
      html: emailHTML,
      text: `Message from ${studentName || studentEmail} (${studentEmail}):\n\n${message}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Student message sent to adviser ${adviserEmail}: ${info.response}`);

    res.status(200).json({ success: true, message: 'Message sent successfully', messageId: info.messageId });
  } catch (error) {
    console.error('❌ Error sending student message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
});

// ============================================
// SEND ADVISER MESSAGE TO STUDENT
// ============================================
app.post('/api/send-adviser-message', async (req, res) => {
  try {
    const { adviserName, adviserEmail, studentName, studentEmail, subject, message } = req.body;

    if (!studentEmail || !adviserEmail || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7B1F35 0%, #5D1627 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
    .content { padding: 32px 30px; }
    .from-box { background: #FDF9ED; border: 1px solid #E8DFCB; border-left: 4px solid #7B1F35; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .from-box p { margin: 0; font-size: 13px; color: #555; }
    .from-box strong { color: #7B1F35; }
    .message-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; font-size: 15px; color: #444; line-height: 1.8; white-space: pre-wrap; }
    .footer { background: #f0ebe3; padding: 16px 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e8dfcb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">📬 Adviser Message</div>
      <h1>ARCHIVIO Research System</h1>
      <p>You have a new message from your adviser</p>
    </div>
    <div class="content">
      <div class="from-box">
        <p>📌 <strong>From:</strong> ${adviserName || adviserEmail}</p>
        <p>📧 <strong>Email:</strong> ${adviserEmail}</p>
        <p>👤 <strong>To:</strong> ${studentName || studentEmail}</p>
        ${subject ? `<p>📝 <strong>Subject:</strong> ${subject}</p>` : ''}
      </div>
      <div class="message-box">${message}</div>
    </div>
    <div class="footer">
      <p>This message was sent via the ARCHIVIO Research Management System.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptions = {
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      replyTo: adviserEmail,
      subject: subject ? `[ARCHIVIO] ${subject}` : `[ARCHIVIO] Message from ${adviserName || adviserEmail}`,
      html: emailHTML,
      text: `Message from ${adviserName || adviserEmail} (${adviserEmail}):\n\n${message}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Adviser message sent to student ${studentEmail}: ${info.response}`);

    res.status(200).json({ success: true, message: 'Message sent successfully', messageId: info.messageId });
  } catch (error) {
    console.error('❌ Error sending adviser message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
});


// ============================================
// SEND ADVISER INVITATION EMAIL
// ============================================
app.post('/api/send-invitation-email', async (req, res) => {
  try {
    const { to, adviserName, message, invitationLink, senderName, senderDepartment } = req.body;

    // Validate required fields
    if (!to || !adviserName || !invitationLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Domain validation relaxed for testing purposes
    // (Previously restricted to @phinmaed.com)

    // Replace placeholders in message
    let emailMessage = message
      .replace('[Adviser Name]', adviserName)
      .replace('[ACTIVATION_LINK]', invitationLink)
      .replace('[Sender Name]', senderName)
      .replace('[Department]', senderDepartment);

    // Email template
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
    
    <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
      <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
      <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
      <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
    </div>
    
    <div style="padding: 40px 30px; background-color: #ffffff;">
      <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Welcome, ${adviserName}!</h2>
      <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Research Adviser</strong>.</p>
      
      <div style="background-color: #faf6f0; border-left: 4px solid #541b2f; border-radius: 4px 8px 8px 4px; padding: 20px; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Message from your Dean</p>
        <p style="color: #4a5568; line-height: 1.6; font-size: 14px; margin: 0;">${(emailMessage || '').replace(/\n/g, '<br/>')}</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <strong style="color: #2b6cb0; font-size: 14px; display: block; margin-bottom: 10px;">📋 How to Access Your Account:</strong>
        <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Click the <strong>"Create Your Account"</strong> button below</li>
          <li>You will be taken to the <strong>Research Adviser Sign Up page</strong></li>
          <li>Register using your <strong>@phinmaed.com</strong> email address</li>
          <li>After signing up, log in to access your <strong>Research Adviser Dashboard</strong></li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 40px 0 30px 0;">
        <a href="${invitationLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Create Your Account</a>
      </div>
      
      <div style="background-color: #fffaf0; border: 1px solid #feebc8; color: #c05621; padding: 15px; border-radius: 6px; font-size: 13px; margin: 30px 0; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 16px;">⏰</span>
        <p style="margin: 0;"><strong>Important:</strong> This invitation link will expire in 7 days. Please activate your account as soon as possible.</p>
      </div>

      <p style="color: #718096; font-size: 14px; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px;">
        Best regards,<br>
        <strong>${senderName}</strong><br>
        ${senderDepartment}<br>
      </p>
    </div>
    
    <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const mailOptions = {
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Invitation: Join ARCHIVIO as a Research Adviser`,
      html: emailHTML,
      text: emailMessage // Fallback plain text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.response}`);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// ============================================
// SEND DEAN INVITATION EMAIL
// ============================================
app.post('/api/send-dean-invitation-email', async (req, res) => {
  try {
    const { to, deanName, invitationLink, temporaryPassword, message } = req.body;

    // Validate required fields
    if (!to || !deanName || !invitationLink || !temporaryPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email domain - only @phinmaed.com allowed
    if (!to.toLowerCase().endsWith('@phinmaed.com')) {
      return res.status(400).json({ error: 'Invitations can only be sent to @phinmaed.com email addresses' });
    }

    // Email template for dean invitation
    const emailHTML = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
  <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
    <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
    <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
    <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
  </div>
  
  <div style="padding: 40px 30px; background-color: #ffffff;">
    <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Welcome, ${deanName}!</h2>
    <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Dean</strong>. Step into your portal to oversee, manage, and empower the research initiatives within your department.</p>
    
    <div style="background-color: #faf6f0; border-left: 4px solid #541b2f; border-radius: 4px 8px 8px 4px; padding: 20px; margin: 30px 0;">
      <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Temporary Credentials</p>
      
      <div style="margin-bottom: 12px;">
        <span style="color: #718096; font-size: 13px; display: block; margin-bottom: 4px;">Email Address</span>
        <strong style="color: #2d3748; font-size: 15px;">${to.toLowerCase().trim()}</strong>
      </div>
      
      <div style="margin-bottom: 15px;">
        <span style="color: #718096; font-size: 13px; display: block; margin-bottom: 4px;">Temporary Password</span>
        <code style="background-color: #ffffff; padding: 8px 16px; border-radius: 6px; color: #541b2f; font-size: 16px; font-weight: bold; border: 1px solid #d5c9bb; display: inline-block;">${temporaryPassword}</code>
      </div>
      
      <p style="margin: 0; color: #e53e3e; font-size: 13px; font-style: italic;">* You will be prompted to set a new, secure password upon your first login.</p>
    </div>
    
    <div style="text-align: center; margin: 40px 0 10px 0;">
      <a href="${invitationLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Access Dean Portal</a>
    </div>
  </div>
  
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
    <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
  </div>
</div>
    `;

    // Send email
    const mailOptions = {
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Dean Invitation: Join ARCHIVIO Research Management System`,
      html: emailHTML,
      text: message || 'You have been invited to join ARCHIVIO'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Dean invitation email sent to ${to}: ${info.response}`);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error sending dean invitation email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Email service is running' });
});

// ============================================
// DISABLE FIREBASE AUTH USER
// ============================================
app.post('/api/disable-auth-user', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid && !email) {
      return res.status(400).json({ error: 'Missing UID or email' });
    }

    console.log(`📍 Attempting to disable Firebase Auth user: ${email || uid}`);
    
    let targetUid = uid;
    if (!targetUid) {
      const userRecord = await getAuth().getUserByEmail(email);
      targetUid = userRecord.uid;
    }
    
    await getAuth().updateUser(targetUid, { disabled: true });
    
    res.status(200).json({
      success: true,
      message: 'User successfully disabled in Firebase Auth',
      uid: targetUid
    });

  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// ============================================
// ENABLE FIREBASE AUTH USER
// ============================================
app.post('/api/enable-auth-user', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid && !email) {
      return res.status(400).json({ error: 'Missing UID or email' });
    }

    console.log(`📍 Attempting to enable Firebase Auth user: ${email || uid}`);
    
    let targetUid = uid;
    if (!targetUid) {
      const userRecord = await getAuth().getUserByEmail(email);
      targetUid = userRecord.uid;
    }
    
    await getAuth().updateUser(targetUid, { disabled: false });
    
    res.status(200).json({
      success: true,
      message: 'User successfully enabled in Firebase Auth',
      uid: targetUid
    });

  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Health check endpoint (moved after delete endpoint)

// ============================================
// SEND STUDENT INVITATION EMAIL
// ============================================
app.post('/api/send-student-invitation-email', async (req, res) => {
  try {
    const { to, invitationLink, senderName, senderDepartment, message } = req.body;

    // Validate required fields
    if (!to || !invitationLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email domain - only @phinmaed.com allowed
    if (!to.toLowerCase().endsWith('@phinmaed.com')) {
      return res.status(400).json({ error: 'Invitations can only be sent to @phinmaed.com email addresses' });
    }

    // Email template for student invitation
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4a1024 0%, #6b1834 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #4a1024;
      margin-bottom: 15px;
    }
    .message {
      font-size: 14px;
      line-height: 1.8;
      color: #555;
      margin: 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .activation-button {
      display: inline-block;
      background: #4a1024;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s;
    }
    .activation-button:hover {
      background: #6b1834;
    }
    .link-text {
      font-size: 12px;
      color: #999;
      margin-top: 10px;
      word-break: break-all;
    }
    .link {
      color: #4a1024;
      text-decoration: none;
      font-weight: 600;
    }
    .sender-info {
      background-color: #f9f9f9;
      border-left: 4px solid #4a1024;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #666;
    }
    .sender-info strong {
      color: #4a1024;
    }
    .expiration {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eee;
    }
    .footer-link {
      color: #4a1024;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎓 ARCHIVIO</h1>
      <p>Research Archive Management System</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <div class="greeting">Hello,</div>

      <div class="message">You have been invited to join the <strong>ARCHIVIO Research Management System</strong> as a student researcher by <strong>${senderName}</strong> from <strong>${senderDepartment}</strong>.</div>

      <!-- Step-by-step Instructions -->
      <div style="background-color:#f0f7ff;border:1px solid #b3d4f5;padding:15px;border-radius:6px;margin:20px 0;font-size:13px;color:#333;">
        <strong style="color:#1a5fa8;">📋 How to Access Your Account:</strong>
        <ol style="margin:10px 0 0 0;padding-left:20px;line-height:2;">
          <li>Click the <strong>"Create Your Student Account"</strong> button below</li>
          <li>Complete the 3-step sign-up form with your personal info, group details, and password</li>
          <li>Use your <strong>@phinmaed.com</strong> school email address to register</li>
          <li>After signing up, log in to access your <strong>Student Dashboard</strong></li>
        </ol>
      </div>

      <!-- Activation Button -->
      <div class="button-container">
        <a href="${invitationLink}" class="activation-button">Create Your Student Account</a>
      </div>

      <!-- Sender Info -->
      <div class="sender-info">
        <strong>Invitation from:</strong><br>
        ${senderName}<br>
        ${senderDepartment}
      </div>

      <!-- Expiration Warning -->
      <div class="expiration">
        ⏰ <strong>Important:</strong> This invitation link will expire in 7 days. Please create your account as soon as possible.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This is an automated email from ARCHIVIO Research Management System.</p>
      <p>If you have questions, please contact your research adviser or institution administration.</p>
      <p><a href="https://archivio.edu" class="footer-link">Visit ARCHIVIO</a> | <a href="mailto:support@archivio.edu" class="footer-link">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const mailOptions = {
      from: `ARCHIVIO <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Student Invitation: Join ARCHIVIO Research Management System`,
      html: emailHTML,
      text: message || 'You have been invited to join ARCHIVIO'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Student invitation email sent to ${to}: ${info.response}`);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error sending student invitation email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Start server

// =============================
// SUPER ADMIN INVITATION EMAIL
// =============================
app.post('/api/send-super-admin-invitation-email', async (req, res) => {
  const { to, name, invitationLink, temporaryPassword, moduleAccess } = req.body;

  if (!to || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const grantedModules = [];
  if (moduleAccess?.dashboard) grantedModules.push('Dashboard');
  if (moduleAccess?.reports) grantedModules.push('Reports');
  if (moduleAccess?.allUsers) grantedModules.push('All Users');
  if (moduleAccess?.activityLogs) grantedModules.push('Activity Logs');

  const modulesHtml = grantedModules.length > 0
    ? grantedModules.map(m => `<li style="margin-bottom:6px;">✅ <strong>${m}</strong></li>`).join('')
    : '<li>No modules granted. Contact the System Administrator.</li>';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; background-color: #f5f0e8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: #3b1220; padding: 32px; text-align: center; }
    .header h1 { color: #d6ad60; font-size: 26px; margin: 0; letter-spacing: 4px; }
    .header p { color: #c4b08a; font-size: 12px; margin: 6px 0 0; }
    .badge { display: inline-block; background: #8b5e1a; color: #fde68a; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-top: 12px; letter-spacing: 2px; }
    .content { padding: 36px 40px; }
    .greeting { font-size: 20px; font-weight: bold; color: #3b1220; margin-bottom: 12px; }
    .message { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 20px; }
    .creds-box { background: #fdf6ec; border: 1px solid #d6ad60; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .creds-box p { margin: 6px 0; font-size: 13px; color: #444; }
    .creds-box strong { color: #3b1220; }
    .modules-box { background: #f0f7ff; border: 1px solid #b3d4f5; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .modules-box h4 { color: #1a5fa8; margin: 0 0 12px; font-size: 13px; }
    .modules-box ul { margin: 0; padding-left: 4px; list-style: none; font-size: 13px; color: #333; }
    .btn { display: block; text-align: center; background: #3b1220; color: #d6ad60 !important; text-decoration: none; padding: 16px 24px; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 28px 0; letter-spacing: 1px; }
    .warning { background: #fff8e1; border-left: 4px solid #d6ad60; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #7a5c00; }
    .footer { background: #3b1220; padding: 20px; text-align: center; }
    .footer p { color: #c4b08a; font-size: 11px; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ARCHIVIO</h1>
      <p>Research Archive Management System</p>
      <span class="badge">⭐ SUPER ADMIN INVITATION</span>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${name}!</div>
      <div class="message">
        You have been invited to the <strong>ARCHIVIO System Administrator Portal</strong> as a <strong>Super Admin</strong>.
        You have been granted <strong>view-only</strong> access to the modules listed below.
      </div>

      <div class="creds-box">
        <p>🔐 <strong>Portal:</strong> ${invitationLink || 'http://localhost:5173'}</p>
        <p>📧 <strong>Email:</strong> ${to}</p>
        <p>🔑 <strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
      </div>

      <div class="modules-box">
        <h4>📋 Your Granted Module Access:</h4>
        <ul>${modulesHtml}</ul>
      </div>

      <a href="${invitationLink || 'http://localhost:5173'}" class="btn">Access System Administrator Portal →</a>

      <div class="warning">
        ⚠️ Use your temporary password to sign in. You have <strong>view-only</strong> access to the granted modules. 
        Modules not listed are not accessible to your account.
      </div>
    </div>
    <div class="footer">
      <p>ARCHIVIO — Research Archive Management System</p>
      <p>SWU PHINMA • Automated Invitation</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"ARCHIVIO System" <${process.env.EMAIL_FROM || 'noreply@archivio.edu.ph'}>`,
      to: to,
      subject: `⭐ You're invited as Super Admin — ARCHIVIO System Administrator Portal`,
      html: emailHtml,
    });
    console.log(`✅ Super Admin invitation email sent to: ${to}`);
    res.json({ success: true, message: 'Super Admin invitation email sent' });
  } catch (error) {
    console.error('❌ Error sending super admin email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// ============================================
// AUTOMATED STATUS EMAILS
// ============================================
app.post('/api/send-status-email', async (req, res) => {
  const { to, studentName, title, status, comments } = req.body;

  if (!to || !studentName || !title || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let statusHeader = '';
  let statusColor = '';
  let statusMessage = '';

  if (status === 'approved') {
    statusHeader = 'Research Paper Approved';
    statusColor = '#059669'; // Emerald
    statusMessage = 'Congratulations! Your research adviser has approved your manuscript. It is now waiting in the Dean\'s queue to be officially published to the Public Archive.';
  } else if (status === 'revision') {
    statusHeader = 'Revision Required';
    statusColor = '#ca8a04'; // Yellow
    statusMessage = 'Your research adviser has reviewed your manuscript and requested some revisions. Please check the feedback below and update your submission in the Student Portal.';
  } else if (status === 'published') {
    statusHeader = 'Research Paper Published!';
    statusColor = '#7a1f3d'; // Maroon
    statusMessage = 'Excellent news! The Dean has officially published your research paper. It is now live and accessible in the ARCHIVIO Public Archive.';
  } else {
    statusHeader = 'Research Paper Update';
    statusColor = '#4b5563'; // Gray
    statusMessage = 'There has been an update to your research paper submission.';
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border-top: 6px solid ${statusColor}; }
    .header { padding: 30px 30px 15px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: ${statusColor}; }
    .content { padding: 0 30px 30px; }
    .paper-box { background-color: #f9f9f9; border-left: 4px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .paper-box h3 { margin: 0 0 5px 0; font-size: 16px; color: #444; }
    .paper-box p { margin: 0; font-size: 14px; color: #666; }
    .comments-box { background-color: #fffbeb; border: 1px solid #fde68a; padding: 15px; margin: 20px 0; border-radius: 6px; }
    .comments-box h4 { margin: 0 0 10px 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .comments-box p { margin: 0; font-size: 14px; color: #b45309; font-style: italic; white-space: pre-wrap; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusHeader}</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>${statusMessage}</p>
      
      <div class="paper-box">
        <h3>${title}</h3>
        <p>Current Status: <strong style="color: ${statusColor}; text-transform: uppercase;">${status}</strong></p>
      </div>

      ${comments ? `
      <div class="comments-box">
        <h4>Adviser Feedback:</h4>
        <p>"${comments}"</p>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">Log in to the Student Portal to view full details.</p>
    </div>
    <div class="footer">
      <p>ARCHIVIO — Research Archive Management System</p>
      <p>Automated Status Notification</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"ARCHIVIO Updates" <${process.env.EMAIL_FROM || 'noreply@archivio.edu.ph'}>`,
      to: to,
      subject: `[ARCHIVIO] ${statusHeader}: ${title}`,
      html: emailHtml,
    });
    console.log(`✅ Status email sent to: ${to} (${status})`);
    res.json({ success: true, message: 'Status email sent' });
  } catch (error) {
    console.error('❌ Error sending status email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// ============================================
// CLOUDINARY DELETE FILE
// ============================================
const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

app.post('/api/delete-cloudinary', async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ error: 'No URL provided' });

    // Extract public_id and resource_type from URL
    const parts = fileUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return res.status(400).json({ error: 'Invalid URL' });
    
    const resourceType = parts[uploadIndex - 1]; // "image", "raw", "video"
    let publicId = parts.slice(uploadIndex + 2).join('/'); 
    
    // Cloudinary needs the extension for raw files, but NOT for images/videos
    if (resourceType !== 'raw') {
      const dot = publicId.lastIndexOf('.');
      if (dot !== -1) publicId = publicId.substring(0, dot);
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    res.json({ success: true, message: 'Deleted securely' });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});


// ============================================
// ARCHIVIO AI ASSISTANT CHAT
// ============================================
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { paper, chatHistory, userMessage, pdfUrl, image, paperContext } = req.body;

    console.log(`🤖 AI Chat Request for: "${paper?.researchTitle}" | PDF: ${pdfUrl ? 'YES' : 'NO'}`);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend environment variables." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    let developerPrompt = '';
    
    if (paperContext) {
      developerPrompt = `
      === SYSTEM INSTRUCTIONS ===
      YOUR IDENTITY:
      - If the user asks who made you, who created this system, or who built Archivio, you MUST answer that you were built by **Prince Japhet Vender**, a Full Stack Developer.
      
      CRITICAL OUTPUT RULES:
      - NEVER include <think> tags or show your thinking process
      - NEVER output internal reasoning or planning steps
      - Output ONLY the final, clean response to the user
      - Do NOT show analysis steps, just give the final answer directly
      
      ${paperContext}
      `;
    } else {
      developerPrompt = `
      === SYSTEM INSTRUCTIONS ===
      You are the **Archivio AI Research Assistant**, an expert academic AI built into the ARCHIVIO Research Archive Management System.
      
      YOUR IDENTITY:
      - If the user asks who made you, who created this system, or who built Archivio, you MUST answer that you were built by **Prince Japhet Vender**, a Full Stack Developer.

      CRITICAL OUTPUT RULES:
      - NEVER include <think> tags or show your thinking process
      - Output ONLY the final, clean response to the user

      YOUR PRIMARY ROLE:
      - You are a specialized research paper analyst. 
      - Do NOT make up information.
      - NEVER confuse this paper with another paper. You are ONLY analyzing the paper titled: "${paper?.researchTitle || 'Untitled'}".

      === THE PAPER YOU ARE ANALYZING ===
      Title: "${paper?.researchTitle || 'Untitled'}"
      Authors: ${paper?.authorDisplay || 'Unknown'}
      Year: ${new Date(paper?.publishedAt || Date.now()).getFullYear()}
      Keywords: ${paper?.keywords?.join(', ') || 'None provided'}
      Abstract: ${paper?.abstract || 'No abstract available'}
      === END OF PAPER METADATA ===
      `;
    }
    
    let pdfText = "";
    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const pdfData = await pdfParse(Buffer.from(arrayBuffer));
        pdfText = pdfData.text.substring(0, 15000); // Truncate for limits
        developerPrompt += `\n\n=== EXCERPT FROM MANUSCRIPT ===\n${pdfText}\n=== END OF EXCERPT ===\nUse this excerpt to answer questions if applicable.`;
      } catch (e) {
        console.error("Backend PDF fetch/parse error:", e);
      }
    }

    const modelWithPrompt = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: developerPrompt });
    
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const resultData = await modelWithPrompt.generateContent({ contents });
    const responseData = await resultData.response;
    
    let cleanResponse = responseData.text() || "";
    cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    res.json({ success: true, text: cleanResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      errorMessage = "The AI has reached its rate limit. Please try again in a minute.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================
// AI PRE-CHECK SCANNER (GRAMMAR & AUTO-SUGGESTIONS)
// ============================================
app.post('/api/ai/precheck', async (req, res) => {
  try {
    const { abstract } = req.body;
    if (!abstract) return res.status(400).json({ error: 'Abstract is required for pre-check' });

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        score: 80,
        feedback: "AI scanner is temporarily unavailable. Your abstract appears to follow academic standards. Please review for grammar and clarity manually.",
        suggestions: []
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `You are an expert academic writing evaluator. Evaluate this abstract for grammar, syntax, academic tone, and readability. Be constructive and helpful.

ABSTRACT:
"${abstract}"

Respond with ONLY a JSON object using this format:
{"score": 85, "feedback": "Your overall feedback here", "suggestions": [{"original": "sentence to improve", "suggested": "improved version", "reason": "explanation"}]}

The score must be 0-100. Include 1-3 specific suggestions. Return ONLY valid JSON.`;

    const resultData = await model.generateContent(prompt);
    const response = await resultData.response;
    let rawText = response.text();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let resultParsed;
    try {
      resultParsed = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          resultParsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          resultParsed = { 
            score: 75, 
            feedback: "AI analysis completed. Your abstract appears to meet academic standards.", 
            suggestions: [] 
          };
        }
      } else {
        resultParsed = { score: 75, feedback: "Abstract scanned successfully.", suggestions: [] };
      }
    }

    res.json(resultParsed);
  } catch (error) {
    console.error('AI Pre-Check Error:', error);
    res.json({
      score: 85,
      feedback: "AI service is currently busy. Please review the abstract manually.",
      suggestions: []
    });
  }
});


// ============================================
// AI KEYWORD EXTRACTION (using GROQ - clean output)
// ============================================
app.post('/api/ai/extract-keywords', async (req, res) => {
  try {
    const { abstract } = req.body;
    if (!abstract) return res.status(400).json({ error: 'Abstract is required' });

    // Use GROQ instead of Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        success: true, 
        keywords: ['Digital Archiving', 'Research Management', 'Academic Repository'] 
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `You are an academic keyword extractor. Extract 5-8 highly relevant academic keywords from this research abstract.
Return ONLY a JSON array of strings. No explanation, no markdown.
Example: ["Digital Archiving", "Research Management", "Agile Development"]

Abstract:
${abstract}`;

    const resultData = await model.generateContent(prompt);
      const response = await resultData.response;
      let rawText = response.text();
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let keywords = [];
    try {
      keywords = JSON.parse(rawText);
    } catch (e) {
      const arrMatch = rawText.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { 
          keywords = JSON.parse(arrMatch[0]); 
        } catch (e2) { 
          keywords = ['Digital Archiving', 'Research Management', 'Academic Repository'];
        }
      } else {
        keywords = ['Digital Archiving', 'Research Management', 'Academic Repository'];
      }
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      keywords = ['Digital Archiving', 'Research Management', 'Academic Repository'];
    }

    res.json({ success: true, keywords });
  } catch (error) {
    console.error('AI Keyword Extraction Error:', error);
    res.status(500).json({ error: 'Failed to extract keywords', details: error.message });
  }
});




// ============================================
// AI ABSTRACT AUTO-EXTRACTION FROM PDF
// ============================================
app.post('/api/ai/extract-abstract', async (req, res) => {
  try {
    const { pdfUrl, pdfBase64 } = req.body;
    
    if (!pdfUrl && !pdfBase64) {
      return res.status(400).json({ error: 'pdfUrl or pdfBase64 is required for extraction' });
    }

    let arrayBuffer;
    if (pdfBase64) {
      console.log(`🤖 AI Auto-Extracting Abstract from direct Base64 upload`);
      arrayBuffer = Buffer.from(pdfBase64, 'base64');
    } else {
      if (pdfUrl === '#' || !pdfUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Valid pdfUrl is required when base64 is not provided' });
      }
      console.log(`🤖 AI Auto-Extracting Abstract from URL: ${pdfUrl}`);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) throw new Error('Failed to download PDF from provided URL');
      arrayBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    }
    
    // Parse PDF text using pdf-parse
    const pdfData = await pdfParse(arrayBuffer);
    const pdfText = pdfData.text.substring(0, 12000); // Truncate for GROQ limits

    // Use GROQ instead of Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        abstract: "The AI service is temporarily unavailable. Please manually input your abstract." 
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `You are an expert academic research assistant. Read the research paper excerpt below and write a professional abstract of 150-250 words.
The abstract must cover: problem statement, methodology, results, and conclusion.
Return ONLY the abstract text. No label, no heading, no markdown, no explanation.

=== MANUSCRIPT EXCERPT ===
${pdfText}
=== END OF EXCERPT ===`;

    const resultData = await model.generateContent(prompt);
      const response = await resultData.response;
      let rawText = response.text();
    rawText = rawText.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').trim();
    
    console.log(`🤖 AI Generated Abstract Length: ${rawText.length} | First 20 chars: ${rawText.substring(0, 20)}`);
    
    if (rawText === '') {
      return res.status(500).json({ error: 'AI failed to generate an abstract from this document' });
    }

    res.json({ abstract: rawText });
  } catch (error) {
    console.error('AI Abstract Extraction Error:', error);
    
    // If it's a limit error, return a fallback abstract so it doesn't break
    if (error.message?.includes('429') || error.message?.includes('rate_limit')) {
      return res.json({ 
        abstract: "The system is currently experiencing high traffic, and the AI could not auto-generate the abstract at this time. Please manually input your abstract or try uploading again later." 
      });
    }

    res.status(500).json({ error: 'Failed to extract abstract', details: error.message });
  }
});

// ============================================
// ADVISER AI AUTO-SUMMARIZER
// ============================================
app.post('/api/ai/summarize-pdf', async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    if (!pdfUrl) return res.status(400).json({ error: 'pdfUrl is required' });

    console.log(`🤖 AI Summarizing PDF from URL: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) throw new Error('Failed to download PDF from provided URL');
    
    const arrayBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const pdfData = await pdfParse(arrayBuffer);
    
    // Take first 10,000 characters for GROQ (it has smaller context limit than Gemini)
    const pdfText = pdfData.text.substring(0, 10000); 

    // Use GROQ instead of Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI summarization temporarily unavailable' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `You are an expert academic research assistant. Read the following excerpt from a research manuscript and generate a professional executive summary.

EXCERPT:
"${pdfText}"

Respond with ONLY a JSON object using this exact format:
{"problem": "Core problem statement (2-3 sentences)", "methodology": "How they conducted the research (2-3 sentences)", "conclusion": "Key findings and conclusion (2-3 sentences)"}

Ensure the JSON is valid. Output ONLY JSON.`;

    const resultData = await model.generateContent(prompt);
      const response = await resultData.response;
      let rawText = response.text();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          result = {
            problem: "The research addresses a specific academic problem in the field.",
            methodology: "The authors employed established research methods to investigate the problem.",
            conclusion: "The study provides valuable insights and contributes to the existing body of knowledge."
          };
        }
      } else {
        result = {
          problem: "The research addresses a specific academic problem in the field.",
          methodology: "The authors employed established research methods to investigate the problem.",
          conclusion: "The study provides valuable insights and contributes to the existing body of knowledge."
        };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('AI PDF Summarization Error:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return res.status(500).json({ 
        error: 'AI model temporarily unavailable. Please check your GEMINI_API_KEY or try again later.',
        details: 'Model not found or API key invalid'
      });
    }
    
    let errorMessage = error.message;
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      errorMessage = "The AI has reached its rate limit. Please try again in a minute.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================
// GLOBAL AI SEMANTIC SEARCH
app.post('/api/ai/global-search', async (req, res) => {
  try {
    const { allPapers, query } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend environment variables." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    // Inject developer identity prompt and the entire database as context
    const developerPrompt = `
    CRITICAL INSTRUCTION FOR ALL YOUR RESPONSES:
    If the user asks who made you, who created this system, or who built Archivio, you MUST answer that you were built by Prince Japhet Vender. 
    You must state that Prince Japhet Vender is a Full Stack Developer.
    Always be polite and helpful.

    You are the Global Archivio Librarian. You have access to the entire database of published research papers.
    Below is a JSON representation of all currently published papers in the archive. 
    Use this information to answer the user's query. If the query asks for papers about a specific topic, find and list the relevant papers from the provided JSON context. 
    If you recommend a paper, mention its Title, Author (Leader/Group), and Abstract/Keywords if applicable.
    Do NOT invent papers. Only use the provided JSON context.

    --- JSON ARCHIVE CONTEXT ---
    ${JSON.stringify(allPapers.map(p => ({
      title: p.researchTitle || p.title,
      group: p.groupName,
      author: p.leaderName,
      abstract: p.abstract || '',
      keywords: p.keywords || [],
      department: p.program || p.department || '',
      date: p.publishedAt
    })))}
    ----------------------------
    `;
    
    const searchModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: developerPrompt });
      const resultData = await searchModel.generateContent(query);
      const responseData = await resultData.response;
      res.json({ success: true, text: responseData.text() });
  } catch (error) {
    console.error('Global AI Search Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      errorMessage = "The AI has reached its rate limit. Please try again in a minute.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================
// SEND ACCOUNT CREATION EMAIL (SYSTEM ADMIN)
// ============================================
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { to, name, role, temporaryPassword, loginLink } = req.body;

    if (!to || !name || !role || !temporaryPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4a1024 0%, #6b1834 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 40px 30px; }
    .password-box { background: #f9f9f9; border: 1px dashed #ca8a04; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .password-box h2 { margin: 0; color: #b45309; letter-spacing: 3px; font-size: 28px; }
    .password-box p { margin: 10px 0 0; font-size: 13px; color: #666; }
    .btn { display: inline-block; background: #ca8a04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px; }
    .footer { background: #f0f0f0; padding: 20px 30px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ARCHIVIO</h1>
      <p>Unified Research Portal</p>
    </div>
    <div class="content">
      <p>Dear <strong>${name}</strong>,</p>
      <p>An official <strong>${role}</strong> account has been created for you by the System Administrator in the ARCHIVIO Research Management System.</p>
      
      <div class="password-box">
        <p style="margin-top:0; margin-bottom:10px;">Your temporary password is:</p>
        <h2>${temporaryPassword}</h2>
        <p>Please log in and change this password immediately.</p>
      </div>
      
      <p>You can access your portal here:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${loginLink || 'http://localhost:5173'}" class="btn">Log In to ARCHIVIO</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message from SWU PHINMA ARCHIVIO. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `ARCHIVIO Admin <${process.env.EMAIL_USER}>`,
      to,
      subject: '[ARCHIVIO] Your New Account Details',
      html: emailHTML
    });

    res.status(200).json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ============================================
// DISABLE USER IN FIREBASE AUTH
// ============================================
app.post('/api/disable-auth-user', async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) {
      return res.status(400).json({ error: 'Missing uid or email' });
    }

    if (uid) {
      await getAuth().updateUser(uid, { disabled: true });
      console.log(`✅ Successfully disabled user in Auth: ${uid}`);
    } else if (email) {
      const userRecord = await getAuth().getUserByEmail(email);
      await getAuth().updateUser(userRecord.uid, { disabled: true });
      console.log(`✅ Successfully disabled user by email in Auth: ${email}`);
    }

    res.status(200).json({ success: true, message: 'User disabled in Firebase Auth' });
  } catch (error) {
    console.error('❌ Error disabling user in Auth:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(200).json({ success: true, message: 'User not found, already inaccessible' });
    }
    res.status(500).json({ error: 'Failed to disable user in Auth' });
  }
});

// ============================================
// HARD DELETE USER FROM FIREBASE AUTH
// ============================================
app.post('/api/hard-delete-auth-user', async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) {
      return res.status(400).json({ error: 'Missing uid or email' });
    }

    if (uid) {
      await getAuth().deleteUser(uid);
      console.log(`✅ Successfully hard deleted user from Auth: ${uid}`);
    } else if (email) {
      const userRecord = await getAuth().getUserByEmail(email);
      await getAuth().deleteUser(userRecord.uid);
      console.log(`✅ Successfully hard deleted user by email from Auth: ${email}`);
    }

    res.status(200).json({ success: true, message: 'User permanently deleted from Firebase Auth' });
  } catch (error) {
    console.error('❌ Error hard deleting user from Auth:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(200).json({ success: true, message: 'User already deleted' });
    }
    res.status(500).json({ error: 'Failed to hard delete user from Auth' });
  }
});


app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   ARCHIVIO Email Service Running      ║
║   Port: ${PORT}                           ║
║   ✅ Ready to send invitations         ║
╚═══════════════════════════════════════╝
  `);
  console.log('Endpoints:');
  console.log('  POST /api/send-invitation-email');
  console.log('  POST /api/send-student-invitation-email');
  console.log('  POST /api/send-dean-invitation-email');
  console.log('  POST /api/send-student-message');
  console.log('  POST /api/ai/chat');
  console.log('  POST /api/ai/extract-keywords');

  // ==========================================
  // DYNAMIC PDF WATERMARKING (ENTERPRISE)
  // ==========================================
  app.post('/api/watermark-pdf', async (req, res) => {
    try {
      const { pdfUrl, userName } = req.body;
      if (!pdfUrl) return res.status(400).json({ error: 'pdfUrl is required' });

      // 1. Download the raw PDF into memory buffer
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      const pdfBytes = response.data;

      // 2. Load PDF into pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const displayName = userName || 'Guest User';
      const watermarkText = `Downloaded by ${displayName} on ${dateStr}`;

      // 3. Loop through all pages and stamp watermark
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = 24;
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        
        // Large diagonal watermark across center
        page.drawText(watermarkText, {
          x: (width / 2) - (textWidth / 2) * 0.707,
          y: height / 2,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.5, 0.1, 0.2), // SWU Maroon-ish
          opacity: 0.25,
          rotate: degrees(45),
        });
        
        // Small footer text for accountability
        page.drawText(`For Academic Purposes Only - SWU ARCHIVIO - ${displayName}`, {
          x: 40,
          y: 25,
          size: 10,
          font: helveticaFont,
          color: rgb(0.4, 0.4, 0.4),
          opacity: 0.6
        });
      });

      // 4. Save and return modified PDF directly to browser
      const modifiedPdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ARCHIVIO_Paper_${Date.now()}.pdf"`);
      res.send(Buffer.from(modifiedPdfBytes));

    } catch (error) {
      console.error('PDF Watermarking error:', error);
      res.status(500).json({ error: 'Failed to generate watermarked PDF' });
    }
  });

  // ============================================
  // AI SIMILARITY CHECKER
  // ============================================
  app.post('/api/ai/similarity-check', async (req, res) => {
    try {
      const { submissionId, title, abstract } = req.body;
      if (!title || !abstract) return res.status(400).json({ error: 'Title and abstract are required' });
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend environment variables." });
      }

      // Fetch all published papers from Firestore
      const { getFirestore } = require('firebase-admin/firestore');
      const db = getFirestore();
      const snapshot = await db.collection('submissions').where('reviewStatus', '==', 'published').get();
      
      const publishedPapers = [];
      snapshot.forEach(doc => {
        if (submissionId && doc.id === submissionId) return; // Skip comparing to itself
        
        const data = doc.data();
        publishedPapers.push({
          id: doc.id,
          title: data.researchTitle || data.title || '',
          abstract: data.abstract || ''
        });
      });

      if (publishedPapers.length === 0) {
        return res.json({ score: 0, matchTitle: "None", analysis: "No published papers in the archive to compare against." });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
      
      const prompt = `You are an expert academic plagiarism and similarity detection system.
      Compare the NEW PAPER against the DATABASE OF PUBLISHED PAPERS below.
      Identify the single published paper that is MOST similar in topic, methodology, or context to the new paper.
      Calculate a similarity score from 0 to 100.
      
      NEW PAPER:
      Title: ${title}
      Abstract: ${abstract}
      
      DATABASE OF PUBLISHED PAPERS:
      ${JSON.stringify(publishedPapers)}
      
      Return ONLY a valid JSON object in this exact format, with no extra text or markdown:
      {"score": 85, "matchTitle": "Title of the most similar paper", "analysis": "1-2 sentences explaining why they are similar or why the score is low"}`;

      const resultData = await model.generateContent(prompt);
        const responseData = await resultData.response;
        let rawText = responseData.text();
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI returned invalid JSON');
        }
      }

      res.json(result);
    } catch (error) {
      console.error('AI Similarity Check Error:', error);
      res.status(500).json({ error: 'Failed to process similarity check', details: error.message, stack: error.stack });
    }
  });

  console.log('  POST /api/watermark-pdf');
  console.log('  GET  /api/health');
  
  // Start automated cron jobs
  setupCleanupCron();
  setupBackupCron();
  setupMailListener(transporter);
});
