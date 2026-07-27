import React from 'react';
import { useAdviser } from '../context/AdviserContext';

function Header({ title = "Dashboard", breadcrumb = "ARCHIVIO › Dashboard", showSearch = true, searchQuery, onSearchChange }) {
  const { userRole } = useAdviser();

  const handleSwitchToDean = () => {
    window.location.href = 'http://localhost:5174';
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
        <button className="relative text-gray-400 hover:text-[#541b2f] transition">
          🔔<span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full border border-white"></span>
        </button>
        <button className="text-gray-400 hover:text-[#541b2f] transition">👤</button>
      </div>
    </header>
  );
}

export default Header;