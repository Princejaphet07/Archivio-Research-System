import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import { useAdviser } from '../context/AdviserContext';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { logActivity } from '../../firebase/logActivity';
import RoleSwitchModal from '../../components/RoleSwitchModal';

function Sidebar({ isMobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const { adviserData, userRole } = useAdviser();
  const isDualRole = userRole === 'dean+adviser' || adviserData?.role === 'dean+adviser';

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [groupCountNew, setGroupCountNew] = useState(0);
  const [groupCountTotal, setGroupCountTotal] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [pendingSubCount, setPendingSubCount] = useState(0);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) return;

    // Approved groups count
    const gq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    const unsub1 = onSnapshot(gq, (snap) => {
      const currentCount = snap.size;
      const storageKey = `adviser_seen_groups_${email}`;
      let lastSeen = parseInt(localStorage.getItem(storageKey) || '0');
      
      if (path === '/adviser/my-groups') {
        localStorage.setItem(storageKey, currentCount.toString());
        lastSeen = currentCount;
      }
      
      const newCount = Math.max(0, currentCount - lastSeen);
      setGroupCountNew(newCount);
      setGroupCountTotal(currentCount);
    });

    // Pending registrations count
    const pq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'pending'));
    const unsub2 = onSnapshot(pq, (snap) => setPendingRegCount(snap.size));

    // Submissions count (pending only)
    const sq = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    let unsubSub = null;
    const unsub3 = onSnapshot(sq, (snap) => {
      const groupsData = snap.docs.map(d => d.data());
      
      if (unsubSub) unsubSub(); // clear previous listener

      if (groupsData.length > 0) {
        const subQ = query(collection(db, 'submissions'));
        unsubSub = onSnapshot(subQ, (subSnap) => {
          const subsData = subSnap.docs.map(d => d.data());
          let count = 0;
          
          groupsData.forEach(group => {
            const sub = subsData.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || s.title === group.researchTitle || s.researchTitle === group.researchTitle)) || {};
            const status = sub.reviewStatus || 'in_progress';
            
            if (status === 'pending' || status === 'in_progress') {
              count++;
            }
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
  }, [path]);

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (path === '/adviser/my-groups' && groupCountTotal > 0 && email) {
      const storageKey = `adviser_seen_groups_${email}`;
      localStorage.setItem(storageKey, groupCountTotal.toString());
      setGroupCountNew(0);
    }
  }, [path, groupCountTotal]);

  const handleLogout = async () => {
    try {
      const email = auth.currentUser?.email;
      if (email) {
        try {
          await logActivity(
            auth.currentUser.uid,
            'User logged out',
            'System',
            { role: 'adviser', email: email }
          );
        } catch (logErr) {
          console.warn('Could not log activity:', logErr);
        }
      }
      onCloseMobile();
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigate = (route) => {
    navigate(route);
    onCloseMobile();
  };

  const NavButton = ({ pathRoute, label, icon, badge }) => {
    const isActive = path === pathRoute;
    return (
      <button
        type="button"
        onClick={() => handleNavigate(pathRoute)}
        className={`group relative w-full flex items-center justify-between px-4 py-3 mb-1.5 rounded-xl text-xs font-bold transition-all duration-200 ease-out overflow-hidden cursor-pointer ${
          isActive
            ? 'text-white shadow-lg shadow-black/20'
            : 'text-stone-300 hover:text-white'
        }`}
      >
        <div 
          className={`absolute inset-0 rounded-xl transition-all duration-200 ease-out ${
            isActive 
              ? 'bg-gradient-to-r from-white/15 to-transparent border border-white/10 opacity-100 translate-x-0' 
              : 'bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4'
          }`} 
        />
        
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-[#d0a36e] rounded-r-full transition-all duration-200 ease-out shadow-[0_0_10px_#d0a36e] ${
            isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          }`}
        />

        <div className="relative flex items-center gap-3 z-10 transform transition-transform duration-200 group-hover:translate-x-1">
          <div className={`transition-all duration-200 ${isActive ? 'text-[#d0a36e] scale-110 drop-shadow-[0_0_8px_rgba(208,163,110,0.5)]' : 'text-stone-400 group-hover:text-white'}`}>
            {icon}
          </div>
          <span className="tracking-wide text-xs">{label}</span>
        </div>
        
        {badge && (
          <span className={`relative z-10 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm transition-all duration-200 ${
            isActive ? 'bg-[#d0a36e] text-[#541b2f]' : 'bg-red-500 text-white'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Sidebar Container: Fixed slide-out on mobile, static on desktop */}
      <aside 
        className={`fixed md:static top-0 left-0 h-[100dvh] md:h-screen w-[285px] max-w-[85vw] md:w-64 bg-[#541b2f] dark:bg-stone-950 text-white flex flex-col z-[100] md:z-20 transition-transform duration-300 ease-in-out font-sans border-r border-[#6b253e] dark:border-stone-800 shadow-2xl md:shadow-xl overflow-hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Logo Header */}
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-white/10 md:border-none">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-full border border-[#d0a36e]/50 shrink-0 shadow-sm">
              <img src={logoImg} alt="Archivio" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-serif font-bold tracking-widest text-lg leading-tight">ARCHIVIO</h1>
              <p className="text-[9px] text-[#d0a36e] tracking-widest uppercase">Research Archive</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Adviser Mode Pill */}
        <div className="px-5 mb-4 mt-3">
          <div className="bg-[#3e1322] dark:bg-black/30 rounded-full p-1 flex items-center justify-between border border-[#6b253e] dark:border-white/5 shadow-inner">
            <div className="flex items-center gap-2 pl-2">
              <div className="w-2 h-2 rounded-full bg-[#d0a36e]"></div>
              <span className="text-[10px] font-semibold tracking-wider text-gray-200">ADVISER PORTAL</span>
            </div>
            <div className="bg-[#6b253e] dark:bg-[#f8d070]/20 text-[9px] px-2.5 py-0.5 rounded-full text-white dark:text-[#f8d070] font-bold">
              Active
            </div>
          </div>
        </div>

        {/* Navigation Links - Scrollable */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-1 px-4 mb-2">
          {/* Main Section */}
          <div className="mb-3">
            <p className="text-[9px] text-stone-400 dark:text-stone-500 font-bold tracking-wider mb-2 px-3">MAIN</p>
            
            <NavButton
              pathRoute="/adviser/dashboard"
              label="Dashboard"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                </svg>
              }
            />
            
            <NavButton
              pathRoute="/adviser/my-groups"
              label="My Groups"
              badge={groupCountNew > 0 ? `+${groupCountNew}` : null}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              }
            />

            <NavButton
              pathRoute="/adviser/review-submissions"
              label="Review Submissions"
              badge={pendingSubCount > 0 ? pendingSubCount : null}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              }
            />

            <NavButton
              pathRoute="/adviser/research-categories"
              label="Research Categories"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
              }
            />
          </div>

          {/* Students Section */}
          <div className="mb-3">
            <p className="text-[9px] text-stone-400 dark:text-stone-500 font-bold tracking-wider mb-2 px-3 mt-2">STUDENTS</p>
            <NavButton
              pathRoute="/adviser/group-registrations"
              label="Group Registrations"
              badge={pendingRegCount > 0 ? pendingRegCount : null}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
                </svg>
              }
            />
            <NavButton
              pathRoute="/adviser/send-invitations"
              label="Send Invitations"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              }
            />
          </div>

          {/* Settings Section */}
          <div className="mb-3">
            <p className="text-[9px] text-stone-400 dark:text-stone-500 font-bold tracking-wider mb-2 px-3 mt-2">SETTINGS</p>
            <NavButton
              pathRoute="/adviser/submission-requirements"
              label="Submission Requirements"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
              }
            />
            <NavButton
              pathRoute="/adviser/my-profile"
              label="My Profile"
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              }
            />
          </div>
        </div>

        {/* USER PROFILE CARD */}
        <div className="p-3 bg-[#6b253e]/50 dark:bg-black/30 mx-4 mb-3 rounded-xl flex items-center gap-3 border border-[#6b253e] dark:border-white/5 shadow-inner shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#d0a36e] flex items-center justify-center text-[#541b2f] font-bold shadow-sm shrink-0 text-xs">
            {adviserData?.firstName?.charAt(0) || 'A'}{adviserData?.lastName?.charAt(0) || 'D'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{adviserData?.displayName || 'Research Adviser'}</p>
            <div className="flex gap-1.5 mt-0.5">
              {isDualRole && (
                <span className="text-[8px] bg-[#6b2a3d] border border-[#8c3b53] text-[#f8d070] px-1.5 py-0.5 rounded font-bold tracking-wide">
                  DEAN
                </span>
              )}
              <span className="text-[8px] bg-[#1a4a38] border border-[#236b51] text-emerald-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                ADVISER
              </span>
            </div>
          </div>
        </div>

        {/* PORTAL SWITCHER FOR DUAL ROLE */}
        {isDualRole && (
          <div className="px-4 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                setShowSwitchModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#7B1F35]/40 hover:bg-[#7B1F35]/60 border border-[#f8d070]/40 hover:border-[#f8d070]/70 rounded-xl text-[#f8d070] hover:text-amber-200 text-xs font-bold transition-all duration-200 shadow-md group cursor-pointer"
              title="Switch to Dean Portal"
            >
              <span className="text-base group-hover:scale-125 transition-transform">⇄</span>
              <span>Switch to Dean Portal</span>
            </button>
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <div className="px-4 pb-4 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 hover:border-red-600/60 rounded-xl text-red-300 hover:text-red-100 text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <RoleSwitchModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        targetRole="dean"
      />
    </>
  );
}

export default Sidebar;
