import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAdviser } from '../context/AdviserContext';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { adviserData } = useAdviser();

  const [groupCount, setGroupCount] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [pendingSubCount, setPendingSubCount] = useState(0);

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) return;

    // Approved groups count
    const gq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    const unsub1 = onSnapshot(gq, (snap) => setGroupCount(snap.size));

    // Pending registrations count
    const pq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'pending'));
    const unsub2 = onSnapshot(pq, (snap) => setPendingRegCount(snap.size));

    // Submissions count (all from adviser's students)
    const sq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    const unsub3 = onSnapshot(sq, (snap) => {
      const leaderUids = snap.docs.map(d => d.data().leaderUid);
      if (leaderUids.length > 0) {
        const subQ = query(collection(db, 'submissions'));
        onSnapshot(subQ, (subSnap) => {
          const count = subSnap.docs.filter(d => leaderUids.includes(d.data().studentUid)).length;
          setPendingSubCount(count);
        });
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const activeClass = "bg-[#6b253e]/80 text-white border border-[#d0a36e]/30";
  const inactiveClass = "text-gray-300 hover:bg-[#6b253e]/40 hover:text-white border border-transparent";

  return (
    <div className="w-64 bg-[#541b2f] text-white flex flex-col h-full shadow-xl hidden md:flex z-20">
      {/* Brand & Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white/10 p-1.5 rounded-full border border-[#d0a36e]/50">
          <img src={logoImg} alt="Archivio" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h1 className="font-serif font-bold tracking-widest text-lg leading-tight">ARCHIVIO</h1>
          <p className="text-[9px] text-[#d0a36e] tracking-widest uppercase">Research Archive</p>
        </div>
      </div>

      {/* Adviser Mode Toggle */}
      <div className="px-5 mb-6">
        <div className="bg-[#3e1322] rounded-full p-1 flex items-center justify-between border border-[#6b253e]">
          <div className="flex items-center gap-2 pl-2">
            <div className="w-2 h-2 rounded-full bg-[#d0a36e]"></div>
            <span className="text-[10px] font-semibold tracking-wider text-gray-200">ADVISER MODE</span>
          </div>
          <div className="bg-[#6b253e] text-[9px] px-3 py-1 rounded-full text-white font-medium">
            Active
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {/* Main Section */}
        <div className="mb-4">
          <p className="text-[9px] text-gray-400 font-bold tracking-wider mb-2 px-2">MAIN</p>
          
          <Link to="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${path === '/dashboard' ? activeClass : inactiveClass}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
            </svg>
            <span className="text-xs font-semibold">Dashboard</span>
          </Link>
          
          <Link to="/my-groups" className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${path === '/my-groups' ? activeClass : inactiveClass}`}>
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <span className="text-xs font-medium">My Groups</span>
            </div>
            <span className="bg-[#d0a36e] text-[#541b2f] text-[10px] font-bold px-2 py-0.5 rounded-full">{groupCount}</span>
          </Link>

          <Link to="/review-submissions" className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${path === '/review-submissions' ? activeClass : inactiveClass}`}>
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span className="text-xs font-medium">Review Submissions</span>
            </div>
            {pendingSubCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingSubCount}</span>}
          </Link>

          <Link to="/research-categories" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${path === '/research-categories' ? activeClass : inactiveClass}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
            </svg>
            <span className="text-xs font-medium">Research Categories</span>
          </Link>
        </div>

        {/* Students Section */}
        <div className="mb-4">
          <p className="text-[9px] text-gray-400 font-bold tracking-wider mb-2 px-2">STUDENTS</p>
          <Link to="/group-registrations" className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition ${path === '/group-registrations' ? activeClass : inactiveClass}`}>
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
              </svg>
              <span className="text-xs font-medium">Group Registrations</span>
            </div>
            {pendingRegCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingRegCount}</span>}
          </Link>
          <Link to="/send-invitations" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${path === '/send-invitations' ? activeClass : inactiveClass}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            <span className="text-xs font-medium">Send Invitations</span>
          </Link>
        </div>

        {/* Settings Section */}
        <div className="mb-4">
          <p className="text-[9px] text-gray-400 font-bold tracking-wider mb-2 px-2">SETTINGS</p>
          <Link to="/submission-requirements" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition ${path === '/submission-requirements' ? activeClass : inactiveClass}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs font-medium">Submission Requirements</span>
          </Link>
          <Link to="/my-profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${path === '/my-profile' ? activeClass : inactiveClass}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs font-medium">My Profile</span>
          </Link>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-[#6b253e]">
        <div className="bg-[#6b253e]/50 flex items-center gap-3 p-3 rounded-xl border border-[#6b253e]">
          <div className="w-8 h-8 rounded-full bg-[#d0a36e] flex items-center justify-center text-[#541b2f] font-bold text-xs">
            {adviserData?.firstName?.charAt(0)}{adviserData?.lastName?.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-white">{adviserData?.displayName || 'Research Adviser'}</p>
            <p className="text-[10px] text-[#d0a36e]">💡 Adviser</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;