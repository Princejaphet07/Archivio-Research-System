import React from 'react';
import { useUser } from '../context/UserContext';
import { useDarkMode } from '../context/DarkModeContext';
import NotificationBell from './NotificationBell';

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
  const { deanData } = useUser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const currentView = PAGE_TITLES[activePage] || { title: 'Dashboard', breadcrumb: '' };

  const handleSwitchToAdviser = () => {
    window.location.href = '/adviser/dashboard';
  };

  return (
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

      {/* Right side: Role tags, Year selector, Bell */}
      <div className="flex items-center gap-2 lg:gap-4">

        {/* Role Multi-Select pills - Only show for Dual Role users */}
        {deanData?.role === 'dean+adviser' && (
          <div className="hidden md:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-xl p-1 border border-stone-200/60 dark:border-stone-700 font-bold text-[11px] transition-all">
            <span className="text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-700 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Dean
            </span>
            <button
              onClick={handleSwitchToAdviser}
              className="text-stone-400 dark:text-stone-500 px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:text-stone-700 dark:hover:text-stone-300 hover:bg-white/50 dark:hover:bg-stone-700/50 rounded-lg transition-all"
              title="Switch to Adviser Portal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Adviser
            </button>
          </div>
        )}

        {/* Year Context Selector */}
        <div className="text-xs font-bold text-[#7a1f3d] dark:text-[#f8d070] bg-red-50 dark:bg-[#d4af37]/10 border border-red-100/60 dark:border-[#f8d070]/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-red-100/40 dark:hover:bg-[#d4af37]/20 transition-colors whitespace-nowrap flex items-center gap-1">
          🎓 S.Y. 2026–2027 <span className="text-[10px]">▼</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="relative p-2 rounded-xl text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition-all overflow-hidden"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className={`transition-all duration-500 transform ${isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
            {/* Sun Icon (Light Mode) */}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className={`absolute top-2 left-2 transition-all duration-500 transform ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
            {/* Moon Icon (Dark Mode) */}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
        </button>

        {/* Notification Bell */}
        <NotificationBell />
      </div>

    </header>
  );
}
