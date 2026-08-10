const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'archivio-research-system.firebasestorage.app'
});

async function testUpload() {
  try {
    const bucket = getStorage().bucket();
    const file = bucket.file('test.txt');
    await file.save('Hello World');
    console.log('Upload successful');
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

testUpload();
