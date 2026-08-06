const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const DEFAULT_REQUIREMENTS = [
  { id: 'Final Manuscript', title: 'Final Manuscript', desc: 'Complete approved research paper (PDF)', icon: '📄', type: 'file', scope: 'global', status: 'approved', priority: 1 },
  { id: 'Approval Sheet', title: 'Approval Sheet', desc: 'Signed by adviser, dean, and panel', icon: '📑', type: 'file', scope: 'global', status: 'approved', priority: 2 },
  { id: 'Dataset Files', title: 'Dataset Files', desc: 'Raw datasets used in study (ZIP)', icon: '💾', type: 'file', scope: 'global', status: 'approved', priority: 3 },
  { id: 'Video Pitch', title: 'Video Pitch', desc: 'Brief 3-5 min video presentation of findings', icon: '🎥', type: 'file', scope: 'global', status: 'approved', priority: 4 },
  { id: 'User Manual', title: 'User Manual', desc: 'Manual for the developed system', icon: '📖', type: 'file', scope: 'global', status: 'approved', priority: 5 },
  { id: 'Upload URL', title: 'Upload URL', desc: 'Source code or publication URL', icon: '🔗', type: 'url', scope: 'global', status: 'approved', priority: 6 },
  { id: 'Signature Page', title: 'Signature Page', desc: 'Original signed page from approval committee', icon: '✍️', type: 'file', scope: 'global', status: 'approved', priority: 7 },
];

async function initRequirements() {
  const reqRef = db.collection('requirements');
  const snap = await reqRef.get();
  
  if (snap.empty) {
    console.log('Initializing default requirements...');
    for (const req of DEFAULT_REQUIREMENTS) {
      await reqRef.doc(req.id).set(req);
    }
    console.log('Requirements initialized successfully.');
  } else {
    console.log('Requirements already exist. Skipping init.');
  }
  process.exit(0);
}

initRequirements().catch(console.error);
