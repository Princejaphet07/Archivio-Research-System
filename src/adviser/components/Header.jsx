import React from 'react';
import { useAdviser } from '../context/AdviserContext';
import { useDarkMode } from '../context/DarkModeContext';
import NotificationBell from './NotificationBell';
import { useNavigate } from 'react-router-dom';

function Header({ 
  title = "Dashboard", 
  breadcrumb = "ARCHIVIO › Dashboard", 
  showSearch = true, 
  searchQuery, 
  onSearchChange,
  onMenuToggle = () => {}
}) {
  const { userRole, adviserName, profilePhotoUrl, adviserData } = useAdviser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const isDualRole = userRole === 'dean+adviser' || adviserData?.role === 'dean+adviser';

  const handleSwitchToDean = () => {
    window.location.href = '/dean/dashboard';
  };

  return (
    <header className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md h-16 border-b border-gray-200 dark:border-stone-800 flex items-center justify-between px-4 sm:px-6 shadow-sm z-30 w-full transition-colors sticky top-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Button */}
        <button 
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-1 text-stone-600 dark:text-stone-300 hover:text-[#541b2f] dark:hover:text-[#f8d070] rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-serif font-bold text-[#541b2f] dark:text-[#f8d070] leading-tight truncate">
            {title}
          </h2>
          <p className="hidden sm:block text-[10px] text-gray-400 dark:text-stone-500 font-medium uppercase tracking-wider mt-0.5 truncate">
            {breadcrumb}
          </p>
        </div>
      </div>

      {showSearch && (
        <div className="hidden lg:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-stone-500 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery !== undefined ? searchQuery : ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search groups, students, research titles..."
              className="w-full bg-gray-50 dark:bg-stone-950/50 border border-gray-200 dark:border-stone-700/50 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-stone-800 dark:text-stone-200 placeholder-gray-400 dark:placeholder-stone-600 transition"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Role Multi-Select pills - Only show for Dual Role users */}
        {isDualRole && (
          <div className="hidden sm:flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 border border-stone-200/60 dark:border-stone-700/60 font-bold text-[11px] transition-all">
            <button
              onClick={handleSwitchToDean}
              className="text-stone-500 dark:text-stone-400 px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:text-red-700 dark:hover:text-red-300 hover:bg-white/60 dark:hover:bg-stone-700/50 rounded-lg transition-all"
              title="Switch to Dean Portal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Dean
            </button>
            <span className="text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-700 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Adviser
            </span>
          </div>
        )}

        {/* Academic Year Pill (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-1.5 bg-pink-50 dark:bg-[#7a1f3d]/20 text-[#541b2f] dark:text-[#f8d070] border border-pink-100 dark:border-[#f8d070]/30 font-semibold text-xs py-1.5 px-3 rounded-lg">
          <span>📅</span>
          <span>S.Y. 2026-2027</span>
        </div>
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode} 
          className="relative text-gray-500 hover:text-[#541b2f] dark:text-stone-400 dark:hover:text-[#f8d070] transition-all p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          title="Toggle Dark Mode"
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

        {/* User Profile Avatar */}
        <button 
          onClick={() => navigate('/adviser/my-profile')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-stone-200 dark:border-stone-700 overflow-hidden hover:ring-2 hover:ring-[#7a2e46] dark:hover:ring-[#f8d070] transition-all cursor-pointer shrink-0"
          title="Go to Profile/Settings"
          aria-label="User profile"
        >
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f4e6eb] dark:bg-[#7a1f3d] flex items-center justify-center text-[#7a2e46] dark:text-[#f8d070] font-bold text-xs">
              {adviserName ? adviserName.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
