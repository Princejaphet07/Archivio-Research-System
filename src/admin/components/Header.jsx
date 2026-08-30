import React from 'react';
import { Search } from 'lucide-react';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useDarkMode } from '../context/DarkModeContext';
import NotificationBell from './NotificationBell';

export default function Header({ title, breadcrumbs, searchQuery, onSearchChange }) {
  const { selectedYear, changeYear } = useAcademicYear();
  const { isDarkMode, toggleDarkMode } = useDarkMode();


  const academicYears = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const baseYear = currentMonth >= 7 ? currentYear : currentYear - 1;
    const years = [];
    for (let i = 0; i < 4; i++) {
      const start = baseYear - i;
      years.push(`SY ${start}-${start + 1}`);
    }
    if (selectedYear && selectedYear !== 'All' && !years.includes(selectedYear)) {
      years.push(selectedYear);
      years.sort((a, b) => {
        const getYr = (s) => parseInt(s.match(/SY (\d{4})/)?.[1] || 0);
        return getYr(b) - getYr(a);
      });
    }
    return years;
  }, [selectedYear]);

  return (
    <header className="h-20 bg-white dark:bg-[#1a1a1a] border-b border-stone-200 dark:border-stone-800 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">{title}</h2>
        <div className="flex items-center text-[11px] text-stone-500 dark:text-stone-400 font-medium mt-1">
          <span>System Admin</span>
          {breadcrumbs && breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span className="mx-1.5 text-stone-300 dark:text-stone-600">›</span>
              <span className={index === breadcrumbs.length - 1 ? "text-[#801e38] font-semibold" : "text-stone-800 dark:text-stone-200"}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end">
        {/* Search Box */}
        {onSearchChange !== undefined && (
          <div className="relative hidden sm:block flex-1 sm:flex-initial text-stone-500 dark:text-stone-400">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search anything.." 
              value={searchQuery !== undefined ? searchQuery : ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-stone-50 dark:bg-[#252525] border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:border-[#801e38] transition-all dark:text-stone-200"
            />
          </div>
        )}

        {/* Academic Year Dropdown */}
        <div className="relative">
          <select 
            value={selectedYear}
            onChange={(e) => changeYear(e.target.value)}
            className="px-4 py-2 bg-[#faf9f6] dark:bg-[#1e1e1e] border border-[#801e38] dark:border-stone-600 rounded-lg text-sm text-[#801e38] dark:text-stone-300 font-bold outline-none cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 appearance-none pr-8"
          >
            {academicYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
            <option value="All">All Time</option>
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[8px] text-[#801e38] dark:text-stone-300">▼</span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 ml-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Notifications Icon */}
        <NotificationBell />
      </div>
    </header>
  );
}
