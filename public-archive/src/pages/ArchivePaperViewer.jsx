import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function ArchivePaperViewer() {
  // State para ma-track kung unsa nga tab ang gi-click ('toc', 'pages', 'cite')
  const [activeTab, setActiveTab] = useState('toc');
  const [isAiOpen, setIsAiOpen] = useState(true);
  
  // State para sa Fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Function para ma-handle ang pag-click sa mga sidebar tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsFullscreen(false); // Kung mo-click og tab, i-off ang fullscreen para makita ang sidebar
  };

  // Function para sa Fullscreen button
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsAiOpen(false); // I-hide ang AI panel inig fullscreen
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#e5e5e5] font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-[#5a1528] text-white flex justify-between items-center px-6 py-3 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#5a1528] font-bold text-xs">A</div>
          <span className="font-serif font-bold tracking-widest text-lg">ARCHIVIO</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-[#d6ad60] transition cursor-pointer">Home</Link>
          <Link to="/browse" className="hover:text-[#d6ad60] transition cursor-pointer">Browse</Link>
          <Link to="/bookmarks" className="hover:text-[#d6ad60] transition cursor-pointer">Bookmarks</Link>
          <Link to="/about" className="hover:text-[#d6ad60] transition cursor-pointer">About</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-[#d6ad60] rounded-full"></div>
          <span className="hidden md:block">Juan M. ▾</span>
        </div>
      </header>

      {/* VIEW-ONLY BANNER */}
      <div className="bg-white border-b border-stone-300 px-4 py-2 flex items-center gap-4 text-xs text-stone-700 z-10 shadow-sm">
        <Link to="/browse" className="text-[#5a1528] font-bold text-lg hover:bg-stone-100 px-2 rounded transition cursor-pointer">←</Link>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
          <span className="font-bold text-stone-900">View-only access</span> 
          <span className="text-stone-500">—copying and downloading are disabled. This document is protected for academic integrity.</span>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* THIN LEFT NAVIGATION (ICONS) */}
        <div className="w-14 md:w-16 bg-[#fcfbf7] border-r border-stone-300 flex flex-col items-center py-4 gap-4 flex-shrink-0 z-10">
          
          <button 
            onClick={() => handleTabClick('toc')}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'toc' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Table of Content"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          
          <button 
            onClick={() => handleTabClick('pages')}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'pages' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`}
            title="Pages"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </button>
          
          <div className="w-8 border-b border-stone-200 my-2"></div>
          
          {/* FULLSCREEN BUTTON */}
          <button 
            onClick={toggleFullscreen}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`} 
            title="Fullscreen"
          >
            ⛶
          </button>
          
          <button className="w-10 h-10 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 transition cursor-pointer" title="Bookmark">🔖</button>
          <button className="w-10 h-10 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 transition cursor-pointer" title="Like">👍</button>
          
          {/* CITATION BUTTON */}
          <button 
            onClick={() => handleTabClick('cite')}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'cite' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`} 
            title="Cite"
          >
            ❞
          </button>
        </div>

        {/* EXPANDABLE SIDEBAR PANEL (Ma-hide kon isFullscreen == true) */}
        {!isFullscreen && (
          <div className="w-64 bg-[#fcfbf7] border-r border-stone-300 flex flex-col flex-shrink-0 overflow-y-auto z-10">
            
            {/* TOC TAB */}
            {activeTab === 'toc' && (
              <div className="p-4 flex flex-col h-full">
                <h2 className="font-serif font-bold text-lg text-stone-800 mb-6 border-b border-stone-200 pb-2">Table of Content</h2>
                <div className="flex flex-col gap-2 flex-1">
                  {['Chapter 1: Introduction', 'Chapter 2: Review of Literature', 'Chapter 3: Methodology', 'Chapter 4: Results & Discussion', 'Chapter 5: Conclusion'].map((chap, idx) => (
                    <button key={idx} className="text-left px-4 py-3 text-xs font-medium bg-[#7a2039] text-white rounded shadow-sm hover:bg-[#5a1528] transition cursor-pointer flex items-center gap-2">
                      <span className="text-[10px]">›</span> {chap}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PAGES TAB */}
            {activeTab === 'pages' && (
              <div className="p-4 flex flex-col h-full bg-[#f4f1ea]">
                <h2 className="font-serif font-bold text-lg text-stone-800 mb-6 border-b border-stone-200 pb-2">Pages</h2>
                <div className="flex flex-col gap-6 items-center">
                  <div className="w-48 bg-white shadow-md border-2 border-[#7a2039] rounded cursor-pointer overflow-hidden flex flex-col pb-2">
                    <div className="h-48 p-4 flex flex-col gap-3">
                      <div className="h-1 bg-stone-200 w-3/4 rounded"></div>
                      <div className="h-1 bg-stone-200 w-full rounded"></div>
                      <div className="h-1 bg-stone-200 w-5/6 rounded"></div>
                      <div className="h-1 bg-stone-200 w-full rounded"></div>
                      <div className="h-1 bg-stone-200 w-2/3 rounded"></div>
                    </div>
                    <div className="text-center text-[10px] text-stone-500 bg-stone-100 py-1">Page 1</div>
                  </div>
                  {/* Lain pang mga dummy pages */}
                  <div className="w-48 bg-white shadow-sm border border-stone-200 hover:shadow-md transition rounded cursor-pointer overflow-hidden flex flex-col pb-2">
                    <div className="h-48 p-4 flex flex-col gap-3">
                      <div className="h-1 bg-stone-200 w-full rounded"></div>
                      <div className="h-1 bg-stone-200 w-5/6 rounded"></div>
                    </div>
                    <div className="text-center text-[10px] text-stone-500 bg-stone-50 py-1 border-t border-stone-100">Page 2</div>
                  </div>
                </div>
              </div>
            )}

            {/* CITATION TAB (Bag-o) */}
            {activeTab === 'cite' && (
              <div className="p-4 flex flex-col h-full bg-[#f4f1ea]">
                <h2 className="font-serif font-bold text-lg text-stone-800 mb-6 border-b border-stone-200 pb-2">Citation Formats</h2>
                <div className="flex flex-col gap-4">
                  
                  {/* APA Card */}
                  <div className="bg-white border border-stone-200 rounded p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-stone-800">APA 7th Edition</h3>
                      <button className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition flex items-center gap-1 cursor-pointer">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7v11a2 2 0 002 2h9a2 2 0 002-2V7a2 2 0 00-2-2h-9a2 2 0 00-2 2z"></path><path d="M16 5V4a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h1"></path></svg>
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-serif">
                      Zamoras, J. M., et al. (2026). ARCHIVIO: A Web-Based Research Archive Management System. SWU PHINMA.
                    </p>
                  </div>

                  {/* MLA Card */}
                  <div className="bg-white border border-stone-200 rounded p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-stone-800">MLA 9th Edition</h3>
                      <button className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition flex items-center gap-1 cursor-pointer">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7v11a2 2 0 002 2h9a2 2 0 002-2V7a2 2 0 00-2-2h-9a2 2 0 00-2 2z"></path><path d="M16 5V4a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h1"></path></svg>
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-serif">
                      Zamoras, Juan M., et al. "ARCHIVIO: A Web-Based Research Archive Management System." SWU PHINMA Research Archive, 2026.
                    </p>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* CENTER DOCUMENT VIEWER */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-[#e5e5e5] relative">
          <div className="bg-white shadow-lg w-full max-w-3xl min-h-[1056px] p-12 md:p-16 flex flex-col relative select-none transition-all duration-300">
            {/* Paper Content */}
            <div className="text-center mb-10">
              <h1 className="font-serif text-xl font-bold text-stone-900 mb-4 leading-relaxed">
                ARCHIVIO: A Web-Based Research Archive Management System for SWU PHINMA
              </h1>
              <p className="text-sm text-stone-700 mb-2">Zamoras, J.M. • Perote, A.C • Tejada H.M • Vender P.J</p>
              <p className="text-xs text-stone-500 uppercase tracking-wide">SWU PHINMA • Computer Science • 2026 • Capstone Project</p>
            </div>

            <div className="border-t border-b border-stone-200 py-4 mb-8 text-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-800 mb-3">Abstract</h3>
              <p className="text-xs text-stone-600 leading-relaxed text-justify">
                This study developed ARCHIVIO, a web-based Research Archive Management System enabling faculty advisers, deans, and students to manage manuscripts through a structured digital workflow. Evaluation yielded a SUS score of 84.7 (Excellent), reducing processing time by 67%. <br/>
                <span className="italic mt-2 block">Keywords: Research Archive, Web-Based System, Document Management, Laravel, SWU PHINMA</span>
              </p>
            </div>

            <div className="space-y-6 text-sm text-stone-800 leading-relaxed text-justify font-serif">
              <div>
                <h2 className="font-bold text-base mb-2 font-serif">Chapter 1: Introduction</h2>
                <p>The management of academic research outputs presents significant logistical challenges. SWU PHINMA has relied on manual processes for submission, review, and archiving. This study proposes ARCHIVIO to digitize the entire research management lifecycle.</p>
              </div>
            </div>
          </div>

          {/* FLOATING AI BUTTON (Mogawas ra kon Fullscreen) */}
          {isFullscreen && !isAiOpen && (
            <button 
              onClick={() => {
                setIsFullscreen(false);
                setIsAiOpen(true);
              }}
              className="absolute bottom-8 right-8 w-12 h-12 bg-[#7a2039] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#5a1528] transition cursor-pointer text-xl"
              title="Open AI Assistant"
            >
              ✨
            </button>
          )}
        </div>

        {/* RIGHT AI ASSISTANT PANEL (Ma-hide kon isFullscreen == true unless i-click balik) */}
        {isAiOpen && !isFullscreen && (
          <div className="w-80 bg-[#fdfbf7] border-l border-stone-300 flex flex-col flex-shrink-0 z-10">
            {/* AI Header */}
            <div className="bg-[#4a1221] text-white p-4 flex justify-between items-center shadow-md relative z-10">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 bg-[#6b1c31] rounded-full flex items-center justify-center text-lg">🤖</div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Archivio AI Assistant</h3>
                  <p className="text-[10px] text-stone-300">Research summary generator</p>
                </div>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-xs transition cursor-pointer">✕</button>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#f8f6f0]">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-stone-300 rounded-full flex-shrink-0 mt-1"></div>
                <div className="bg-white border border-stone-200 p-3 rounded-lg rounded-tl-none text-xs text-stone-700 shadow-sm leading-relaxed">
                  Hello! I'm Archivio, your AI assistant. I can help you understand this research paper. How can I assist?
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-stone-200 bg-white">
              <div className="mb-3">
                <p className="text-[10px] text-stone-500 mb-2 font-medium">Suggested actions:</p>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-[#f5ebed] border border-[#e8d1d7] text-[#7a2039] rounded-full text-[10px] hover:bg-[#ebdce0] transition cursor-pointer">Summarize research</button>
                  <button className="px-3 py-1 bg-[#f5ebed] border border-[#e8d1d7] text-[#7a2039] rounded-full text-[10px] hover:bg-[#ebdce0] transition cursor-pointer">Explain methodology</button>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Ask about this research..." className="flex-1 border border-stone-300 rounded px-3 py-2 text-xs outline-none focus:border-[#7a2039] bg-stone-50" />
                <button className="bg-[#7a2039] text-white px-3 py-2 rounded text-xs hover:bg-[#5a1528] transition cursor-pointer">➤</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ArchivePaperViewer;