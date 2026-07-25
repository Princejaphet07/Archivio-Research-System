import React from 'react';
import swuLogoSeal from '../assets/new icon.png';

export default function Sidebar({ isOpen, setIsOpen, activeTab, setActiveTab, onLogout, studentName, initials }) {
  
  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> 
    },
    { 
      name: 'Manuscript', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
    },
    { 
      name: 'Requirements', 
      badge: '2',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> 
    },
    { 
      name: 'Progress', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg> 
    },
    { 
      name: 'My Group', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 
    },
    { 
      name: 'Settings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed lg:static top-0 left-0 h-screen w-[260px] bg-[#FDF9ED] flex flex-col justify-between z-50 transition-transform duration-300 font-sans border-r border-[#E8DFCB] ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div>
          <div className="flex items-center gap-3 px-8 pt-8 pb-10">
            <div className="w-[32px] h-[32px] bg-[#7B1F35] rounded flex items-center justify-center">
              <img src={swuLogoSeal} alt="SWU Logo" className="w-[20px] h-[20px] object-contain" />
            </div>
            <div>
              <span className="text-[16px] font-bold text-[#1A1A1A] tracking-wide block leading-none">ARCHIVIO</span>
              <span className="text-[11px] text-gray-500 font-medium">Student Portal</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-4">
            {menuItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button 
                  key={item.name} 
                  onClick={() => { setActiveTab(item.name); setIsOpen(false); }}
                  className={`flex items-center justify-between px-5 py-3.5 rounded-xl text-[14px] font-medium transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-[#F4DEE5] text-[#7B1F35] font-bold' 
                      : 'bg-transparent text-gray-600 hover:bg-black/5 hover:text-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {item.icon}
                    {item.name}
                  </div>
                  
                  {/* Right side Badge or active indicator */}
                  {item.badge && (
                    <span className="bg-[#CF3645] text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#7B1F35] rounded-l-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Bottom Section (Need Help & Profile) */}
        <div className="px-6 pb-8 flex flex-col gap-4">
          
          {/* Need help box */}
          <div className="bg-[#F4DEE5] p-5 rounded-2xl flex flex-col gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h4 className="text-[#7B1F35] font-bold text-[14px]">Need help?</h4>
            <p className="text-gray-600 text-[12px] leading-tight">Contact your<br/>Research Adviser</p>
          </div>

          {/* User Profile */}
          <div className="border border-[#E8DFCB] rounded-2xl p-3 flex items-center gap-3 bg-transparent cursor-pointer hover:bg-black/5 transition-colors" onClick={onLogout}>
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-[14px] shrink-0 shadow-sm">
              {initials || 'ST'}
            </div>
            <div className="flex flex-col flex-1 truncate">
              <span className="text-[13px] font-bold text-[#1A1A1A] truncate">{studentName || 'Student Name'}</span>
              <span className="text-[11px] text-gray-500">Group Leader</span>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}