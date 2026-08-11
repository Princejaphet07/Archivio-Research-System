import React from 'react';
import { useAdviser } from '../context/AdviserContext';
import NotificationBell from './NotificationBell';
import { useNavigate } from 'react-router-dom';

function Header({ title = "Dashboard", breadcrumb = "ARCHIVIO › Dashboard", showSearch = true, searchQuery, onSearchChange }) {
  const { userRole, adviserName, profilePhotoUrl } = useAdviser();
  const navigate = useNavigate();

  const handleSwitchToDean = () => {
    window.location.href = '/dean/dashboard';
  };
  return (
    <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 w-full">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-gray-500 hover:text-[#541b2f]">☰</button>
        <div>
          <h2 className="text-xl font-serif font-bold text-[#541b2f] leading-none">{title}</h2>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">{breadcrumb}</p>
        </div>
      </div>

      {showSearch && (
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery !== undefined ? searchQuery : ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search groups, students, research titles..."
              className="w-full bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition"
            />
          </div>
        </div>
      )}

      <div className={`flex items-center gap-4 ${!showSearch && 'ml-auto'}`}>
        {/* Role Multi-Select pills - Only show for Dual Role users */}
        {userRole === 'dean+adviser' && (
          <div className="hidden md:flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 border border-stone-200/60 font-bold text-[11px] transition-all">
            <button
              onClick={handleSwitchToDean}
              className="text-stone-400 px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:text-stone-700 hover:bg-white/50 rounded-lg transition-all"
              title="Switch to Dean Portal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Dean
            </button>
            <span className="text-stone-700 bg-white px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Adviser
            </span>
          </div>
        )}

        <select className="hidden lg:block bg-pink-50 text-[#541b2f] border border-pink-100 font-semibold text-xs py-1.5 px-3 rounded-lg focus:outline-none">
          <option>📅 S.Y. 2026-2027</option>
        </select>
        <NotificationBell />
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))} 
          className="text-gray-400 hover:text-[#541b2f] transition"
          title="Open Chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
        <button 
          onClick={() => navigate('/adviser/my-profile')}
          className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden hover:ring-2 hover:ring-[#7a2e46] transition-all cursor-pointer"
          title="Go to Profile/Settings"
        >
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f4e6eb] flex items-center justify-center text-[#7a2e46] font-bold text-[10px]">
              {adviserName ? adviserName.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
