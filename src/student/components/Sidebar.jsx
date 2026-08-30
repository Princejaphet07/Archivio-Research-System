import React, { useState, useEffect } from 'react';
import swuLogoSeal from '../../assets/new icon.png';
import { db, auth } from '../../firebase/config';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab, onLogout, studentName, initials, profilePhotoUrl, role }) {
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
  
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg> 
    },
    { 
      name: 'Manuscript', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg> 
    },
    { 
      name: 'Requirements', 
      badge: missingCount > 0 ? missingCount.toString() : null,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg> 
    },
    { 
      name: 'Progress', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg> 
    },
    { 
      name: 'My Group', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> 
    },
    { 
      name: 'Settings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    }
  ];

  const NavButton = ({ name, icon, badge }) => {
    const isActive = activeTab === name;

    return (
      <button
        type="button"
        onClick={() => { setActiveTab(name); setIsOpen(false); }}
        className={`group relative w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl text-xs font-bold transition-all duration-300 ease-out overflow-hidden ${
          isActive
            ? 'text-white shadow-lg shadow-black/20'
            : 'text-gray-300 dark:text-stone-300 hover:text-white'
        }`}
      >
        <div 
          className={`absolute inset-0 rounded-xl transition-all duration-300 ease-out ${
            isActive 
              ? 'bg-gradient-to-r from-white/15 to-transparent border border-white/10 opacity-100 translate-x-0' 
              : 'bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4'
          }`} 
        />
        
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-[#d0a36e] rounded-r-full transition-all duration-300 ease-out shadow-[0_0_10px_#d0a36e] ${
            isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          }`}
        />

        <div className="relative flex items-center gap-3 z-10 transform transition-transform duration-300 group-hover:translate-x-1">
          <div className={`transition-all duration-300 ${isActive ? 'text-[#d0a36e] scale-110 drop-shadow-[0_0_8px_rgba(208,163,110,0.5)]' : 'text-gray-300 dark:text-stone-300 group-hover:text-white'}`}>
            {icon}
          </div>
          <span className="tracking-wide text-[13px]">{name}</span>
        </div>
        
        {badge && (
          <span className={`relative z-10 text-[10px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
            isActive ? 'bg-[#d0a36e] text-[#541b2f]' : 'bg-[#CF3645] text-white'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed lg:static top-0 left-0 h-screen w-[260px] bg-[#541b2f] dark:bg-stone-950 flex flex-col justify-between z-50 transition-colors duration-300 font-sans border-r border-[#6b253e] dark:border-stone-800 overflow-y-auto scrollbar-hide ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div>
          <div className="flex items-center gap-3 px-6 pt-8 pb-8">
            <div className="bg-white/10 p-1.5 rounded-full border border-[#d0a36e]/50 flex items-center justify-center overflow-hidden w-11 h-11">
              <img src={swuLogoSeal} alt="ARCHIVIO" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <span className="text-[16px] font-bold text-white tracking-wide block leading-none mb-0.5">ARCHIVIO</span>
              <span className="text-[11px] text-[#d0a36e] font-medium uppercase tracking-wider">Student Portal</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 px-4">
            {menuItems.map((item) => (
              <NavButton
                key={item.name}
                name={item.name}
                icon={item.icon}
                badge={item.badge}
              />
            ))}
          </div>
        </div>
        
        {/* Bottom Section (Need Help & Profile) */}
        <div className="px-5 pb-6 flex flex-col gap-4 mt-8">
          
          {/* Need help box */}
          <div 
            className="bg-[#6b253e]/40 dark:bg-white/5 p-4 rounded-xl flex flex-col gap-1.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border border-[#d0a36e]/20 dark:border-white/5"
            onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
          >
            <div className="w-8 h-8 bg-[#d0a36e] rounded-full flex items-center justify-center text-[#541b2f] shadow-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h4 className="text-white font-bold text-[13px]">Need help?</h4>
            <p className="text-gray-300 dark:text-stone-300 text-[11px] leading-tight font-medium">Contact your<br/>Research Adviser</p>
          </div>

          {/* User Profile */}
          <div className="border border-[#d0a36e]/30 dark:border-stone-800 rounded-xl p-2.5 flex items-center gap-3 bg-[#541b2f] dark:bg-stone-900 shadow-sm hover:border-[#d0a36e]/60 dark:hover:border-stone-700 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#d0a36e] text-[#541b2f] flex items-center justify-center font-bold text-[14px] shrink-0 shadow-sm overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials || 'ST'
              )}
            </div>
            <div className="flex flex-col flex-1 truncate">
              <span className="text-[13px] font-bold text-white truncate">{studentName || 'Student Name'}</span>
              <span className="text-[11px] text-gray-400 dark:text-stone-400">
                {role === 'member' ? 'Group Member' : 'Group Leader'}
              </span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 dark:text-stone-500 hover:bg-[#6b253e]/80 dark:hover:bg-white/10 hover:text-white rounded-lg transition-colors"
              title="Log out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>

        </div>

      </div>
    </>
  );
}
