const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const serviceAccount = require('../firebase-service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'archivio.noreply@gmail.com',
    pass: 'idypbuznxosaamzk'
  }
});

async function sendTestReset() {
  const email = 'prdo.vender.swu@phinmaed.com';
  console.log('Generating password reset link for:', email);
  const resetLink = await getAuth().generatePasswordResetLink(email);
  console.log('Reset Link generated successfully!');

  const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
    
    <!-- HEADER WITH SWU PHINMA LOGO -->
    <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 35px 20px; text-align: center;">
      <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 75px; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));" />
      <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 26px; font-weight: 700; letter-spacing: 2px;">ARCHIVIO</h1>
      <p style="color: #f7d2db; margin: 6px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Archive Management System</p>
    </div>
    
    <!-- BODY -->
    <div style="padding: 35px 30px; background-color: #ffffff;">
      <h2 style="color: #24050f; margin-top: 0; font-size: 20px; font-weight: 700; font-family: 'Georgia', serif;">Password Reset Request</h2>
      <p style="color: #4a5568; line-height: 1.7; font-size: 14.5px; margin-bottom: 20px;">
        Hello,<br><br>
        We received a request to reset the password for your account (<strong style="color: #24050f;">${email}</strong>) on <strong>ARCHIVIO SWU PHINMA</strong>.
      </p>
      
      <p style="color: #4a5568; line-height: 1.7; font-size: 14px; margin-bottom: 25px;">
        Click the button below to securely set your new password:
      </p>

      <!-- CTA BUTTON -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(84, 27, 47, 0.3); letter-spacing: 0.5px;">
          Reset Your Password
        </a>
      </div>

      <!-- INSTRUCTIONS / SECURITY -->
      <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; border-radius: 4px 8px 8px 4px; padding: 15px 18px; margin: 25px 0;">
        <p style="margin: 0; color: #7b341e; font-size: 12.5px; line-height: 1.6;">
          <strong>Security Notice:</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 18px; margin: 25px 0;">
        <p style="color: #718096; font-size: 12px; line-height: 1.6; margin: 0;">
          <strong>Having trouble with the button?</strong> Copy and paste this link into your web browser:<br>
          <a href="${resetLink}" style="color: #7a2744; word-break: break-all; font-size: 11px;">${resetLink}</a>
        </p>
      </div>

      <p style="color: #718096; font-size: 13px; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px; line-height: 1.6;">
        Best regards,<br>
        <strong>ARCHIVIO Research Administration</strong><br>
        Southwestern University PHINMA
      </p>
    </div>
    
    <!-- FOOTER -->
    <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="color: #a0aec0; font-size: 11.5px; margin: 0; line-height: 1.5;">
        &copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>
        Urgelio St., Sambag II, Cebu City, Philippines 6000 • All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

  const info = await transporter.sendMail({
    from: '"ARCHIVIO SWU PHINMA" <archivio.noreply@gmail.com>',
    to: email,
    subject: 'Password Reset Request • ARCHIVIO SWU PHINMA',
    html: emailHTML
  });

  console.log('SUCCESS: Email sent successfully! Message ID:', info.messageId);
}

sendTestReset().catch(err => {
  console.error('Error sending reset email:', err);
});
