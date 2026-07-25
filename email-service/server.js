// Email Service Backend for ARCHIVIO
// Handles sending invitation emails for Research Advisers
// Start with: node server.js

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
      <p>Do not reply directly to this email — use the Reply button above to contact the student.</p>
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
// SEND ADVISER INVITATION EMAIL
// ============================================
app.post('/api/send-invitation-email', async (req, res) => {
  try {
    const { to, adviserName, message, invitationLink, senderName, senderDepartment } = req.body;

    // Validate required fields
    if (!to || !adviserName || !invitationLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email domain - only @phinmaed.com allowed
    if (!to.toLowerCase().endsWith('@phinmaed.com')) {
      return res.status(400).json({ error: 'Invitations can only be sent to @phinmaed.com email addresses' });
    }

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
      white-space: pre-wrap;
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
      <div class="greeting">Hello ${adviserName},</div>

      <div class="message">You have been invited to join the <strong>ARCHIVIO Research Management System</strong> as a Research Adviser by <strong>${senderName}</strong> from <strong>${senderDepartment}</strong>.</div>

      ${emailMessage ? `<div style="background-color: #f9f9f9; border-left: 4px solid #4a1024; padding: 15px; margin: 15px 0; font-style: italic; color: #555;">"${emailMessage}"</div>` : ''}

      <!-- Step-by-step Instructions -->
      <div style="background-color:#f0f7ff;border:1px solid #b3d4f5;padding:15px;border-radius:6px;margin:20px 0;font-size:13px;color:#333;">
        <strong style="color:#1a5fa8;">📋 How to Access Your Account:</strong>
        <ol style="margin:10px 0 0 0;padding-left:20px;line-height:2;">
          <li>Click the <strong>"Create Your Account"</strong> button below</li>
          <li>You will be taken to the <strong>Research Adviser Sign Up page</strong></li>
          <li>Register using your <strong>@phinmaed.com</strong> email address</li>
          <li>After signing up, log in to access your <strong>Research Adviser Dashboard</strong></li>
        </ol>
      </div>

      <!-- Activation Button -->
      <div class="button-container">
        <a href="${invitationLink}" class="activation-button">Create Your Account</a>
      </div>

      <!-- Sender Info -->
      <div class="sender-info">
        <strong>Invitation from:</strong><br>
        ${senderName}<br>
        ${senderDepartment}
      </div>

      <!-- Expiration Warning -->
      <div class="expiration">
        ⏰ <strong>Important:</strong> This invitation link will expire in 7 days. Please activate your account as soon as possible.
      </div>

      <!-- FAQ -->
      <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 13px;">
        <strong>Frequently Asked Questions:</strong>
        <ul>
          <li><strong>I didn't request this invitation</strong> - If you believe this was sent in error, please contact ${senderName}</li>
          <li><strong>Link expired?</strong> - Request a new invitation from your Dean</li>
          <li><strong>Password requirements</strong> - Your password must contain at least 8 characters, including uppercase, numbers, and special characters</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This is an automated email from ARCHIVIO Research Management System.</p>
      <p>If you have questions, please contact your institution's administration.</p>
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
      white-space: pre-wrap;
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
    .credentials-box {
      background-color: #f0f0f0;
      border-left: 4px solid #4a1024;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #333;
      font-family: 'Courier New', monospace;
    }
    .credentials-box strong {
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
      <div class="greeting">Hello ${deanName},</div>

      <div class="message">You have been invited to join the <strong>ARCHIVIO Research Management System</strong> as a Dean. Follow the steps below to access your account.</div>

      <!-- Credentials Box -->
      <div class="credentials-box">
        <strong>📧 Your Temporary Login Credentials:</strong><br><br>
        <strong>Email:</strong> ${to}<br>
        <strong>Temporary Password:</strong> ${temporaryPassword}<br><br>
        <em style="font-size:12px;color:#666;">Keep this password safe. You will be asked to replace it on first login.</em>
      </div>

      <!-- Step-by-step Instructions -->
      <div style="background-color:#f0f7ff;border:1px solid #b3d4f5;padding:15px;border-radius:6px;margin:20px 0;font-size:13px;color:#333;">
        <strong style="color:#1a5fa8;">📋 How to Access Your Account:</strong>
        <ol style="margin:10px 0 0 0;padding-left:20px;line-height:2;">
          <li>Click the <strong>"Login to ARCHIVIO Dean Portal"</strong> button below</li>
          <li>Enter your <strong>email</strong> and the <strong>temporary password</strong> above</li>
          <li>You will be automatically prompted to <strong>set a new permanent password</strong></li>
          <li>Once your password is set, you will be taken to your <strong>Dean Dashboard</strong></li>
        </ol>
      </div>

      <!-- Activation Button -->
      <div class="button-container">
        <a href="${invitationLink}" class="activation-button">Login to ARCHIVIO Dean Portal</a>
        <div class="link-text">
          Or copy this link:<br>
          <a href="${invitationLink}" class="link">${invitationLink}</a>
        </div>
      </div>

      <!-- Important Note -->
      <div class="expiration">
        🔒 <strong>Security Notice:</strong> Your temporary password should be changed immediately upon first login. You will be automatically guided through this process.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This is an automated email from ARCHIVIO Research Management System.</p>
      <p>If you have questions, please contact your institution's administration.</p>
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
// DELETE FIREBASE AUTH USER
// ============================================
app.post('/api/delete-auth-user', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'Missing UID' });
    }

    console.log(`📍 Attempting to delete Firebase Auth user: ${email} (UID: ${uid})`);
    
    // Note: This would require Firebase Admin SDK
    // For now, we just log the attempt
    // A proper implementation would use:
    // const admin = require('firebase-admin');
    // await admin.auth().deleteUser(uid);
    
    res.status(200).json({
      success: true,
      message: 'Delete request logged. User will be unable to login due to Firestore deletion.',
      uid: uid
    });

  } catch (error) {
    console.error('❌ Error deleting auth user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
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
    const { paperContext, chatHistory, userMessage, pdfUrl } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend environment variables." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const initialUserParts = [{ text: paperContext }];

    // Fetch the PDF as a buffer and convert to base64
    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const base64data = Buffer.from(arrayBuffer).toString('base64');
        initialUserParts.push({
          inlineData: {
            data: base64data,
            mimeType: 'application/pdf'
          }
        });
        initialUserParts.push({ text: "Please read the attached full manuscript PDF carefully to answer my questions." });
      } catch (e) {
        console.error("Backend PDF fetch error:", e);
        // Continue even if PDF fetch fails, relying on metadata
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        { role: 'user', parts: initialUserParts },
        { role: 'model', parts: [{ text: 'Understood. I will act as the Archivio AI Assistant for this paper.' }] },
        ...chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    });

    res.json({ success: true, text: response.text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
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
  console.log('  GET  /api/health');
});
