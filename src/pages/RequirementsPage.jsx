import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function RequirementsPage({ onLogout, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activeTab={activeTab || 'Requirements'} 
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
            <h1 className="text-[20px] font-bold text-[#1A1A1A]">Requirements</h1>
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
              <h2 className="font-serif font-bold text-[28px] text-[#1A1A1A] mb-1">Supporting Documents</h2>
              <p className="text-gray-500 text-[14px]">Submit all required documents for your research</p>
            </div>

            {/* PROGRESS BAR CARD */}
            <div className="w-full bg-[#F3EADB] rounded-2xl p-6 flex items-center justify-between shadow-sm border border-[#E8DFCB]/50">
              <div className="w-48">
                <h3 className="text-[22px] font-serif font-bold text-[#7B1F35]">4 of 6</h3>
                <p className="text-[13px] text-gray-500">documents submitted</p>
              </div>
              
              <div className="flex-1 px-8">
                <div className="w-full bg-[#E8DFCB] h-3 rounded-full overflow-hidden mb-2">
                  <div className="bg-[#7B1F35] h-full rounded-full w-[67%]"></div>
                </div>
                <p className="text-[12px] font-bold text-[#7B1F35]">67% complete</p>
              </div>

              <div className="w-48 flex justify-end">
                <span className="bg-[#FCE8EB] text-[#CF3645] text-[13px] font-bold px-4 py-2 rounded-full flex items-center gap-2 border border-[#F5C2C7]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  2 missing items
                </span>
              </div>
            </div>

            {/* DOCUMENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* CARD 1: Final Manuscript (Submitted) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">📄</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Final Manuscript</h4>
                    <span className="text-[9px] font-bold text-[#7B1F35] tracking-widest uppercase bg-[#F4DEE5] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Complete approved research paper (PDF)</p>
                
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <div>
                      <p className="text-[13px] font-bold text-[#1A1A1A] truncate">manuscript_v2.0.pdf</p>
                      <p className="text-[11px] text-gray-500">2.4 MB · Feb 5, 2027</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E8E3E]">
                    <span className="w-2 h-2 bg-[#1E8E3E] rounded-full"></span> Submitted
                  </span>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-[#7B1F35]">
                    <button className="hover:underline">Replace</button>
                    <span className="text-gray-300">·</span>
                    <button className="hover:underline">Delete</button>
                  </div>
                </div>
              </div>

              {/* CARD 2: Approval Sheet (Submitted) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">📑</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Approval Sheet</h4>
                    <span className="text-[9px] font-bold text-[#7B1F35] tracking-widest uppercase bg-[#F4DEE5] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Signed by adviser, dean, and panel</p>
                
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <div>
                      <p className="text-[13px] font-bold text-[#1A1A1A] truncate">approval_signed.pdf</p>
                      <p className="text-[11px] text-gray-500">850 KB · Feb 4, 2027</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E8E3E]">
                    <span className="w-2 h-2 bg-[#1E8E3E] rounded-full"></span> Submitted
                  </span>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-[#7B1F35]">
                    <button className="hover:underline">Replace</button>
                    <span className="text-gray-300">·</span>
                    <button className="hover:underline">Delete</button>
                  </div>
                </div>
              </div>

              {/* CARD 3: Dataset Files (Submitted) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">💾</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Dataset Files</h4>
                    <span className="text-[9px] font-bold text-[#7B1F35] tracking-widest uppercase bg-[#F4DEE5] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Raw datasets used in study (ZIP)</p>
                
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <div>
                      <p className="text-[13px] font-bold text-[#1A1A1A] truncate">datasets.zip</p>
                      <p className="text-[11px] text-gray-500">18.2 MB · Feb 3, 2027</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E8E3E]">
                    <span className="w-2 h-2 bg-[#1E8E3E] rounded-full"></span> Submitted
                  </span>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-[#7B1F35]">
                    <button className="hover:underline">Replace</button>
                    <span className="text-gray-300">·</span>
                    <button className="hover:underline">Delete</button>
                  </div>
                </div>
              </div>

              {/* CARD 4: Upload URL (Submitted) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">🔗</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Upload URL</h4>
                    <span className="text-[9px] font-bold text-[#7B1F35] tracking-widest uppercase bg-[#F4DEE5] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Source code or publication URL</p>
                
                <div className="bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    <div>
                      <p className="text-[13px] font-bold text-[#1A1A1A] truncate">github.com/healthai/monitor</p>
                      <p className="text-[11px] text-gray-500">Link · Feb 5, 2027</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E8E3E]">
                    <span className="w-2 h-2 bg-[#1E8E3E] rounded-full"></span> Submitted
                  </span>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-[#7B1F35]">
                    <button className="hover:underline">Replace</button>
                    <span className="text-gray-300">·</span>
                    <button className="hover:underline">Delete</button>
                  </div>
                </div>
              </div>

              {/* CARD 5: Signature Page (Missing) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#CF3645] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">✍️</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Signature Page</h4>
                    <span className="text-[9px] font-bold text-[#CF3645] tracking-widest uppercase bg-[#FCE8EB] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Original signed page from approval committee</p>
                
                <div className="border-2 border-dashed border-[#CF3645]/40 bg-[#FCE8EB]/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FCE8EB]/50 transition-colors mt-auto">
                  <div className="w-8 h-8 bg-[#8C9BB4] rounded text-white flex items-center justify-center mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <p className="text-[#CF3645] font-bold text-[13px]">Drop file here or browse</p>
                  <p className="text-[#CF3645]/60 text-[11px] mt-1">PDF · max 10MB</p>
                </div>
              </div>

              {/* CARD 6: Video Pitch (Missing) */}
              <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#CF3645] flex flex-col h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xl">🎥</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A] text-[15px]">Video Pitch</h4>
                    <span className="text-[9px] font-bold text-[#CF3645] tracking-widest uppercase bg-[#FCE8EB] px-2 py-0.5 rounded">Required</span>
                  </div>
                </div>
                <p className="text-gray-600 text-[13px] mb-6 flex-1">Brief 3-5 min video presentation of findings</p>
                
                <div className="border-2 border-dashed border-[#CF3645]/40 bg-[#FCE8EB]/30 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FCE8EB]/50 transition-colors mt-auto">
                  <div className="w-8 h-8 bg-[#8C9BB4] rounded text-white flex items-center justify-center mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <p className="text-[#CF3645] font-bold text-[13px]">Drop file here or browse</p>
                  <p className="text-[#CF3645]/60 text-[11px] mt-1">PDF · max 10MB</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}