import React, { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';

export default function PortalHeader({ title, initials, setSidebarOpen, setActiveTab, profilePhotoUrl }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('student_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('student_dark_mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
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
        <button 
          onClick={toggleDarkMode} 
          className="relative text-gray-400 hover:text-[#7B1F35] dark:text-stone-400 dark:hover:text-[#f8d070] transition-all p-1.5 overflow-hidden h-9 w-9 min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 touch-manipulation"
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
        <NotificationBell onNavigate={(tab) => setActiveTab && setActiveTab(tab)} />
        <div 
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm cursor-pointer overflow-hidden hover:ring-2 hover:ring-[#7B1F35]/50 dark:hover:ring-[#7B1F35]/50 transition-all shrink-0 touch-manipulation"
          onClick={() => setActiveTab && setActiveTab('Settings')}
          title="Account Settings"
        >
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initials || 'ST'
          )}
        </div>
      </div>
    </header>
  );
}
