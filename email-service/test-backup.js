const { initializeApp, cert } = require('firebase-admin/app');
const serviceAccount = require('./firebase-service-account.json');
const { performDatabaseBackup } = require('./backup-cron');

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccount)
});

// Run backup immediately
console.log('Running manual backup test...');
performDatabaseBackup();
