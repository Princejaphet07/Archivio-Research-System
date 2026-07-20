import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png'; // Siguroha nga husto ang path sa imong logo

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#3b1220] text-white flex flex-col justify-between shrink-0 hidden md:flex border-r border-stone-200/10">
      <div>
        {/* Logo Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <img src={logo} alt="ARCHIVIO" className="w-10 h-10 rounded-full border border-white/20 object-contain bg-white" />
          <div>
            <h1 className="text-base font-serif font-bold tracking-widest text-[#f5ebd9]">ARCHIVIO</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] text-stone-400 tracking-wider uppercase">System Administrator</p>
              <span className="text-[8px] bg-[#801e38] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-4 py-6 space-y-6">
          {/* Section: MAIN */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5">Main</p>
            <nav className="space-y-1">
              
              {/* Dashboard */}
              <button 
                onClick={() => navigate('/dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/dashboard' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className={`w-4 h-4 ${location.pathname === '/dashboard' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <span>Dashboard</span>
                </div>
              </button>

              {/* Dean Onboarding */}
              <button 
                onClick={() => navigate('/dean-onboarding')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/dean-onboarding' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className={`w-4 h-4 ${location.pathname === '/dean-onboarding' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span>Dean Onboarding</span>
                </div>
                <span className="bg-[#801e38] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">1</span>
              </button>

              {/* Departments & Programs */}
              <button 
                onClick={() => navigate('/departments')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/departments' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <svg className={`w-4 h-4 ${location.pathname === '/departments' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
                <span>Departments & Programs</span>
              </button>
            </nav>
          </div>

          {/* Section: MONITORING */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5">Monitoring</p>
            <nav className="space-y-1">
              <button
                onClick={() => navigate('/all-users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/all-users' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <svg className={`w-4 h-4 ${location.pathname === '/all-users' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <span>All Users</span>
              </button>
              <button
                onClick={() => navigate('/activity-logs')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/activity-logs' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <svg className={`w-4 h-4 ${location.pathname === '/activity-logs' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Activity Logs</span>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${location.pathname === '/reports' ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'}`}
              >
                <svg className={`w-4 h-4 ${location.pathname === '/reports' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                <span>Reports</span>
              </button>
            </nav>
          </div>

          {/* Section: SYSTEM */}
          <div>
            <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase px-3 mb-2.5">System</p>
            <nav className="space-y-1">
              <button 
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  location.pathname === '/settings' 
                    ? 'bg-white/[0.06] text-white border-l-2 border-[#d6ad60]' 
                    : 'text-stone-400 hover:bg-white/[0.02] hover:text-white'
                }`}
              >
                <svg className={`w-4 h-4 ${location.pathname === '/settings' ? 'text-[#d6ad60]' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774a1.125 1.125 0 01.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.894.15c.542.09.94.56.94 1.11v1.094c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738a1.125 1.125 0 01-.12 1.45l-.773.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.93l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.424-.383-.764-.78-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 01-1.45-.12l-.774-.772a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.398-.165.71-.505.78-.93l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>System Settings</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Profile Card & Logout Button */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#801e38] flex items-center justify-center font-bold text-sm text-[#f5ebd9] border border-white/10 shadow-inner">
            SW
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">SWUOO8</h4>
            <p className="text-[9px] text-stone-400">System Admin</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')} // Mobalik sa Login screen
          title="Logout"
          className="w-8 h-8 rounded-lg bg-[#801e38]/10 hover:bg-[#801e38] text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M19 12H9m10 0l-3-3m3 3l-3 3" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;