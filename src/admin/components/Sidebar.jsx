import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useUser } from '../context/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { BookOpen } from 'lucide-react';
import { logActivity } from '../firebase/logActivity';
import Swal from 'sweetalert2';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useUser();

  const isSuperAdmin = currentUser?.role === 'super-admin';
  const moduleAccess = currentUser?.moduleAccess || {};

  // Returns true if module is accessible
  const canAccess = (module) => {
    if (!isSuperAdmin) return true; // Full admin can access all
    return !!moduleAccess[module];
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Log out',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#801e38',
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

  const NavButton = ({ path, module, label, icon, badge }) => {
    const isActive = location.pathname === path;
    const accessible = canAccess(module);

    if (!accessible) {
      return (
        <div
          title={`Access restricted — not granted by System Administrator`}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold opacity-40 cursor-not-allowed select-none bg-black/10"
        >
          <div className="flex items-center gap-3 text-stone-500">
            <div className="text-stone-500">{icon}</div>
            <span className="tracking-wide">{label}</span>
          </div>
          <span className="text-[9px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded font-extrabold tracking-wider">LOCKED</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        className={`group relative w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl text-xs font-bold transition-all duration-300 ease-out overflow-hidden ${
          isActive
            ? 'text-white shadow-lg shadow-black/20'
            : 'text-stone-400 hover:text-white'
        }`}
      >
        <div 
          className={`absolute inset-0 rounded-xl transition-all duration-300 ease-out ${
            isActive 
              ? 'bg-gradient-to-r from-white/15 to-transparent border border-white/10 opacity-100 translate-x-0' 
              : 'bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4'
          }`} 
        />
        
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-[#d6ad60] rounded-r-full transition-all duration-300 ease-out shadow-[0_0_10px_#d6ad60] ${
            isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          }`}
        />

        <div className="relative flex items-center gap-3 z-10 transform transition-transform duration-300 group-hover:translate-x-1">
          <div className={`transition-all duration-300 ${isActive ? 'text-[#d6ad60] scale-110 drop-shadow-[0_0_8px_rgba(214,173,96,0.5)]' : 'text-stone-400 group-hover:text-white'}`}>
            {icon}
          </div>
          <span className="tracking-wide">{label}</span>
        </div>
        
        {badge && (
          <span className={`relative z-10 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm transition-all duration-300 ${
            isActive ? 'bg-[#d6ad60] text-[#3b1220]' : 'bg-[#801e38] text-white'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  const initials = currentUser?.displayName
    ? currentUser.displayName.substring(0, 2).toUpperCase()
    : 'SA';

  return (
    <aside className="w-64 bg-[#3b1220] dark:bg-[#121212] text-white flex flex-col justify-between shrink-0 hidden md:flex border-r border-stone-200/10 dark:border-stone-800">
      <div>
        {/* Logo Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <img src={logo} alt="ARCHIVIO" className="w-10 h-10 rounded-full border border-white/20 object-contain bg-white" />
          <div>
            <h1 className="text-base font-serif font-bold tracking-widest text-[#f5ebd9]">ARCHIVIO</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] text-stone-400 tracking-wider uppercase">
                {isSuperAdmin ? 'Super Administrator' : 'System Administrator'}
              </p>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${isSuperAdmin ? 'bg-amber-700/70 text-amber-200' : 'bg-[#801e38] text-white'}`}>
                {isSuperAdmin ? 'Super' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Super Admin Info Banner */}
        {isSuperAdmin && (
          <div className="mx-4 mt-4 px-3 py-2.5 bg-amber-900/30 border border-amber-700/40 rounded-xl">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">View-Only Access</p>
            <p className="text-[10px] text-amber-300/70 leading-relaxed">
              You have limited access granted by the System Administrator.
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <div className="px-4 py-6 space-y-6">
          {/* Section: MAIN */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5">Main</p>
            <nav className="space-y-1">
              {/* Dashboard */}
              <NavButton
                path="/admin/dashboard"
                module="dashboard"
                label="Dashboard"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              />

              {/* User Management */}
              {!isSuperAdmin && (
                <NavButton
                  path="/admin/user-management"
                  module="userManagement"
                  label="User Management"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  }
                />
              )}
            </nav>
          </div>

          {/* Section: MONITORING */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5 mt-6">Monitoring</p>
            <nav className="space-y-1">
              <NavButton
                path="/admin/all-users"
                module="allUsers"
                label="All Users"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                }
              />
              <NavButton
                path="/admin/activity-logs"
                module="activityLogs"
                label="Activity Logs"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
              />
              <NavButton
                path="/admin/reports"
                module="reports"
                label="Reports"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                }
              />
            </nav>
          </div>

          {/* Section: SYSTEM */}
          {!isSuperAdmin ? (
            <div>
              <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5 mt-6">System</p>
              <nav className="space-y-1">
                <NavButton
                  path="/admin/settings"
                  module="settings"
                  label="System Settings"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774a1.125 1.125 0 01.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.894.15c.542.09.94.56.94 1.11v1.094c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738a1.125 1.125 0 01-.12 1.45l-.773.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.93l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.424-.383-.764-.78-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 01-1.45-.12l-.774-.772a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.398-.165.71-.505.78-.93l.15-.894z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
              </nav>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5 mt-6">Account</p>
              <nav className="space-y-1">
                <NavButton
                  path="/admin/super-admin-settings"
                  module="superAdminSettings"
                  label="My Account"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Profile Card & Logout Button */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/10">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border border-white/10 shadow-inner ${isSuperAdmin ? 'bg-amber-700' : 'bg-[#801e38]'} text-[#f5ebd9]`}>
            {initials}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">{isSuperAdmin ? 'Super Admin' : 'System Admin'}</h4>
            <p className="text-[9px] text-stone-400">Archivio Workspace</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Logout"
          className="w-8 h-8 rounded-lg bg-[#801e38]/10 hover:bg-[#801e38] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M19 12H9m10 0l-3-3m3 3l-3 3" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
