import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';

export default function NotificationBell() {
  const [missingCount, setMissingCount] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let requiredTitles = [];
    let uploadedDocs = [];

    const updateMissingCount = () => {
      const missing = requiredTitles.filter(t => !uploadedDocs.includes(t));
      setMissingCount(missing.length);
    };

    const unsubSettings = onSnapshot(doc(db, 'settings', 'requirements'), (docSnap) => {
      if (docSnap.exists()) {
        const reqList = docSnap.data().list || [];
        requiredTitles = reqList.map(r => r.title);
      } else {
        requiredTitles = [];
      }
      updateMissingCount();
    });

    const q = query(collection(db, 'submissions'), where('studentUid', '==', uid));
    const unsubSub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        uploadedDocs = snap.docs[0].data().uploadedDocs || [];
      } else {
        uploadedDocs = [];
      }
      updateMissingCount();
    });

    return () => {
      unsubSettings();
      unsubSub();
    };
  }, []);

  return (
    <button className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-white flex items-center justify-center hover:bg-black/5 transition-all shadow-sm">
      <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {missingCount > 0 && (
        <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#CF3645] text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-[#FDF9ED]">
          {missingCount}
        </span>
      )}
    </button>
  );
}
