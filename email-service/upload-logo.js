const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'archivio-research-system.firebasestorage.app'
});

const bucket = getStorage().bucket();

async function uploadLogo() {
  try {
    const filePath = '../src/assets/new icon.png';
    const destination = 'public/swu-logo.png';
    
    await bucket.upload(filePath, {
      destination: destination,
      metadata: {
        contentType: 'image/png'
      }
    });
    
    await bucket.file(destination).makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    console.log('UPLOAD SUCCESS URL:', publicUrl);
  } catch(e) {
    console.error('ERROR:', e);
  }
}
uploadLogo();
