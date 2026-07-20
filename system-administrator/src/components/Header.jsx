import React from 'react';

export default function Header({ title, breadcrumbs }) {
  return (
    <header className="h-20 bg-white border-b border-stone-200 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">{title}</h2>
        <div className="flex items-center text-[11px] text-stone-500 font-medium mt-1">
          <span>System Admin</span>
          {breadcrumbs && breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span className="mx-1.5 text-stone-300">›</span>
              <span className={index === breadcrumbs.length - 1 ? "text-[#801e38] font-semibold" : "text-stone-800"}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end">
        {/* Search Box */}
        <div className="relative hidden sm:block flex-1 sm:flex-initial">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔍</span>
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:border-[#801e38] transition-all"
          />
        </div>

        {/* Academic Year Dropdown */}
        <div className="relative">
          <select className="px-4 py-2 bg-white border border-[#801e38]/30 rounded-lg text-sm text-[#801e38] font-semibold outline-none cursor-pointer hover:bg-stone-50 appearance-none pr-8">
            <option>SY 2025-2026</option>
            <option>SY 2024-2025</option>
            <option>SY 2023-2024</option>
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[8px] text-[#801e38]">▼</span>
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors cursor-pointer text-stone-600">
          🔔
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full text-[8px] flex items-center justify-center text-white font-bold">3</span>
        </button>
      </div>
    </header>
  );
}