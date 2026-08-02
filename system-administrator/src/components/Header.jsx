import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAcademicYear } from '../context/AcademicYearContext';

export default function Header({ title, breadcrumbs, searchQuery, onSearchChange }) {
  const { selectedYear, changeYear } = useAcademicYear();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const logsRef = collection(db, 'activity_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(10));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(logs);

      const lastRead = localStorage.getItem('admin_notifications_last_read');
      if (lastRead) {
        const newUnread = logs.filter(log => new Date(log.timestamp || 0) > new Date(lastRead)).length;
        setUnreadCount(newUnread);
      } else {
        setUnreadCount(logs.length);
      }
    });
    return () => unsub();
  }, []);

  const handleToggleDropdown = () => {
    const newState = !showDropdown;
    setShowDropdown(newState);
    if (newState) {
      setUnreadCount(0);
      localStorage.setItem('admin_notifications_last_read', new Date().toISOString());
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

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
        {onSearchChange !== undefined && (
          <div className="relative hidden sm:block flex-1 sm:flex-initial text-stone-500">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search anything..." 
              value={searchQuery !== undefined ? searchQuery : ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:border-[#801e38] transition-all"
            />
          </div>
        )}

        {/* Academic Year Dropdown */}
        <div className="relative">
          <select 
            value={selectedYear}
            onChange={(e) => changeYear(e.target.value)}
            className="px-4 py-2 bg-white border border-[#801e38]/30 rounded-lg text-sm text-[#801e38] font-semibold outline-none cursor-pointer hover:bg-stone-50 appearance-none pr-8"
          >
            <option value="SY 2026-2027">SY 2026-2027</option>
            <option value="SY 2025-2026">SY 2025-2026</option>
            <option value="SY 2024-2025">SY 2024-2025</option>
            <option value="SY 2023-2024">SY 2023-2024</option>
            <option value="All">All Time</option>
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[8px] text-[#801e38]">▼</span>
        </div>

        {/* Notifications Icon */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleToggleDropdown}
            className="relative p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors cursor-pointer text-stone-600"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full text-[8px] flex items-center justify-center text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="p-3 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">System Updates</h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length > 0 ? notifications.map((log) => (
                  <div key={log.id} className="p-3 border-b border-stone-50 hover:bg-stone-50 transition flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0 text-[#801e38] font-bold text-[10px] border border-stone-200 mt-0.5">
                      {log.user ? log.user.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <p className="text-[11px] text-stone-800 leading-tight">
                        <span className="font-bold">{log.user || 'System'}</span> {log.action}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5 leading-tight">{log.details}</p>
                      <p className="text-[9px] text-stone-400 mt-1">{new Date(log.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-xs text-stone-500">No recent updates</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}