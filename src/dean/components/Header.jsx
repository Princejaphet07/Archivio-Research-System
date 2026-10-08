import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useDarkMode } from '../context/DarkModeContext';
import NotificationBell from './NotificationBell';
import RoleSwitchModal from '../../components/RoleSwitchModal';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { logActivity } from '../../firebase/logActivity';
import Swal from 'sweetalert2';
import { getDisplayInitials } from '../../utils/nameUtils';
import { Calendar, ChevronDown, Check, Plus } from 'lucide-react';

const PAGE_TITLES = {
  'dashboard': { title: 'Dashboard', breadcrumb: '' },
  'research-records': { title: 'Research Records', breadcrumb: '' },
  'publish-queue': { title: 'Publish Queue', breadcrumb: '' },
  'requirements': { title: 'Requirements Tracking', breadcrumb: '' },
  'invitations': { title: 'Invitations', breadcrumb: '' },
  'reports': { title: 'Generate Reports', breadcrumb: 'ARCHIVIO > Generate Reports' },
  'user-management': { title: 'Users / Advisers', breadcrumb: '' },
  'settings': { title: 'Settings', breadcrumb: 'ARCHIVIO > Settings' },
};

export default function Header({ activePage, onMenuClick }) {
  const { deanData, deanSettings, user } = useUser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syDropdownOpen, setSyDropdownOpen] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const dropdownRef = useRef(null);
  const syDropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const currentView = PAGE_TITLES[activePage] || { title: 'Dashboard', breadcrumb: '' };

  const isDualRole = deanData?.role === 'dean+adviser';
  const deanName = deanData?.displayName || 
    (deanData?.firstName ? `${deanData.firstName} ${deanData.lastName || ''}`.trim() : '') || 
    deanData?.name || 
    user?.displayName || 
    'College Dean';

  const email = deanData?.email || user?.email || auth.currentUser?.email || '';

  // Extract clean first letter of first name and first letter of last name (e.g. "Pronce Vender" -> "PV")
  const displayInitials = getDisplayInitials({
    firstName: deanData?.firstName,
    lastName: deanData?.lastName,
    displayName: deanData?.displayName || user?.displayName || auth.currentUser?.displayName || deanData?.name,
    email: email
  }, 'PV');

  const profilePhotoUrl = deanData?.profilePhoto || deanData?.photoURL || deanData?.profilePhotoUrl || user?.photoURL || null;

  // Available school years configured by Dean (only shows 2026-2027 by default unless Dean created others in Settings)
  const availableSchoolYears = React.useMemo(() => {
    if (deanSettings?.schoolYears && Array.isArray(deanSettings.schoolYears) && deanSettings.schoolYears.length > 0) {
      return deanSettings.schoolYears;
    }
    // Default fallback: only 2026-2027 unless Dean creates/adds new school year
    return [{ id: 'default-2026', label: '2026-2027', status: 'Active' }];
  }, [deanSettings?.schoolYears]);

  const activeSYObj = availableSchoolYears.find(s => s.status === 'Active') || availableSchoolYears[0];
  const activeSY = activeSYObj?.label || '2026-2027';
  const displaySY = activeSY.includes('S.Y.') || activeSY.includes('SY') ? activeSY.replace(/^SY\s*/, 'S.Y. ') : `S.Y. ${activeSY}`;

  // Switch active school year
  const handleSelectSY = async (selectedSY) => {
    if (selectedSY.id === activeSYObj?.id) {
      setSyDropdownOpen(false);
      return;
    }
    try {
      const uid = user?.uid || auth.currentUser?.uid;
      if (!uid) return;

      const updated = availableSchoolYears.map(sy => ({
        ...sy,
        status: sy.id === selectedSY.id ? 'Active' : (sy.status === 'Active' ? 'Archive' : sy.status)
      }));

      await setDoc(doc(db, 'dean_settings', uid), {
        schoolYears: updated,
        schoolYear: selectedSY.label
      }, { merge: true });

      setSyDropdownOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Active School Year Changed',
        text: `Switched active school year to ${selectedSY.label}`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {
      console.error('Error updating active school year:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to switch school year.',
        confirmButtonColor: '#7a1f3d'
      });
    }
  };

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (syDropdownRef.current && !syDropdownRef.current.contains(e.target)) {
        setSyDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setSyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/dean/settings', { state: { tab: 'profile' } });
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    const result = await Swal.fire({
      title: 'Log out',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7a1f3d',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, log out'
    });

    if (!result.isConfirmed) return;

    try {
      const userEmail = auth.currentUser?.email || email;
      if (auth.currentUser?.uid) {
        try {
          const deanQ = query(collection(db, 'deans'), where('uid', '==', auth.currentUser.uid));
          const deanSnap = await getDocs(deanQ);
          if (!deanSnap.empty) {
            await updateDoc(deanSnap.docs[0].ref, { status: 'offline' });
          }
          await updateDoc(doc(db, 'users', auth.currentUser.uid), { status: 'offline' });
        } catch (e) {
          console.error('Failed to update status', e);
        }
        await logActivity({
          user: deanData?.displayName || userEmail,
          role: 'Dean',
          action: 'Log out',
          status: 'Success'
        });
      }
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      Swal.fire('Error', 'Failed to logout. Please try again.', 'error');
    }
  };

  return (
    <>
      <header className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 font-sans sticky top-0 z-10 transition-colors">

        {/* Left side: Mobile Toggle, Title, and Search */}
        <div className="flex items-center gap-4 lg:gap-6">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:block">
            <h2 className="font-serif text-xl font-bold text-[#7a1f3d] dark:text-[#f8d070]">{currentView.title}</h2>
            {currentView.breadcrumb && (
              <p className="text-[10px] text-stone-400 -mt-1 font-medium">{currentView.breadcrumb}</p>
            )}
          </div>

          <div className="hidden lg:block h-6 w-px bg-stone-200 dark:bg-stone-700 mx-2"></div>
        </div>

        {/* Right side: Role tags, Year selector, Dark mode, Bell, User Profile Avatar Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          {/* Role Multi-Select pills - Only show for Dual Role users */}
          {isDualRole && (
            <div className="hidden sm:flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl p-1 border border-stone-200/60 dark:border-stone-700 font-bold text-[11px] transition-all shadow-inner">
              <span className="text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 cursor-default">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Dean
              </span>
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="text-stone-500 dark:text-stone-400 px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-white/70 dark:hover:bg-stone-700/60 rounded-lg transition-all"
                title="Switch to Research Adviser Portal"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Adviser
              </button>
            </div>
          )}

          {/* Academic Year Selector with Dropdown (Desktop Only) */}
          <div className="relative hidden sm:block" ref={syDropdownRef}>
            <button
              type="button"
              onClick={() => setSyDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 bg-pink-50 hover:bg-pink-100/80 dark:bg-[#7a1f3d]/20 dark:hover:bg-[#7a1f3d]/35 text-[#541b2f] dark:text-[#f8d070] border border-pink-100 dark:border-[#f8d070]/30 font-semibold text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-sm focus:outline-none"
              title="Click to view or switch School Year"
            >
              <Calendar className="w-3.5 h-3.5 text-[#7a1f3d] dark:text-[#f8d070]" />
              <span>{displaySY}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${syDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* SY Dropdown Menu */}
            {syDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#1a1715] shadow-xl border border-stone-200 dark:border-stone-800 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Available School Years</span>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/50">
                    {availableSchoolYears.length} {availableSchoolYears.length === 1 ? 'Year' : 'Years'}
                  </span>
                </div>

                <div className="py-1 max-h-48 overflow-y-auto space-y-1">
                  {availableSchoolYears.map((sy) => {
                    const isActive = sy.status === 'Active' || sy.id === activeSYObj?.id;
                    const labelFormatted = sy.label.includes('S.Y.') || sy.label.includes('SY') ? sy.label.replace(/^SY\s*/, 'S.Y. ') : `S.Y. ${sy.label}`;
                    
                    return (
                      <button
                        key={sy.id}
                        type="button"
                        onClick={() => handleSelectSY(sy)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                          isActive
                            ? 'bg-[#7a1f3d]/10 text-[#7a1f3d] dark:bg-[#f8d070]/10 dark:text-[#f8d070] font-bold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#7a1f3d] dark:bg-[#f8d070]' : 'bg-stone-300 dark:bg-stone-600'}`}></span>
                          <span>{labelFormatted}</span>
                        </div>
                        {isActive ? (
                          <span className="text-[10px] bg-[#7a1f3d] text-white dark:bg-[#f8d070] dark:text-stone-900 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-normal">
                            {sy.status || 'Archived'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSyDropdownOpen(false);
                      navigate('/dean/settings', { state: { tab: 'schoolyear' } });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7a1f3d] dark:text-[#f8d070] hover:bg-[#7a1f3d]/5 dark:hover:bg-[#f8d070]/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manage / Add School Year</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="relative text-gray-500 hover:text-[#541b2f] dark:text-stone-400 dark:hover:text-[#f8d070] transition-all p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {isDarkMode ? (
                <svg className="w-5 h-5 text-[#f8d070]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Avatar with Hover/Click Dropdown */}
          <div 
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-stone-200 dark:border-stone-700 overflow-hidden hover:ring-2 hover:ring-[#7a2e46] dark:hover:ring-[#f8d070] transition-all cursor-pointer shrink-0 focus:outline-none flex items-center justify-center"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              title={deanName || "Dean"}
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#f4e6eb] dark:bg-[#7a1f3d] flex items-center justify-center text-[#7a2e46] dark:text-[#f8d070] font-bold text-xs tracking-tight select-none">
                  {displayInitials}
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200/80 dark:border-stone-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header Info */}
                <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800/80 mb-1">
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                    {deanName}
                  </p>
                  {email && (
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                      {email}
                    </p>
                  )}
                  <span className="inline-block mt-1.5 text-[9px] font-semibold bg-[#7a1f3d]/10 text-[#7a1f3d] dark:bg-[#f8d070]/20 dark:text-[#f8d070] px-2 py-0.5 rounded-full capitalize">
                    👩‍🏫 {isDualRole ? 'Dean + Adviser' : 'College Dean'}
                  </span>
                </div>

                {/* Profile Button */}
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <svg className="w-4 h-4 text-stone-500 dark:text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </header>

      <RoleSwitchModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        targetRole="adviser"
      />
    </>
  );
}
