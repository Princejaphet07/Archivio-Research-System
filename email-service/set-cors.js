const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'archivio-research-system.appspot.com'
});

async function configureCors() {
  const bucket = getStorage().bucket();
  
  await bucket.setCorsConfiguration([
    {
      origin: ['*'],
      method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      maxAgeSeconds: 3600,
      responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable']
    }
  ]);
  
  console.log('Successfully updated CORS configuration for Firebase Storage bucket.');
}

configureCors().catch(console.error);
