import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function StudentDashboard({ onLogout, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Dashboard'} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-[90px] flex items-center justify-between px-8 z-10 shrink-0">
          
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-black/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">Dashboard</h1>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-transparent flex items-center justify-center hover:bg-black/5 transition-all">
              <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Notification Dot */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#CF3645] rounded-full ring-2 ring-[#FDF9ED]"></span>
            </button>
            
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              JR
            </div>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          
          <div className="max-w-[1200px] mx-auto animate-fade-in flex flex-col gap-6 pt-2">
            
            {/* WELCOME BANNER */}
            <div className="w-full bg-[#7B1F35] rounded-2xl flex flex-col relative overflow-hidden shadow-sm">
              {/* Decorative Overlay for Banner */}
              <div className="absolute top-0 right-0 h-full w-[40%] bg-white/5 rounded-l-[100px] pointer-events-none" />
              <div className="absolute -top-10 right-20 h-[150%] w-[20%] bg-white/5 rounded-full pointer-events-none transform rotate-12" />

              <div className="p-8 flex justify-between items-start relative z-10">
                <div>
                  <h2 className="text-white text-[32px] font-serif font-bold mb-1 flex items-center gap-3">
                    Hi, Hylla <span className="text-2xl">👋</span>
                  </h2>
                  <p className="text-white/80 text-[15px]">
                    Welcome back to your research portal
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-white/60 text-[10px] tracking-[0.2em] font-bold uppercase mb-1">Your Group</p>
                  <h3 className="text-white font-serif text-[22px] font-bold leading-tight">Group HealthAI</h3>
                  <p className="text-white/80 text-[13px] mt-1">Adviser: Prof. Ira Pongasi</p>
                </div>
              </div>

              <div className="w-full border-t border-white/10 px-8 py-4 relative z-10">
                <p className="text-white/80 text-[14px]">
                  Your submission is <span className="text-white font-bold">In Progress · Step 2 of 5</span>
                </p>
              </div>
            </div>

            {/* WHAT'S NEXT CARD */}
            <div className="bg-[#F3EADB] rounded-xl flex items-center p-6 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C73D4C]" />
              
              <div className="flex items-center gap-6 w-full">
                <div className="w-[60px] h-[60px] bg-[#F4DEE5] rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 text-[#A88C83]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[#D05353] tracking-widest uppercase mb-1">What's Next</p>
                  <h3 className="font-serif text-[22px] font-bold text-[#1A1A1A]">Upload your missing documents</h3>
                  <p className="text-gray-600 text-[14px] mt-0.5">
                    You're missing 2 documents — Signature Page and Video Pitch.
                  </p>
                </div>

                <button className="bg-[#7B1F35] text-white px-6 py-3 rounded-full text-[14px] font-bold flex items-center gap-2 hover:bg-[#63182a] transition-colors shrink-0 shadow-sm">
                  Upload Documents
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>

            {/* YOUR PROGRESS CARD */}
            <div className="bg-[#F3EADB] rounded-xl p-8 shadow-sm">
              <div className="flex justify-between items-end mb-8">
                <h3 className="font-serif text-[22px] font-bold text-[#1A1A1A]">Your Progress</h3>
                <span className="text-[#7B1F35] font-bold text-[14px]">67% complete</span>
              </div>

              <div className="relative pt-2 pb-6 px-4">
                {/* Background Track Line */}
                <div className="absolute top-5 left-0 w-full h-3 bg-[#E8DFCB] rounded-full" />
                {/* Active Track Line */}
                <div className="absolute top-5 left-0 w-[50%] h-3 bg-[#7B1F35] rounded-full" />

                <div className="relative flex justify-between z-10 text-[12px] font-bold">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-3 -ml-4 w-20">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#7B1F35] text-white ring-[6px] ring-[#F3EADB] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[#1A1A1A]">Account</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-3 w-20">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#7B1F35] text-white ring-[6px] ring-[#F3EADB] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[#1A1A1A]">Manuscript</span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-3 w-20">
                    <div className="w-[34px] h-[34px] rounded-full bg-white border-[5px] border-[#7B1F35] ring-[6px] ring-[#F3EADB] flex items-center justify-center"></div>
                    <span className="text-[#1A1A1A]">Documents</span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex flex-col items-center gap-3 w-20">
                    <div className="w-[34px] h-[34px] rounded-full bg-white border-[5px] border-[#E8DFCB] ring-[6px] ring-[#F3EADB] flex items-center justify-center"></div>
                    <span className="text-gray-400 font-medium">Review</span>
                  </div>

                  {/* Step 5 */}
                  <div className="flex flex-col items-center gap-3 -mr-4 w-20">
                    <div className="w-[34px] h-[34px] rounded-full bg-white border-[5px] border-[#E8DFCB] ring-[6px] ring-[#F3EADB] flex items-center justify-center"></div>
                    <span className="text-gray-400 font-medium">Published</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM GRID CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Manuscript Card */}
              <div className="bg-[#F3EADB] rounded-xl flex flex-col shadow-sm">
                <div className="bg-[#F4DEE5] px-6 py-4 rounded-t-xl flex justify-between items-center border-b border-[#EAD0D8]">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h4 className="font-serif text-[18px] font-bold text-[#1A1A1A]">Manuscript</h4>
                  </div>
                  <span className="bg-[#7B1F35] text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    ✓ Uploaded
                  </span>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h5 className="text-[#1A1A1A] font-bold text-[16px] mb-1">ML-Based Health Monitor</h5>
                  <p className="text-gray-500 text-[13px] mb-8">Version 2.0 · 38 pages · Uploaded Feb 5</p>
                  
                  <div className="mt-auto flex items-center gap-3">
                    <button className="border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors">
                      Edit
                    </button>
                    <button className="bg-[#7B1F35] hover:bg-[#63182a] text-white text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm">
                      View Manuscript
                    </button>
                  </div>
                </div>
              </div>

              {/* Documents Card */}
              <div className="bg-[#F3EADB] rounded-xl flex flex-col shadow-sm">
                <div className="bg-[#F4DEE5] px-6 py-4 rounded-t-xl flex justify-between items-center border-b border-[#EAD0D8]">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h4 className="font-serif text-[18px] font-bold text-[#1A1A1A]">Documents</h4>
                  </div>
                  <span className="bg-[#CF3645] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                    2 Missing
                  </span>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="font-serif text-[28px] font-bold text-[#7B1F35]">4</span>
                    <span className="font-serif text-[20px] text-gray-400">/ 6</span>
                    <span className="text-[13px] text-gray-600 ml-1">documents submitted</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    <span className="bg-[#F4DEE5] border border-[#F4DEE5] text-[#CF3645] px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Signature Page
                    </span>
                    <span className="bg-[#F4DEE5] border border-[#F4DEE5] text-[#CF3645] px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Video Pitch
                    </span>
                  </div>
                  
                  <div className="mt-auto flex items-center gap-3">
                    <button className="border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors">
                      View All
                    </button>
                    <button className="bg-[#CF3645] hover:bg-[#A92A36] text-white text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm">
                      Upload Missing
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}