import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function ManuscriptPage({ onLogout, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Manuscript'} 
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
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">Manuscript</h1>
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
            
            {/* BANNER */}
            <div className="w-full bg-[#7B1F35] rounded-2xl p-8 flex items-center justify-between relative overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 h-full w-[30%] bg-white/5 rounded-l-[100px] pointer-events-none transform -skew-x-12" />
              <div className="relative z-10">
                <h2 className="text-white text-[24px] font-serif font-bold mb-1">Your Research Manuscript</h2>
                <p className="text-white/80 text-[14px]">Manage your research paper. Replace or update as your adviser provides feedback.</p>
              </div>
              <div className="relative z-10">
                <span className="bg-white text-[#1A1A1A] text-[13px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Uploaded
                </span>
              </div>
            </div>

            {/* TWO COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: Current File */}
              <div className="lg:col-span-5 bg-[#F3EADB] rounded-2xl p-8 shadow-sm flex flex-col">
                <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-6">Current File</p>
                
                {/* PDF Thumbnail Mockup */}
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-lg p-6 flex flex-col items-center text-center mb-6 shadow-sm relative">
                  <div className="w-full bg-[#7B1F35] rounded-t-lg absolute top-0 left-0 h-12 flex items-center justify-center">
                    <p className="text-white/80 text-[8px] tracking-widest uppercase">Southwestern University</p>
                  </div>
                  <div className="mt-12 w-full">
                    <h4 className="font-serif font-bold text-[#7B1F35] text-[16px] mb-2 leading-tight">ML-BASED<br/>HEALTH MONITOR</h4>
                    <p className="text-gray-400 text-[10px] mb-1">A Capstone Research</p>
                    <p className="text-[#CF3645] text-[11px] font-bold mb-6">Group HealthAI</p>
                    {/* Mock text lines */}
                    <div className="flex flex-col gap-1.5 w-[80%] mx-auto mb-4">
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-full"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[90%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[95%] mx-auto"></div>
                      <div className="h-1 bg-[#E8DFCB] rounded-full w-[85%] mx-auto"></div>
                    </div>
                    <p className="text-gray-400 text-[8px]">Page 1 of 38</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold text-[#1A1A1A] text-[16px]">manuscript_v2.0.pdf</h3>
                  <p className="text-gray-500 text-[13px]">2.4 MB · 38 pages · Updated Feb 5, 2027</p>
                </div>

                <div className="flex gap-3 mb-4">
                  <button className="flex-1 border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Preview
                  </button>
                  <button className="flex-1 border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[13px] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                </div>
                
                <button className="w-full bg-[#7B1F35] hover:bg-[#63182a] text-white text-[14px] font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Replace Manuscript
                </button>
              </div>

              {/* RIGHT COLUMN: Research Details */}
              <div className="lg:col-span-7 bg-[#F3EADB] rounded-2xl p-8 shadow-sm flex flex-col">
                <div className="flex justify-between items-start border-b border-[#E8DFCB] pb-4 mb-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Research Details</p>
                    <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A]">Manuscript Information</h3>
                  </div>
                  <button className="border border-[#D6CBB8] hover:bg-black/5 text-[#1A1A1A] text-[12px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Research Title</p>
                  <h4 className="font-serif font-bold text-[18px] text-[#1A1A1A]">ML-Based Health Monitor</h4>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Abstract</p>
                  <p className="text-gray-600 text-[14px] leading-relaxed">
                    This research presents an ML-based system for early detection of health anomalies using wearable sensor data, analyzing heart rate, blood pressure, and activity patterns to predict potential health risks with 89% accuracy.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Authors</p>
                    <p className="text-[#1A1A1A] font-bold text-[14px]">4 group members</p>
                    <p className="text-gray-500 text-[12px] mt-0.5">J. Zamoras · A. Perote · H. Tejada · P. Vender</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Pages</p>
                    <p className="text-[#1A1A1A] font-bold text-[14px]">38 pages</p>
                    <p className="text-gray-500 text-[12px] mt-0.5">Including references & appendices</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {['Machine Learning', 'Health Monitoring', 'IoT', 'Wearable Tech', 'Predictive Analytics'].map((tag) => (
                      <span key={tag} className="border border-[#DDA3B6] text-[#7B1F35] bg-[#F9EBF0] px-3 py-1 rounded-full text-[12px] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* VERSION HISTORY */}
            <div className="bg-[#F3EADB] rounded-2xl p-8 shadow-sm">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Version History</p>
                  <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A]">Previous Uploads</h3>
                </div>
                <p className="text-gray-500 text-[13px]">Older versions are kept for adviser reference</p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Version 2.0 (Current) */}
                <div className="bg-[#F4DEE5] border border-[#EAD0D8] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="bg-[#7B1F35] text-white text-[12px] font-bold px-3 py-1 rounded-full">v2.0</span>
                    <span className="text-[#7B1F35] font-bold text-[13px] flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#7B1F35] rounded-full"></span>
                      Current
                    </span>
                    <span className="text-gray-600 text-[13px] w-24">Feb 5, 2027</span>
                    <span className="text-gray-500 text-[13px] w-16">2.4 MB</span>
                    <span className="text-gray-600 text-[13px]">Added methodology chapter & references</span>
                  </div>
                  <span className="text-gray-500 text-[12px] font-bold">In use</span>
                </div>

                {/* Version 1.5 */}
                <div className="bg-transparent border border-[#E8DFCB] rounded-xl p-4 flex items-center justify-between hover:bg-black/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="bg-[#E8DFCB] text-[#1A1A1A] text-[12px] font-bold px-3 py-1 rounded-full">v1.5</span>
                    <span className="w-[72px]"></span> {/* Spacer to align */}
                    <span className="text-gray-600 text-[13px] w-24">Jan 28, 2027</span>
                    <span className="text-gray-500 text-[13px] w-16">2.1 MB</span>
                    <span className="text-gray-600 text-[13px]">Updated abstract per adviser feedback</span>
                  </div>
                  <button className="text-[#7B1F35] font-bold text-[12px] flex items-center gap-1 hover:underline">
                    Download
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                </div>

                {/* Version 1.0 */}
                <div className="bg-transparent border border-[#E8DFCB] rounded-xl p-4 flex items-center justify-between hover:bg-black/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="bg-[#E8DFCB] text-[#1A1A1A] text-[12px] font-bold px-3 py-1 rounded-full">v1.0</span>
                    <span className="w-[72px]"></span> {/* Spacer to align */}
                    <span className="text-gray-600 text-[13px] w-24">Jan 14, 2027</span>
                    <span className="text-gray-500 text-[13px] w-16">1.8 MB</span>
                    <span className="text-gray-600 text-[13px]">Initial draft</span>
                  </div>
                  <button className="text-[#7B1F35] font-bold text-[12px] flex items-center gap-1 hover:underline">
                    Download
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}