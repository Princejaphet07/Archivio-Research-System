import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function MobileBottomNav({ onOpenMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [groupCountNew, setGroupCountNew] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [pendingSubCount, setPendingSubCount] = useState(0);

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) return;

    // Approved groups listener
    const gq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    const unsub1 = onSnapshot(gq, (snap) => {
      const currentCount = snap.size;
      const storageKey = `adviser_seen_groups_${email}`;
      const lastSeen = parseInt(localStorage.getItem(storageKey) || '0');
      const newCount = Math.max(0, currentCount - lastSeen);
      setGroupCountNew(newCount);
    });

    // Pending registrations listener
    const pq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'pending'));
    const unsub2 = onSnapshot(pq, (snap) => setPendingRegCount(snap.size));

    // Pending submissions listener
    const sq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    let unsubSub = null;
    const unsub3 = onSnapshot(sq, (snap) => {
      const groupsData = snap.docs.map(d => d.data());
      if (unsubSub) unsubSub();
      if (groupsData.length > 0) {
        const subQ = query(collection(db, 'submissions'));
        unsubSub = onSnapshot(subQ, (subSnap) => {
          const subsData = subSnap.docs.map(d => d.data());
          let count = 0;
          groupsData.forEach(group => {
            const sub = subsData.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || s.title === group.researchTitle || s.researchTitle === group.researchTitle)) || {};
            const status = sub.reviewStatus || 'in_progress';
            if (status === 'pending' || status === 'in_progress') count++;
          });
          setPendingSubCount(count);
        });
      } else {
        setPendingSubCount(0);
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      if (unsubSub) unsubSub();
    };
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      path: '/adviser/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'groups',
      path: '/adviser/my-groups',
      label: 'Groups',
      badge: groupCountNew > 0 ? (groupCountNew > 9 ? '9+' : groupCountNew) : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'reviews',
      path: '/adviser/review-submissions',
      label: 'Reviews',
      badge: pendingSubCount > 0 ? (pendingSubCount > 9 ? '9+' : pendingSubCount) : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'registrations',
      path: '/adviser/group-registrations',
      label: 'Registrations',
      badge: pendingRegCount > 0 ? (pendingRegCount > 9 ? '9+' : pendingRegCount) : null,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      id: 'menu',
      isAction: true,
      onClick: onOpenMenu,
      label: 'More',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] max-w-[calc(100vw-1.5rem)] z-40 md:hidden animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      {/* Floating Glassmorphic Container */}
      <div className="relative bg-white/85 dark:bg-stone-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/60 dark:border-stone-700/60 shadow-[0_10px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_1px_1px_rgba(255,255,255,0.08)] p-1.5 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="grid grid-cols-5 gap-1 items-center">
          {navItems.map((item) => {
            const isActive = item.path && path === item.path;

            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.label}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 text-stone-500 dark:text-stone-400 hover:text-[#7B1F35] dark:hover:text-[#f8d070] hover:bg-stone-100/60 dark:hover:bg-stone-800/60 active:scale-95 cursor-pointer group"
                >
                  <div className="relative mb-0.5 group-hover:scale-110 transition-transform duration-200">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-medium tracking-tight leading-none text-stone-600 dark:text-stone-400 group-hover:text-[#7B1F35] dark:group-hover:text-[#f8d070]">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.path)}
                aria-label={item.label}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive 
                    ? 'bg-[#7B1F35]/10 dark:bg-[#f8d070]/15 text-[#7B1F35] dark:text-[#f8d070] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]' 
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100/50 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className="relative mb-0.5">
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-sm border-2 border-white dark:border-stone-900 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] tracking-tight leading-none ${isActive ? 'font-bold' : 'font-medium text-stone-600 dark:text-stone-400'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[#7B1F35] dark:bg-[#f8d070] shrink-0 animate-pulse"></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
