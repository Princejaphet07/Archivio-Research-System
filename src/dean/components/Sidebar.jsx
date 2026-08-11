import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import logo from '../../assets/logo.png';
import Swal from 'sweetalert2';

const NAV_ITEMS_MAIN = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
      </svg>
    ),
  },
  {
    id: 'research-records',
    label: 'Research Records',
    badgeStyle: 'bg-[#f8d070] text-[#4a1024]',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'publish-queue',
    label: 'Publish Queue',
    badge: '8', // Updated from 5 to 8 to match design
    badgeStyle: 'bg-red-600 text-white',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: 'requirements',
    label: 'Requirements',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'invitations',
    label: 'Invitations',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const NAV_ITEMS_MANAGEMENT = [
  {
    id: 'user-management',
    label: 'User Management',
    badge: '3',
    badgeStyle: 'bg-[#f8d070] text-[#4a1024]',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.split('/').pop() || 'dashboard';
  const { deanData } = useUser();
  const [counts, setCounts] = useState({ researchRecordsNew: 0, researchRecordsTotal: 0, publishQueue: 0, userManagement: 0 });

  useEffect(() => {
    // Wait for deanData to load so badge counts match filtered data
    if (!deanData?.department) return;
    const deanDept = deanData.department;

    const unsubGroups = onSnapshot(query(collection(db, 'groups'), where('status', '==', 'approved')), (snap) => {
      const deptGroups = snap.docs.filter(doc => doc.data().department === deanDept);
      const currentCount = deptGroups.length;
      
      const storageKey = `dean_seen_records_${auth.currentUser?.uid || 'guest'}`;
      let lastSeen = parseInt(localStorage.getItem(storageKey) || '0');
      
      if (activePage === 'research-records') {
        localStorage.setItem(storageKey, currentCount.toString());
        lastSeen = currentCount;
      }
      
      const newCount = Math.max(0, currentCount - lastSeen);
      setCounts(prev => ({ ...prev, researchRecordsNew: newCount, researchRecordsTotal: currentCount }));
    });
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      // DEPARTMENT FILTER
      const approvedCount = snap.docs.filter(doc => {
        const data = doc.data();
        return data.reviewStatus === 'approved' && (data.program || data.department) === deanDept;
      }).length;
      setCounts(prev => ({ ...prev, publishQueue: approvedCount }));
    });
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snap) => {
      // DEPARTMENT FILTER
      const inactiveCount = snap.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'inactive' && data.department === deanDept;
      }).length;
      setCounts(prev => ({ ...prev, userManagement: inactiveCount }));
    });
    
    return () => {
      unsubGroups();
      unsubSubs();
      unsubAdvisers();
    };
  }, [deanData, activePage]);

  useEffect(() => {
    if (activePage === 'research-records' && counts.researchRecordsTotal > 0) {
      const storageKey = `dean_seen_records_${auth.currentUser?.uid || 'guest'}`;
      localStorage.setItem(storageKey, counts.researchRecordsTotal.toString());
      setCounts(prev => ({ ...prev, researchRecordsNew: 0 }));
    }
  }, [activePage, counts.researchRecordsTotal]);

  // Extract initials from displayName
  const deanName = deanData?.displayName || 'Dean';
  const initials = deanName.split(' ').map(n => n[0]).join('').toUpperCase();

  // Get role badges
  const role = deanData?.role || 'dean';
  const isDeanOnly = role === 'dean';
  const isDeanAndAdviser = role === 'dean+adviser';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire('Error', 'Failed to logout. Please try again.', 'error');
    }
  };

  // Handle navigation
  const handleNavigate = (itemId) => {
    navigate(`/dean/${itemId}`);
  };
  return (
    <aside className="w-[260px] bg-[#4a1024] dark:bg-stone-950 flex flex-col h-screen text-stone-300 font-sans shrink-0">

      {/* LOGO AREA */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-[#f8d070] to-[#d4af37] rounded-xl flex items-center justify-center p-0.5 shadow-md shrink-0">
          <img src={logo} alt="SWU Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-white font-serif text-xl font-bold tracking-wider leading-none mb-1">ARCHIVIO</h1>
          <p className="text-[9px] text-stone-400 uppercase tracking-[0.2em]">Research Archive</p>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between bg-black/20 rounded-lg py-2 px-3 border border-white/5 shadow-inner">
          <span className="text-xs text-stone-200 font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#f8d070]"></div>
            DEAN MODE
          </span>
          <span className="text-[10px] bg-[#f8d070]/20 text-[#f8d070] px-2 py-0.5 rounded-md font-bold">Active</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-6">

        {/* MAIN SECTION */}
        <div>
          <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 px-3">Main</p>
          <ul className="space-y-1">
            {NAV_ITEMS_MAIN.map((item) => {
              let currentBadge = item.badge;
              if (item.id === 'research-records') currentBadge = counts.researchRecordsNew > 0 ? `+${counts.researchRecordsNew}` : null;
              if (item.id === 'publish-queue') currentBadge = counts.publishQueue > 0 ? counts.publishQueue.toString() : null;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm text-left group
                      ${activePage === item.id
                        ? 'bg-white/10 text-white font-medium border border-white/5 shadow-sm'
                        : 'hover:bg-white/5 hover:text-white text-stone-300'
                      }`}
                  >
                    <span className={`flex items-center gap-3 ${activePage === item.id ? '' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>
                      {item.icon}
                      {item.label}
                    </span>
                    {currentBadge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeStyle}`}>
                        {currentBadge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* MANAGEMENT SECTION */}
        <div>
          <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 px-3">Management</p>
          <ul className="space-y-1">
            {NAV_ITEMS_MANAGEMENT.map((item) => {
              let currentBadge = item.badge;
              if (item.id === 'user-management') currentBadge = counts.userManagement > 0 ? counts.userManagement.toString() : null;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm text-left group
                      ${activePage === item.id
                        ? 'bg-white/10 text-white font-medium border border-white/5 shadow-sm'
                        : 'hover:bg-white/5 hover:text-white text-stone-300'
                      }`}
                  >
                    <span className={`flex items-center gap-3 ${activePage === item.id ? '' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>
                      {item.icon}
                      {item.label}
                    </span>
                    {currentBadge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeStyle}`}>
                        {currentBadge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* USER PROFILE */}
      <div className="p-3 bg-black/20 m-4 rounded-xl flex items-center gap-3 border border-white/5 shadow-inner">
        <div className="w-10 h-10 rounded-full bg-[#f8d070] flex items-center justify-center text-[#4a1024] font-bold shadow-sm shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{deanName}</p>
          <div className="flex gap-1.5 mt-1">
            {(isDeanOnly || isDeanAndAdviser) && (
              <span className="text-[8px] bg-[#6b2a3d] border border-[#8c3b53] text-[#f8d070] px-1.5 py-0.5 rounded font-bold tracking-wide">
                DEAN
              </span>
            )}
            {isDeanAndAdviser && (
              <span className="text-[8px] bg-[#1a4a38] border border-[#236b51] text-emerald-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                ADVISER
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="px-4 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 hover:border-red-600/60 rounded-lg text-red-300 hover:text-red-100 text-sm font-bold transition-all duration-200 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

    </aside>
  );
}
