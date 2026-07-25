import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBWU7Mlk0Xykqtvb_gpuweLOv3VEtAp-AA",
  authDomain: "archivio-research-system.firebaseapp.com",
  projectId: "archivio-research-system",
  storageBucket: "archivio-research-system.firebasestorage.app",
  messagingSenderId: "798013707409",
  appId: "1:798013707409:web:59f945fa69fe5321265b30",
  measurementId: "G-8LNQMPEYC4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const reqRef = collection(db, 'requirements');
  const snap = await getDocs(reqRef);
  if (snap.empty) {
    console.log('Initializing default requirements...');
    for (const req of DEFAULT_REQUIREMENTS) {
      await setDoc(doc(db, 'requirements', req.id), req);
    }
    console.log('Requirements initialized successfully.');
  } else {
    console.log('Requirements already exist. Skipping init.');
  }
}

initRequirements().catch(console.error);
