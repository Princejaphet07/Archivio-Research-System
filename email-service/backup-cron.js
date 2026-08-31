const cron = require('node-cron');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

async function performDatabaseBackup() {
  const db = getFirestore();
  const now = new Date();
  
  // Format date as YYYY-MM-DD
  const dateStr = now.toISOString().split('T')[0];
  const backupDir = path.join(__dirname, 'backups');
  const backupFile = path.join(backupDir, `archivio-backup-${dateStr}.json`);
  
  console.log(`[CRON-BACKUP] Starting automated database backup at ${now.toISOString()}...`);

  // Create backups folder if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Collections to backup
  const collections = [
    'students',
    'advisers',
    'deans',
    'admins',
    'groups',
    'submissions',
    'requirements',
    'activity_logs',
    'password_resets',
    'user_bookmarks'
  ];

  const backupData = {
    metadata: {
      backupDate: now.toISOString(),
      collectionsCount: collections.length
    },
    data: {}
  };

  try {
    let totalDocs = 0;

    for (const colName of collections) {
      console.log(`[CRON-BACKUP] Backing up collection: ${colName}...`);
      const snapshot = await db.collection(colName).get();
      
      backupData.data[colName] = [];
      
      snapshot.forEach(doc => {
        backupData.data[colName].push({
          id: doc.id,
          ...doc.data()
        });
        totalDocs++;
      });
    }

    // Write to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log(`[CRON-BACKUP] Backup completed successfully!`);
    console.log(`- Total Documents Backed Up: ${totalDocs}`);
    console.log(`- Saved to: ${backupFile}`);

    // Optional: Keep only the last 7 days of backups to save disk space
    cleanupOldBackups(backupDir);

  } catch (error) {
    console.error(`[CRON-BACKUP] Error during database backup:`, error);
  }
}

function cleanupOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime > SEVEN_DAYS_MS) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });
    
    if (deletedCount > 0) {
      console.log(`[CRON-BACKUP] Deleted ${deletedCount} old backup file(s) (older than 7 days).`);
    }
  } catch (error) {
    console.error(`[CRON-BACKUP] Error cleaning up old backups:`, error);
  }
}

function setupBackupCron() {
  // Schedule backup to run every day at 3:00 AM
  cron.schedule('0 3 * * *', () => {
    performDatabaseBackup();
  });
  
  console.log('✅ Automated Backup Cron Job initialized. Scheduled for 3:00 AM.');
}

module.exports = { setupBackupCron, performDatabaseBackup };
