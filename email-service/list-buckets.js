const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

async function listBuckets() {
  try {
    const storage = getStorage();
    const [buckets] = await storage.storage.getBuckets();
    console.log('Buckets:');
    buckets.forEach(bucket => console.log(bucket.name));
  } catch (error) {
    console.error('Error listing buckets:', error);
  }
}

listBuckets();
