import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function MyGroupPage({ onLogout, studentName, initials, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Exact data extracted from your design
  const teamMembers = [
    {
      id: '20-2222-001',
      name: 'Hylla Tejada',
      role: 'Group Leader',
      email: 'htejada.swu@phinmaed.com',
      initials: 'JR',
      avatarBg: 'bg-[#6B0F1A]',
      isYou: true,
      cardBg: 'bg-[#FAF0F2]',
      cardBorder: 'border-[#E8D0D6]'
    },
    {
      id: '20-2222-002',
      name: 'Jemi Zamoras',
      role: 'Member',
      email: 'jzamoras.swu@phinmaed.com',
      initials: 'ML',
      avatarBg: 'bg-[#155EEF]',
      isYou: false,
      cardBg: 'bg-[#FDFBF3]',
      cardBorder: 'border-[#E6DFBF]'
    },
    {
      id: '20-2222-003',
      name: 'Prince Vender',
      role: 'Member',
      email: 'pvender.swu@phinmaed.com',
      initials: 'RD',
      avatarBg: 'bg-[#039855]',
      isYou: false,
      cardBg: 'bg-[#FDFBF3]',
      cardBorder: 'border-[#E6DFBF]'
    },
    {
      id: '20-2222-004',
      name: 'Andrea Perote',
      role: 'Member',
      email: 'aperote.swu@phinmaed.com',
      initials: 'JM',
      avatarBg: 'bg-[#DC6803]',
      isYou: false,
      cardBg: 'bg-[#FDFBF3]',
      cardBorder: 'border-[#E6DFBF]'
    }
  ];

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'My Group'} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
      />

      {/* MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ACTION HEADER */}
        <header className="h-[90px] flex items-center justify-between px-6 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            
            <div>
              <h1 className="text-[20px] font-bold text-[#1A1A1A] leading-tight">My Group</h1>
            </div>
          </div>

          {/* Right Profile Actions */}
          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-transparent flex items-center justify-center hover:bg-black/5 transition-all">
              <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#CF3645] rounded-full ring-2 ring-[#FDF9ED]"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              {initials || 'JR'}
            </div>
          </div>
        </header>

        {/* SCROLLABLE ROUTE BODY */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
          <div className="max-w-[1200px] mx-auto animate-fade-in flex flex-col gap-6">
            
            <div>
              <h2 className="text-[28px] font-bold text-[#1A1A1A] font-serif tracking-tight mb-1">My Research Group</h2>
              <p className="text-[14px] text-gray-500 font-medium">Your team members and group information</p>
            </div>

            {/* GROUP DETAILS BANNER */}
            <div className="w-full bg-[#7B1F35] rounded-[24px] p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-[40%] bg-white/5 rounded-l-[100px] pointer-events-none" />
              <div className="relative z-10 text-white flex flex-col gap-4">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Group Name</span>
                  <h2 className="text-[32px] font-serif font-bold mt-1">Group HealthAI</h2>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Research Title</span>
                  <p className="text-[18px] font-semibold mt-1">ML-Based Health Monitor</p>
                </div>

                {/* Sub Metadata Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">👥 4 members</span>
                  <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">🎓 BSIT Program</span>
                  <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">📅 S.Y. 2026–2027</span>
                  <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1">🏢 College of IT</span>
                </div>
              </div>

              {/* Adviser Detail Box */}
              <div className="relative z-10 mt-6 md:mt-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 min-w-[250px]">
                <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase block mb-3">Your Adviser</span>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white text-[#7B1F35] flex items-center justify-center font-bold text-lg shadow-sm">
                    IP
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-[15px]">Prof. Ira Pongasi</h4>
                    <p className="text-white/70 text-[12px] mt-0.5">Research Adviser</p>
                  </div>
                </div>
              </div>
            </div>

            {/* TEAM LIST SECTION */}
            <div className="mt-2 bg-[#F3EADB] p-8 rounded-2xl shadow-sm">
              <h3 className="text-[22px] font-serif font-bold text-[#1A1A1A] mb-1">Team Members</h3>
              <p className="text-[14px] text-gray-500 mb-6">4 members in this research group</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {teamMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className={`${member.cardBg} border ${member.cardBorder} rounded-2xl p-6 flex items-start gap-4 transition-transform hover:-translate-y-0.5 duration-200`}
                  >
                    {/* Member Initials Badge */}
                    <div className={`w-14 h-14 rounded-full ${member.avatarBg} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm`}>
                      {member.initials}
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-[16px] font-bold text-[#1A1A1A] truncate">{member.name}</h4>
                        {member.isYou && (
                          <span className="bg-[#7B1F35] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">YOU</span>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${member.isYou ? 'bg-[#7B1F35]/10 text-[#7B1F35]' : 'bg-[#E8DFCB] text-gray-600'}`}>
                          {member.role}
                        </span>
                      </div>
                      
                      <div className="text-[13px] text-gray-500 flex flex-col gap-1.5 mt-3 font-medium">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5" /></svg>
                          {member.id}
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}