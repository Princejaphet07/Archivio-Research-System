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
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> 
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed lg:static top-0 left-0 h-screen w-[260px] bg-[#faf9f6] flex flex-col justify-between z-50 transition-transform duration-300 font-sans border-r border-stone-200/80 overflow-y-auto scrollbar-hide ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div>
          <div className="flex items-center gap-3 px-6 pt-8 pb-8">
            <img src={swuLogoSeal} alt="ARCHIVIO" className="w-10 h-10 rounded-full border border-stone-200/80 object-contain bg-white shadow-sm p-0.5" />
            <div>
              <span className="text-[16px] font-bold text-gray-900 tracking-wide block leading-none mb-0.5">ARCHIVIO</span>
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Student Portal</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 px-4">
            {menuItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button 
                  key={item.name} 
                  onClick={() => { setActiveTab(item.name); setIsOpen(false); }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-[#7B1F35]/5 text-[#7B1F35] font-bold' 
                      : 'bg-transparent text-gray-500 hover:bg-stone-100/80 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`${isActive ? 'text-[#7B1F35]' : 'text-gray-400'}`}>
                      {item.icon}
                    </div>
                    {item.name}
                  </div>
                  
                  {/* Right side Badge or active indicator */}
                  {item.badge && (
                    <span className="bg-[#CF3645] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#7B1F35] rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Bottom Section (Need Help & Profile) */}
        <div className="px-5 pb-6 flex flex-col gap-4 mt-8">
          
          {/* Need help box */}
          <div 
            className="bg-gradient-to-br from-[#f9f1f3] to-[#f4e2e7] p-4 rounded-xl flex flex-col gap-1.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border border-[#7B1F35]/10"
            onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#7B1F35] shadow-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h4 className="text-[#7B1F35] font-bold text-[13px]">Need help?</h4>
            <p className="text-gray-600 text-[11px] leading-tight font-medium">Contact your<br/>Research Adviser</p>
          </div>

          {/* User Profile */}
          <div className="border border-stone-200 rounded-xl p-2.5 flex items-center gap-3 bg-white shadow-sm hover:border-[#7B1F35]/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-[14px] shrink-0 shadow-sm overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials || 'ST'
              )}
            </div>
            <div className="flex flex-col flex-1 truncate">
              <span className="text-[13px] font-bold text-[#1A1A1A] truncate">{studentName || 'Student Name'}</span>
              <span className="text-[11px] text-gray-500">
                {role === 'member' ? 'Group Member' : 'Group Leader'}
              </span>
            </div>
            <button 
              onClick={onLogout}
              className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors flex-shrink-0"
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
