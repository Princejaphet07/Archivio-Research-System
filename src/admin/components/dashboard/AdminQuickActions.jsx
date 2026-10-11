import React, { useState } from 'react';
import { Search, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminQuickActions({ 
  systemHealth = 'Operational',
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  placeholder = "Search users, departments, records..."
}) {
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState('');

  const query = externalSearchQuery !== undefined ? externalSearchQuery : localQuery;
  const setQuery = (val) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val);
    } else {
      setLocalQuery(val);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/admin/all-users?search=${encodeURIComponent(trimmed)}`, {
      state: { search: trimmed }
    });
  };

  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: System Health & Status Indicator */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              System Status: {systemHealth}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Auth & Cloud Firestore synced</span>
          </div>
        </div>

        {/* Right: Operational Search Bar (Replacing Quick Action Buttons) */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="relative w-full sm:w-80 lg:w-96 group"
        >
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500 group-focus-within:text-[#770000] dark:group-focus-within:text-[#ff8ca3] transition-colors">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-22 py-2 sm:py-2.5 bg-stone-50/90 dark:bg-[#252525] hover:bg-stone-100/80 dark:hover:bg-[#2a2a2a] focus:bg-white dark:focus:bg-[#1a1a1a] border border-stone-200 dark:border-stone-700/80 rounded-xl text-xs sm:text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-[#770000] dark:focus:border-[#770000] focus:ring-2 focus:ring-[#770000]/15 transition-all shadow-2xs"
              aria-label="Search users and records"
            />

            {/* Right-aligned Input Controls */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition cursor-pointer"
                  aria-label="Clear search input"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 bg-stone-200/70 dark:bg-stone-700/70 hover:bg-[#770000] hover:text-white dark:hover:bg-[#770000] dark:hover:text-white transition disabled:opacity-40 disabled:hover:bg-stone-200/70 disabled:hover:text-stone-500 cursor-pointer disabled:cursor-default"
                title="Press Enter to search directory"
              >
                Search ↵
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
