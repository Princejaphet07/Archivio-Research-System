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

// Check and delete expired reset tokens/OTPs from password_resets collection
async function cleanupExpiredResetTokens() {
  const db = getFirestore();
  const now = new Date();
  let deletedCount = 0;

  try {
    const resetRef = db.collection('password_resets');
    const records = await resetRef.get();
    
    for (const doc of records.docs) {
      const data = doc.data();
      let expiresAt;
      if (data.expiresAt && data.expiresAt.toDate) {
        expiresAt = data.expiresAt.toDate();
      } else if (data.expiresAt) {
        expiresAt = new Date(data.expiresAt);
      }

      if (expiresAt && now > expiresAt) {
        console.log(`[CRON-5MINS] Deleting expired reset token for: ${doc.id}`);
        await doc.ref.delete();
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[CRON-5MINS] Deleted ${deletedCount} expired password reset records.`);
    }
  } catch (error) {
    console.error(`[CRON-5MINS] Error during reset tokens cleanup:`, error);
  }
}

function setupCleanupCron() {
  // Schedule reset tokens cleanup to run every 5 minutes (safe: only cleans expired password reset tokens)
  cron.schedule('*/5 * * * *', () => {
    cleanupExpiredResetTokens();
  });
  
  console.log('✅ Cron Jobs initialized:');
  console.log('   - Expired Password Reset Tokens Cleanup (Every 5 mins)');
  console.log('   - User Account Deletion: DISABLED (Preserving all Student, Dean, and Adviser records)');
}

module.exports = { 
  setupCleanupCron, 
  cleanupPendingUsers, 
  cleanupOTPs: cleanupExpiredResetTokens, 
  cleanupExpiredResetTokens 
};
