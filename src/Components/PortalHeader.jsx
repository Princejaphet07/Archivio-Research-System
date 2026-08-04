import React from 'react';
import NotificationBell from './NotificationBell';

export default function PortalHeader({ title, initials, setSidebarOpen, setActiveTab, profilePhotoUrl }) {
  return (
    <header className="h-[90px] flex items-center justify-between px-8 z-10 shrink-0 bg-[#FDF9ED]">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-[20px] font-bold text-[#1A1A1A]">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div 
          className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer overflow-hidden hover:ring-2 hover:ring-[#7B1F35]/50 transition-all"
          onClick={() => setActiveTab && setActiveTab('Settings')}
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
