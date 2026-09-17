import React, { useState, useEffect, useRef } from 'react';
import NotificationBell from './NotificationBell';
import { db, auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import Swal from 'sweetalert2';

export default function PortalHeader({ 
  title, 
  initials, 
  setSidebarOpen, 
  setActiveTab, 
  profilePhotoUrl,
  role = 'Student',
  studentName,
  onLogout
}) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('student_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('student_dark_mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
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
    if (setActiveTab) {
      setActiveTab('Settings');
    }
  };

  const handleLogoutClick = async () => {
    setDropdownOpen(false);
    const result = await Swal.fire({
      title: 'Log out',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#801e38',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, log out'
    });

    if (!result.isConfirmed) return;

    if (onLogout) {
      await onLogout();
    } else {
      await signOut(auth);
      window.location.href = '/';
    }
  };

  const displayName = studentName || auth.currentUser?.displayName || 'Student User';
  const displayEmail = auth.currentUser?.email || '';

  return (
    <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 z-30 shrink-0 bg-white/50 dark:bg-stone-900/50 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-800/50 sticky top-0 transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          className="lg:hidden p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors touch-manipulation"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg sm:text-[22px] font-serif font-bold text-gray-900 dark:text-stone-100 tracking-tight transition-colors truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode} 
          className="relative text-gray-400 hover:text-[#7B1F35] dark:text-stone-400 dark:hover:text-[#f8d070] transition-all p-1.5 overflow-hidden h-9 w-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 touch-manipulation cursor-pointer"
          title="Toggle Dark Mode"
          aria-label="Toggle Dark Mode"
        >
          <div className={`transition-all duration-500 transform ${isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
            <svg className="w-5 h-5 absolute inset-0 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className={`absolute inset-0 m-auto transition-all duration-500 transform ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
            <svg className="w-5 h-5 absolute inset-0 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
        </button>

        {/* Notifications Bell */}
        <NotificationBell onNavigate={(tab) => setActiveTab && setActiveTab(tab)} />

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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm cursor-pointer overflow-hidden hover:ring-2 hover:ring-[#7B1F35]/50 dark:hover:ring-[#7B1F35]/50 transition-all shrink-0 touch-manipulation focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            title={displayName}
          >
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials || 'ST'
            )}
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200/80 dark:border-stone-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info */}
              <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800/80 mb-1">
                <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                  {displayName}
                </p>
                {displayEmail && (
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5">
                    {displayEmail}
                  </p>
                )}
                <span className="inline-block mt-1.5 text-[9px] font-semibold bg-[#7B1F35]/10 text-[#7B1F35] dark:bg-[#7B1F35]/30 dark:text-red-300 px-2 py-0.5 rounded-full capitalize">
                  🎓 {role || 'Student'}
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
                onClick={handleLogoutClick}
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
  );
}
