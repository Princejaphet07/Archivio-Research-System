const { onRequest } = require('firebase-functions/v2/https');
const app = require('./server');

/**
 * ARCHIVIO Backend API
 * Deployed as a 2nd Generation Firebase Cloud Function.
 * 
 * - Memory: 1GiB (optimized for PDF parsing and memory-intensive AI tasks)
 * - Timeout: 300 seconds (plenty of time for large manuscript thesis parsing)
 * - Region: us-central1 (matching Firebase Firestore location)
 */
exports.api = onRequest({
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 300,
  maxInstances: 10,
  region: 'us-central1',
  invoker: 'public'
}, app);
