import React, { useState, useEffect } from 'react';
import { Search, Menu, X, LayoutDashboard, UserCheck, Users, Activity, FileText, Settings as SettingsIcon, LogOut, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useUser } from '../context/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { logActivity } from '../firebase/logActivity';
import Swal from 'sweetalert2';
import logo from '../../assets/logo.png';
import { useSystemLogo } from '../../hooks/useSystemLogo';
import NotificationBell from './NotificationBell';

export default function Header({ title, breadcrumbs, searchQuery, onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedYear, changeYear, availableYears } = useAcademicYear();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { currentUser } = useUser();
  const { logoUrl } = useSystemLogo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super-admin';
  const moduleAccess = currentUser?.moduleAccess || {};

  const canAccess = (module) => {
    if (!isSuperAdmin) return true;
    if (!module || module === 'superAdminSettings' || module === 'account') return true;
    return !!moduleAccess[module];
  };

  // Close mobile drawer on route change or ESC key
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const handleLogout = async () => {
    setMobileOpen(false);
    const result = await Swal.fire({
      title: 'Log out',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#770000',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, log out'
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoggingOut(true);
      const email = auth.currentUser?.email;
      if (email) {
        await logActivity({
          user: currentUser?.displayName || email,
          role: currentUser?.role || 'Admin',
          action: 'Log out',
          status: 'Success'
        });
      }
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
      window.location.href = '/';
    }
  };

  const academicYears = React.useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return availableYears;
    }
    return [selectedYear || 'SY 2026-2027'];
  }, [availableYears, selectedYear]);

  const initials = currentUser?.displayName
    ? currentUser.displayName.substring(0, 2).toUpperCase()
    : 'SA';

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', module: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ...(!isSuperAdmin ? [{ label: 'User Management', path: '/admin/user-management', module: 'userManagement', icon: <UserCheck className="w-4 h-4" /> }] : []),
    { label: 'All Users', path: '/admin/all-users', module: 'allUsers', icon: <Users className="w-4 h-4" /> },
    { label: 'Activity Logs', path: '/admin/activity-logs', module: 'activityLogs', icon: <Activity className="w-4 h-4" /> },
    { label: 'Reports', path: '/admin/reports', module: 'reports', icon: <FileText className="w-4 h-4" /> },
    { 
      label: isSuperAdmin ? 'My Account' : 'System Settings', 
      path: isSuperAdmin ? '/admin/super-admin-settings' : '/admin/settings', 
      module: isSuperAdmin ? 'superAdminSettings' : 'settings', 
      icon: <SettingsIcon className="w-4 h-4" /> 
    },
  ];

  return (
    <>
      <header className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 font-sans sticky top-0 z-30 transition-colors">

        {/* Left side: Mobile Toggle, Title, and Breadcrumbs */} 
        <div className="flex items-center gap-3">
          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open mobile navigation menu"
            className="md:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight">
              {title}
            </h2>
            <div className="flex items-center text-[11px] text-stone-500 dark:text-stone-400 font-medium mt-0.5">
              <span>System Admin</span>
              {breadcrumbs && breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <span className="mx-1.5 text-stone-300 dark:text-stone-600">›</span>
                  <span className={index === breadcrumbs.length - 1 ? "text-[#770000] dark:text-[#ff8ca3] font-semibold" : "text-stone-800 dark:text-stone-200"}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Search, Academic Year, Dark Mode, Notifications */}
        <div className="flex items-center gap-2.5 sm:gap-4 justify-end">
          {/* Search Box */}
          {onSearchChange !== undefined && (
            <div className="relative hidden sm:block text-stone-500 dark:text-stone-400">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} aria-hidden="true" />
              </span>
              <input 
                type="text"
                name="admin-search-input"
                aria-label="Search records"
                placeholder="Search anything.." 
                value={searchQuery !== undefined ? searchQuery : ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-stone-50 dark:bg-[#252525] border border-stone-200 dark:border-stone-700 rounded-xl text-sm outline-none focus:border-[#770000] focus:ring-1 focus:ring-[#770000] transition-all dark:text-stone-200"
              />
            </div>
          )}

          {/* Academic Year Dropdown with Clarifying Tooltip */}
          <div className="relative" title="Academic year scopes research submissions and seasonal metrics (User accounts remain permanent)">
            <select 
              value={selectedYear}
              onChange={(e) => changeYear(e.target.value)}
              aria-label="Select Academic School Year"
              className="px-3 sm:px-4 py-2 bg-[#faf9f6] dark:bg-[#1e1e1e] border border-[#770000] dark:border-stone-600 rounded-xl text-xs sm:text-sm text-[#770000] dark:text-stone-300 font-bold outline-none cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 appearance-none pr-7 sm:pr-8 transition shadow-2xs"
            >
              {academicYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
              <option value="All">All Time</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[8px] text-[#770000] dark:text-stone-300" aria-hidden="true">
              ▼
            </span>
          </div>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notifications Icon */}
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Navigation (Shown on screens <md) */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          {/* Overlay Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Panel */}
          <div className="relative w-72 max-w-[85vw] bg-[#590000] dark:bg-[#121212] text-white flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            <div>
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logoUrl || logo} alt="ARCHIVIO" className="w-9 h-9 rounded-full border border-white/20 object-contain bg-white" />
                  <div>
                    <h1 className="text-sm font-serif font-bold tracking-widest text-[#f5ebd9]">ARCHIVIO</h1>
                    <p className="text-[9px] text-stone-400 tracking-wider uppercase">
                      {isSuperAdmin ? 'Super Admin' : 'System Admin'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-1">
                <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 py-2">Menu</p>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const accessible = canAccess(item.module);

                  if (!accessible) return null;

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-white/15 text-white font-extrabold shadow-sm'
                          : 'text-stone-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className={isActive ? 'text-[#d6ad60]' : 'text-stone-400'}>
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border border-white/10 ${isSuperAdmin ? 'bg-amber-700' : 'bg-[#770000]'} text-[#f5ebd9]`}>
                  {initials}
                </div>
                <div className="truncate max-w-[130px]">
                  <h4 className="text-xs font-bold text-white truncate">{currentUser?.displayName || 'Admin'}</h4>
                  <p className="text-[9px] text-stone-400">Workspace</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
                className="p-2 rounded-lg bg-white/5 hover:bg-red-900/40 text-stone-300 hover:text-red-300 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

