const cron = require('node-cron');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Delete pending invitations older than 30 days and perform other cleanups
async function cleanupPendingUsers() {
  const db = getFirestore();
  const auth = getAuth();
  
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  
  console.log(`[CRON-MIDNIGHT] Starting database cleanup at ${now.toISOString()}...`);

  let deletedUsersCount = 0;
  let deletedLogsCount = 0;
  let deletedGroupsCount = 0;

  try {
    // ==========================================
    // 1. CLEAN UP PENDING STUDENTS (30 days)
    // ==========================================
    const studentsRef = db.collection('students');
    const pendingStudents = await studentsRef.where('status', '==', 'pending').get();
    for (const doc of pendingStudents.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt) : null;
      if (createdAt && (now - createdAt) > THIRTY_DAYS_MS) {
        console.log(`[CRON-MIDNIGHT] Deleting expired student invitation: ${data.email}`);
        await doc.ref.delete();
        if (data.userId) { try { await auth.deleteUser(data.userId); } catch (e) {} }
        deletedUsersCount++;
      }
    }

    // ==========================================
    // 2. CLEAN UP PENDING ADVISERS (30 days)
    // ==========================================
    const advisersRef = db.collection('advisers');
    const pendingAdvisers = await advisersRef.where('accountStatus', '==', 'pending_activation').get();
    const pendingAdvisers2 = await advisersRef.where('status', '==', 'pending').get();
    const allPendingAdvisers = [...pendingAdvisers.docs, ...pendingAdvisers2.docs];
    const uniqueAdvisers = Array.from(new Map(allPendingAdvisers.map(doc => [doc.id, doc])).values());

    for (const doc of uniqueAdvisers) {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt) : null;
      if (createdAt && (now - createdAt) > THIRTY_DAYS_MS) {
        console.log(`[CRON-MIDNIGHT] Deleting expired adviser invitation: ${data.email}`);
        await doc.ref.delete();
        if (data.userId) { try { await auth.deleteUser(data.userId); } catch (e) {} }
        deletedUsersCount++;
      }
    }

    // ==========================================
    // 3. CLEAN UP PENDING DEANS (30 days)
    // ==========================================
    const deansRef = db.collection('deans');
    const pendingDeans = await deansRef.where('accountStatus', '==', 'pending_activation').get();
    const pendingDeans2 = await deansRef.where('status', '==', 'pending').get();
    const allPendingDeans = [...pendingDeans.docs, ...pendingDeans2.docs];
    const uniqueDeans = Array.from(new Map(allPendingDeans.map(doc => [doc.id, doc])).values());

    for (const doc of uniqueDeans) {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt) : null;
      if (createdAt && (now - createdAt) > THIRTY_DAYS_MS) {
        console.log(`[CRON-MIDNIGHT] Deleting expired dean invitation: ${data.email}`);
        await doc.ref.delete();
        if (data.userId) { try { await auth.deleteUser(data.userId); } catch (e) {} }
        deletedUsersCount++;
      }
    }

    // ==========================================
    // 4. CLEAN UP OLD ACTIVITY LOGS (1 Year)
    // ==========================================
    const logsRef = db.collection('activity_logs');
    const oldLogs = await logsRef.get();
    for (const doc of oldLogs.docs) {
      const data = doc.data();
      let timestamp;
      if (data.timestamp && data.timestamp.toDate) {
        timestamp = data.timestamp.toDate();
      } else if (data.timestamp) {
        timestamp = new Date(data.timestamp);
      }

      if (timestamp && (now - timestamp) > ONE_YEAR_MS) {
        await doc.ref.delete();
        deletedLogsCount++;
      }
    }

    // ==========================================
    // 5. CLEAN UP DECLINED GROUPS (30 days)
    // ==========================================
    const groupsRef = db.collection('groups');
    const declinedGroups = await groupsRef.where('status', '==', 'declined').get();
    for (const doc of declinedGroups.docs) {
      const data = doc.data();
      const updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
      if (updatedAt && (now - updatedAt) > THIRTY_DAYS_MS) {
        console.log(`[CRON-MIDNIGHT] Deleting declined group registration: ${data.groupName || doc.id}`);
        await doc.ref.delete();
        deletedGroupsCount++;
      }
    }

    console.log(`[CRON-MIDNIGHT] Cleanup finished successfully.`);
    console.log(`- Deleted Expired Users: ${deletedUsersCount}`);
    console.log(`- Deleted Old Activity Logs: ${deletedLogsCount}`);
    console.log(`- Deleted Declined Groups: ${deletedGroupsCount}`);

  } catch (error) {
    console.error(`[CRON-MIDNIGHT] Error during cleanup:`, error);
  }
}

// Check and delete expired OTPs
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
  // Schedule full cleanup to run every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    cleanupPendingUsers();
  });
  
  // Schedule OTP cleanup to run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    cleanupOTPs();
  });
  
  console.log('✅ Cron Jobs initialized:');
  console.log('   - Full System Cleanup (Midnight)');
  console.log('   - Expired OTP Cleanup (Every 5 mins)');
}

module.exports = { setupCleanupCron, cleanupPendingUsers, cleanupOTPs };
