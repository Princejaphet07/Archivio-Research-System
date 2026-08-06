import React from 'react';
import { useUser } from '../context/UserContext';
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
  const currentView = PAGE_TITLES[activePage] || { title: 'Dashboard', breadcrumb: '' };

  const handleSwitchToAdviser = () => {
    window.location.href = '/adviser/dashboard';
  };

  return (
    <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 font-sans sticky top-0 z-10">

      {/* Left side: Mobile Toggle, Title, and Search */}
      <div className="flex items-center gap-4 lg:gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-lg focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:block">
          <h2 className="font-serif text-xl font-bold text-[#7a1f3d]">{currentView.title}</h2>
          {currentView.breadcrumb && (
            <p className="text-[10px] text-stone-400 -mt-1 font-medium">{currentView.breadcrumb}</p>
          )}
        </div>

        <div className="hidden lg:block h-6 w-px bg-stone-200 mx-2"></div>

        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-stone-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search records, advisers, groups..."
            className="pl-9 pr-4 py-1.5 bg-stone-50 border border-stone-200/60 rounded-xl text-xs w-40 sm:w-60 lg:w-80 outline-none transition-all focus:bg-white focus:ring-1 focus:ring-[#7a1f3d] focus:border-[#7a1f3d]"
          />
        </div>
      </div>

      {/* Right side: Role tags, Year selector, Bell */}
      <div className="flex items-center gap-2 lg:gap-4">

        {/* Role Multi-Select pills - Only show for Dual Role users */}
        {deanData?.role === 'dean+adviser' && (
          <div className="hidden md:flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 border border-stone-200/60 font-bold text-[11px] transition-all">
            <span className="text-stone-700 bg-white px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Dean
            </span>
            <button
              onClick={handleSwitchToAdviser}
              className="text-stone-400 px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:text-stone-700 hover:bg-white/50 rounded-lg transition-all"
              title="Switch to Adviser Portal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Adviser
            </button>
          </div>
        )}

        {/* Year Context Selector */}
        <div className="text-xs font-bold text-[#7a1f3d] bg-red-50 border border-red-100/60 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-red-100/40 transition-colors whitespace-nowrap flex items-center gap-1">
          🎓 S.Y. 2026–2027 <span className="text-[10px]">▼</span>
        </div>

        {/* Notification Bell */}
        <NotificationBell />
      </div>

    </header>
  );
}
