const cron = require('node-cron');
const { getFirestore } = require('firebase-admin/firestore');

/**
 * Clean up routine
 * IMPORTANT: User deletion (students, advisers, deans, and their Auth accounts) is permanently DISABLED
 * to prevent accidental data loss and login failures.
 */
async function cleanupPendingUsers() {
  console.log('[CRON-CLEANUP] Scheduled check running — user deletion is disabled for data integrity.');
}

// Check and delete expired OTPs from password_resets collection
async function cleanupOTPs() {
  const db = getFirestore();
  const now = new Date();
  let deletedOTPsCount = 0;

  try {
    const otpRef = db.collection('password_resets');
    const otps = await otpRef.get();
    
    for (const doc of otps.docs) {
      const data = doc.data();
      let expiresAt;
      if (data.expiresAt && data.expiresAt.toDate) {
        expiresAt = data.expiresAt.toDate();
      } else if (data.expiresAt) {
        expiresAt = new Date(data.expiresAt);
      }

      if (expiresAt && now > expiresAt) {
        console.log(`[CRON-5MINS] Deleting expired OTP for: ${doc.id}`);
        await doc.ref.delete();
        deletedOTPsCount++;
      }
    }
    
    if (deletedOTPsCount > 0) {
      console.log(`[CRON-5MINS] Deleted ${deletedOTPsCount} expired OTPs.`);
    }
  } catch (error) {
    console.error(`[CRON-5MINS] Error during OTP cleanup:`, error);
  }
}

function setupCleanupCron() {
  // Schedule OTP cleanup to run every 5 minutes (safe: only cleans expired password reset tokens)
  cron.schedule('*/5 * * * *', () => {
    cleanupOTPs();
  });
  
  console.log('✅ Cron Jobs initialized:');
  console.log('   - Expired OTP Cleanup (Every 5 mins)');
  console.log('   - User Account Deletion: DISABLED (Preserving all Student, Dean, and Adviser records)');
}

module.exports = { setupCleanupCron, cleanupPendingUsers, cleanupOTPs };
