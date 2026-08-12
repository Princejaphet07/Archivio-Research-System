// Firebase Configuration for Student System
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWU7Mlk0Xykqtvb_gpuweLOv3VEtAp-AA",
  authDomain: "archivio-research-system.firebaseapp.com",
  projectId: "archivio-research-system",
  storageBucket: "archivio-research-system.firebasestorage.app",
  messagingSenderId: "798013707409",
  appId: "1:798013707409:web:59f945fa69fe5321265b30",
  measurementId: "G-8LNQMPEYC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
