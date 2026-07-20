import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function ProgressPage({ onLogout, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Progress'} 
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
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">Progress</h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-transparent flex items-center justify-center hover:bg-black/5 transition-all">
              <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#CF3645] rounded-full ring-2 ring-[#FDF9ED]"></span>
            </button>
            
            <div className="w-10 h-10 rounded-full bg-[#7B1F35] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              JR
            </div>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto animate-fade-in flex flex-col gap-6 pt-2">
            
            {/* PAGE TITLE */}
            <div>
              <h2 className="font-serif font-bold text-[28px] text-[#1A1A1A] mb-1">Submission Progress</h2>
              <p className="text-gray-500 text-[14px]">Track your research from upload to publication</p>
            </div>

            {/* STATUS BANNER */}
            <div className="w-full bg-[#7B1F35] rounded-[20px] p-8 flex items-center justify-between shadow-md relative overflow-hidden text-white">
              <div className="relative z-10">
                <p className="text-[11px] font-bold tracking-widest text-white/70 uppercase mb-2">Overall Status</p>
                <h3 className="text-[32px] font-serif font-bold mb-1">In Progress — Step 2 of 5</h3>
                <p className="text-white/80 text-[14px]">Adviser is reviewing your manuscript. Next: forward to Dean.</p>
              </div>
              
              <div className="relative z-10 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/20" />
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="2" fill="transparent" strokeDasharray="264" strokeDashoffset="87" className="text-white drop-shadow-md" />
                </svg>
                <span className="absolute text-[22px] font-serif font-bold">67%</span>
              </div>
              
              {/* Decorative background overlay */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/10 to-transparent"></div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: TIMELINE (Spans 2 columns) */}
              <div className="lg:col-span-2 bg-[#F3EADB] rounded-2xl p-8 shadow-sm">
                <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Full Timeline</p>
                <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A] mb-8">Your Research Journey</h3>
                
                <div className="relative pl-2">
                  {/* Vertical Connecting Line */}
                  <div className="absolute left-[23px] top-6 bottom-12 w-[2px] bg-[#D8CEB9]"></div>

                  {/* Step 1: Account Approved (Done) */}
                  <div className="relative flex gap-5 mb-5 z-10 group">
                    <div className="w-8 h-8 rounded-full bg-[#7B1F35] text-white flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1 bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between shadow-sm transition-all hover:shadow-md">
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Account Approved</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">Prof. Ira Pongasi (Adviser) · Aug 15, 2026 · 10:24 AM</p>
                        <p className="text-[13px] text-gray-600 italic">Welcome to ARCHIVIO! You can now upload your research.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E8E3E] px-3 py-1 rounded-full text-[12px] font-bold border border-[#C6E5D0]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Done
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Manuscript Uploaded (Done) */}
                  <div className="relative flex gap-5 mb-5 z-10 group">
                    <div className="w-8 h-8 rounded-full bg-[#7B1F35] text-white flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between shadow-sm transition-all hover:shadow-md">
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Manuscript Uploaded</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">You · v2.0 · Feb 5, 2027 · 9:14 AM</p>
                        <p className="text-[13px] text-gray-600 italic">ML-Based Health Monitor (38 pages, 2.4 MB) uploaded.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E8E3E] px-3 py-1 rounded-full text-[12px] font-bold border border-[#C6E5D0]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Done
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Supporting Documents (In Progress - ACTIVE) */}
                  <div className="relative flex gap-5 mb-5 z-10 group">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#7B1F35] text-[#7B1F35] flex items-center justify-center shrink-0 ring-[6px] ring-[#F3EADB] mt-4 z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B1F35]"></div>
                    </div>
                    <div className="flex-1 bg-[#FDF5F6] border border-[#E5B5BC] rounded-xl p-5 flex items-start justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#7B1F35]"></div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Supporting Documents</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">4 of 6 submitted · Last updated Feb 5, 2027</p>
                        <p className="text-[13px] text-[#7B1F35] italic font-medium">Signature Page and Video Pitch are still pending.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-[#7B1F35]/10 text-[#7B1F35] px-3 py-1 rounded-full text-[12px] font-bold border border-[#7B1F35]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35]"></span> In Progress
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Adviser Review (Pending) */}
                  <div className="relative flex gap-5 mb-5 z-10 opacity-70">
                    <div className="w-8 h-8 rounded-full bg-[#E8DFCB] text-gray-400 flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
                      <span className="text-[10px] font-bold">4</span>
                    </div>
                    <div className="flex-1 bg-[#FCF9F2]/60 border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Adviser Review</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">Prof. Ira Pongasi · Awaiting documents</p>
                        <p className="text-[13px] text-gray-500 italic">Your adviser will review once all documents are submitted.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[12px] font-bold border border-gray-200">
                        Pending
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Forwarded to Dean (Pending) */}
                  <div className="relative flex gap-5 mb-5 z-10 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-[#E8DFCB] text-gray-400 flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
                      <span className="text-[10px] font-bold">5</span>
                    </div>
                    <div className="flex-1 bg-[#FCF9F2]/60 border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Forwarded to Dean</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">Dr. Desiree Cendana · Pending</p>
                        <p className="text-[13px] text-gray-500 italic">After adviser approval, Dean reviews for final publication.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[12px] font-bold border border-gray-200">
                        Pending
                      </span>
                    </div>
                  </div>

                  {/* Step 6: Published (Pending) */}
                  <div className="relative flex gap-5 z-10 opacity-50">
                    <div className="w-8 h-8 rounded-full bg-[#E8DFCB] text-gray-400 flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
                      <span className="text-[10px] font-bold">6</span>
                    </div>
                    <div className="flex-1 bg-[#FCF9F2]/60 border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">Published in Archive</h4>
                        <p className="text-[12px] text-gray-500 mt-1 mb-2">Public Access · Pending</p>
                        <p className="text-[13px] text-gray-500 italic">Your research will be searchable by anyone with internet.</p>
                      </div>
                      <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[12px] font-bold border border-gray-200">
                        Pending
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT COLUMN: ACTION & INFO CARDS */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Action Needed Card */}
                <div className="bg-[#FCF9F2] rounded-2xl p-6 shadow-sm border-t-4 border-[#CF3645] border-l border-r border-b border-[#E8DFCB]">
                  <p className="text-[10px] font-bold text-[#CF3645] tracking-widest uppercase mb-1">Action Needed</p>
                  <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-2">Complete your documents</h3>
                  <p className="text-[13px] text-gray-600 mb-6">Upload Signature Page and Video Pitch to move to adviser review.</p>
                  <button 
                    onClick={() => setActiveTab('Requirements')}
                    className="w-full bg-[#CF3645] hover:bg-[#B02A38] text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Upload Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>

                {/* Adviser Card */}
                <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border border-[#E8DFCB]/50">
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-4">Your Adviser</p>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#7B1F35] rounded-full text-white font-bold text-xl flex items-center justify-center shrink-0">
                      IP
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-[15px]">Prof. Ira Pongasi</h4>
                      <p className="text-[12px] text-gray-500 mb-0.5">Research Adviser</p>
                      <p className="text-[12px] text-gray-500 hover:text-[#7B1F35] cursor-pointer transition-colors truncate">ira.pongasi@swu.phinma.edu</p>
                    </div>
                  </div>
                  <button className="w-full bg-[#7B1F35] hover:bg-[#5D1627] text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Send Message
                  </button>
                </div>

                {/* Helpful Tips Card */}
                <div className="bg-[#FCF9F2] rounded-2xl p-6 shadow-sm border border-[#E8DFCB]/50">
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Helpful Tips</p>
                  <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-5">Did you know?</h3>
                  
                  <ul className="flex flex-col gap-4">
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">⏱️</span>
                      <p className="text-[13px] text-gray-600 leading-snug">Average review takes 5–7 days after all docs are submitted.</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">📝</span>
                      <p className="text-[13px] text-gray-600 leading-snug">You can update your manuscript anytime before adviser review starts.</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">💬</span>
                      <p className="text-[13px] text-gray-600 leading-snug">Adviser feedback will appear in your dashboard notifications.</p>
                    </li>
                  </ul>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}