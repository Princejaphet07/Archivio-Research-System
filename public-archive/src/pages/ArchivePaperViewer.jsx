import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';

function ArchivePaperViewer() {
  const { id } = useParams();
  const { currentUser, signOut } = useAuth();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state
  const [activeTab, setActiveTab] = useState('toc');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // AI Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Anti-Screenshot & Print Protections
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('Screenshots disabled.');
        Swal.fire('Warning', 'Screenshots are disabled for academic integrity.', 'warning');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        Swal.fire('Warning', 'Printing is disabled for academic integrity.', 'warning');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };

    const handleBlur = () => {
      document.body.style.filter = 'blur(15px)';
      document.body.style.transition = 'filter 0.1s';
    };

    const handleFocus = () => {
      document.body.style.filter = 'none';
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.body.style.filter = 'none';
    };
  }, []);

  useEffect(() => {
    let unsubGroup = () => {};
    
    const unsubSub = onSnapshot(doc(db, 'submissions', id), async (docSnap) => {
      if (docSnap.exists()) {
        const subData = { id: docSnap.id, ...docSnap.data() };
        
        // Increment views if not viewed yet
        if (!localStorage.getItem(`viewed_${id}`)) {
          localStorage.setItem(`viewed_${id}`, 'true');
          const { updateDoc, increment } = await import('firebase/firestore');
          updateDoc(docSnap.ref, { views: (subData.views || 0) + 1 }).catch(e => console.log('View update failed:', e));
        }

        if (subData.studentUid) {
          const qGroup = query(collection(db, 'groups'), where('leaderUid', '==', subData.studentUid));
          unsubGroup = onSnapshot(qGroup, (groupSnap) => {
            let groupData = null;
            if (!groupSnap.empty) {
              groupData = groupSnap.docs[0].data();
            }
            setPaper({
              ...subData,
              researchTitle: groupData?.researchTitle || subData.researchTitle || subData.title,
              authorDisplay: groupData 
                ? `${groupData.leaderName}${groupData.members && groupData.members.length > 0 ? ` & ${groupData.members.length} other(s)` : ''}`
                : subData.studentName || subData.groupName || 'Unknown Author',
              program: groupData?.program || subData.program
            });
            setLoading(false);
          });
        } else {
          setPaper({
            ...subData,
            researchTitle: subData.researchTitle || subData.title,
            authorDisplay: subData.studentName || subData.groupName || 'Unknown Author',
            program: subData.program
          });
          setLoading(false);
        }
      } else {
        console.error("Paper not found");
        setError("Paper not found");
        setLoading(false);
      }
    }, (err) => {
      console.error('Error fetching paper:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubSub();
      unsubGroup();
    };
  }, [id]);

  // Initialize Chat when paper loads
  useEffect(() => {
    if (paper && chatHistory.length === 0) {
      setChatHistory([
        { role: 'model', content: `Hi! I'm reading **"${paper.researchTitle || 'Untitled Research'}"**. What would you like to know about it?` }
      ]);
    }
  }, [paper]);

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const paperContext = `
        You are the Archivio AI Assistant. You are answering questions about the following research paper:
        Title: ${paper.researchTitle}
        Abstract: ${paper.abstract}
        Authors: ${paper.authorDisplay}
        Year: ${new Date(paper.publishedAt || Date.now()).getFullYear()}
        Keywords: ${paper.keywords?.join(', ')}

        Answer the user's questions based primarily on this paper's metadata and the attached full manuscript PDF. Be helpful, concise, and academic.
      `;

      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paperContext,
          chatHistory: chatHistory.slice(1), // Exclude initial greeting to save tokens/payload size
          userMessage,
          pdfUrl: paper?.documents?.['Final Manuscript']?.url
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Backend server returned an invalid response. Did you forget to restart the email-service backend?");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setChatHistory(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err) {
      console.error("AI Error:", err);
      setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ **Error:** ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsFullscreen(false);
  };

  const handleChapterClick = (chap) => {
    const map = {
      'Chapter 1: Introduction': 1,
      'Chapter 2: Review of Literature': 5,
      'Chapter 3: Methodology': 10,
      'Chapter 4: Results & Discussion': 15,
      'Chapter 5: Conclusion': 20
    };
    if (map[chap]) {
      setCurrentPage(map[chap]);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      Swal.fire('Login Required', 'Please log in to like a research paper.', 'info');
      return;
    }
    const paperRef = doc(db, 'submissions', paper.id);
    const likes = paper.likes || [];
    if (likes.includes(currentUser.uid)) {
      await updateDoc(paperRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(paperRef, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) setIsAiOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#e5e5e5] dark:bg-gray-900 transition-colors">
        <div className="w-12 h-12 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-[#7a1f3d] dark:text-[#f3e5ab] tracking-widest uppercase">Loading Document...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#e5e5e5] dark:bg-gray-900 transition-colors">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-gray-100 mb-4">Document Not Found</h1>
        <Link to="/browse" className="px-6 py-2 bg-[#7a2039] text-white rounded">Back to Browse</Link>
      </div>
    );
  }

  const title = paper.researchTitle || 'Untitled Research';
  const authorName = paper.authorDisplay;
  const adviser = paper.adviserName || 'Unknown Adviser';
  const year = new Date(paper.publishedAt || Date.now()).getFullYear();

  return (
    <div className="h-screen flex flex-col bg-[#e5e5e5] dark:bg-gray-900 font-sans overflow-hidden transition-colors">
      
      {/* HEADER */}
      <header className="bg-[#5a1528] text-white flex justify-between items-center px-6 py-3 shadow-md z-20">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
          <img src={logo} alt="Archivio Logo" className="w-9 h-9 object-contain bg-white rounded-full p-1 shadow-sm" />
          <span className="font-serif font-bold tracking-widest text-lg text-[#f3e5ab]">ARCHIVIO</span>
        </Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-[#d6ad60] transition cursor-pointer">Home</Link>
          <Link to="/browse" className="hover:text-[#d6ad60] transition cursor-pointer">Browse</Link>
          <Link to="/bookmarks" className="hover:text-[#d6ad60] transition cursor-pointer">Bookmarks</Link>
          <Link to="/about" className="hover:text-[#d6ad60] transition cursor-pointer">About</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-[#d6ad60] rounded-full flex items-center justify-center font-bold text-[#5a1528]">
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="hidden md:block">
            {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'} ▾
          </span>
          <button onClick={() => signOut()} className="ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition">
            Logout
          </button>
        </div>
      </header>

      {/* VIEW-ONLY BANNER */}
      <div className="bg-[#242b35] border-b border-[#1f252e] px-4 py-2 flex items-center gap-4 text-xs z-10 shadow-sm transition-colors">
        <Link to="/browse" className="text-white font-bold text-lg hover:bg-white/10 px-2 rounded transition cursor-pointer">←</Link>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#ff8c00] rounded-full"></span>
          <span className="font-bold text-white">View-only access</span> 
          <span className="text-gray-300">—copying and downloading are disabled. This document is protected for academic integrity.</span>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* THIN LEFT NAVIGATION (ICONS) */}
        <div className="w-14 md:w-16 bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col items-center py-4 gap-4 flex-shrink-0 z-10 transition-colors">
          <button onClick={() => handleTabClick('toc')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'toc' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Table of Content">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <button onClick={() => handleTabClick('pages')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'pages' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`} title="Pages">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </button>
          
          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>
          
          <button onClick={toggleFullscreen} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Fullscreen">⛶</button>
          <button className="w-10 h-10 flex items-center justify-center rounded text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700 transition cursor-pointer" title="Bookmark">🔖</button>
          <div className="flex flex-col items-center gap-1 mt-2">
            <button 
              onClick={handleLike}
              className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-700 ${paper.likes?.includes(currentUser?.uid) ? 'text-red-600' : 'text-stone-500 dark:text-gray-400'}`} 
              title={paper.likes?.includes(currentUser?.uid) ? "Unlike" : "Like"}
            >
              {paper.likes?.includes(currentUser?.uid) ? '❤️' : '🤍'}
            </button>
            <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400">{paper.likes?.length || 0}</span>
            <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400 mt-2" title="Views">👁️ {paper.views || 0}</span>
          </div>
          
          <button onClick={() => handleTabClick('cite')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'cite' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Cite">❞</button>
        </div>

        {/* EXPANDABLE SIDEBAR PANEL */}
        {!isFullscreen && (
          <div className="w-[calc(100%-3.5rem)] sm:w-64 absolute sm:relative left-14 sm:left-0 h-full bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto z-20 sm:z-10 shadow-xl sm:shadow-none transition-colors">
            {activeTab === 'toc' && (
              <div className="p-4 flex flex-col h-full">
                <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200 mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">Table of Content</h2>
                <div className="flex flex-col gap-2 flex-1">
                  {['Chapter 1: Introduction', 'Chapter 2: Review of Literature', 'Chapter 3: Methodology', 'Chapter 4: Results & Discussion', 'Chapter 5: Conclusion'].map((chap, idx) => (
                    <button key={idx} onClick={() => handleChapterClick(chap)} className="text-left px-4 py-3 text-xs font-medium bg-[#7a2039] text-white rounded shadow-sm hover:bg-[#5a1528] transition cursor-pointer flex items-center gap-2">
                      <span className="text-[10px]">›</span> {chap}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-200 dark:border-gray-700">
                <div className="p-4 border-b border-stone-200 dark:border-gray-700">
                  <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200">Pages</h2>
                </div>
                <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 items-center custom-scrollbar">
                  {Array.from({ length: paper.documents?.['Final Manuscript']?.pageCount || 1 }).map((_, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-32 h-[170px] bg-white cursor-pointer transition-all overflow-hidden ${currentPage === idx + 1 ? 'ring-2 ring-[#7a2039] border-none shadow-md' : 'border border-stone-300 hover:border-stone-400 shadow-sm'}`}
                      >
                        {/* Scaled down native iframe as thumbnail hack */}
                        <div className="w-full h-full relative pointer-events-none bg-white">
                          {paper.documents?.['Final Manuscript']?.url && paper.documents['Final Manuscript'].url !== '#' ? (
                            <iframe
                              loading="lazy"
                              src={`${paper.documents['Final Manuscript'].url}#page=${idx + 1}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                              className="absolute top-0 left-0 border-none bg-white"
                              style={{
                                width: '1024px',
                                height: '1360px',
                                transform: 'scale(0.125)',
                                transformOrigin: 'top left'
                              }}
                              title={`Page ${idx + 1} Thumbnail`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-stone-400 text-xs text-center p-2">
                              No preview available
                            </div>
                          )}
                        </div>
                      </button>
                      <span className={`text-xs font-bold ${currentPage === idx + 1 ? 'text-[#7a2039]' : 'text-stone-500'}`}>
                        Page {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'cite' && (
              <div className="p-4 flex flex-col h-full bg-[#f4f1ea] dark:bg-gray-900 transition-colors">
                <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200 mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">Citation Formats</h2>
                <div className="flex flex-col gap-4">
                  <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">APA 7th Edition</h3>
                      <button className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition flex items-center gap-1 cursor-pointer">
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-gray-400 leading-relaxed font-serif">
                      {authorName} ({year}). {title}. SWU PHINMA.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CENTER DOCUMENT VIEWER */}
        <div 
          className="flex-1 overflow-hidden flex flex-col relative bg-[#e5e5e5]"
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
        >
          <div className="w-full h-full flex flex-col relative select-none transition-all duration-300">
            {/* EMBEDDED MANUSCRIPT VIEWER */}
            {paper.documents?.['Final Manuscript']?.url && paper.documents['Final Manuscript'].url !== '#' ? (
              <div className="w-full h-full relative">
                {/* Removed absolute overlay so the user can scroll the PDF */}
                <iframe 
                  key={currentPage}
                  src={`${paper.documents['Final Manuscript'].url}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
                  title="Final Manuscript"
                  className="absolute inset-0 w-full h-full border-none"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-stone-500 dark:text-gray-400 z-20">
                <span className="text-4xl mb-4">📄</span>
                <p>No valid manuscript uploaded for this submission.</p>
              </div>
            )}

            {/* WATERMARK */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden">
              <h2 className="text-9xl font-bold transform -rotate-45 whitespace-nowrap text-stone-900">SWU PHINMA ARCHIVE</h2>
            </div>
            <div className="absolute top-1/4 left-0 pointer-events-none w-full text-center opacity-[0.02] -rotate-45">
              <p className="text-4xl font-serif">CONFIDENTIAL • DO NOT COPY</p>
            </div>
            <div className="absolute bottom-1/4 left-0 pointer-events-none w-full text-center opacity-[0.02] -rotate-45">
              <p className="text-4xl font-serif">CONFIDENTIAL • DO NOT COPY</p>
            </div>
          </div>
        </div>

        {/* RIGHT AI PANEL */}
        {isAiOpen && !isFullscreen && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-stone-300 dark:border-gray-700 flex flex-col flex-shrink-0 z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] transition-colors">
            <div className="bg-[#7a2039] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Archivio AI" className="w-6 h-6 object-contain bg-white rounded-full p-0.5 shadow-sm" />
                <span className="font-bold text-sm">Archivio AI Assistant</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="text-white hover:text-[#d6ad60] font-bold cursor-pointer">×</button>
            </div>
            <div className="p-4 bg-[#fcfbf7] dark:bg-gray-900 border-b border-stone-200 dark:border-gray-700 shrink-0 transition-colors">
              <p className="text-xs text-stone-600 dark:text-gray-400 font-medium">Ask questions about this specific research paper.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fcfbf7] dark:bg-gray-900 transition-colors">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${msg.role === 'user' ? 'bg-stone-500 dark:bg-gray-700 text-white text-xs' : 'bg-white border border-stone-200 dark:border-gray-700'}`}>
                    {msg.role === 'user' ? 'U' : <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />}
                  </div>
                  <div className={`text-xs p-3 shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#7a2039] text-white rounded-tl-xl rounded-bl-xl rounded-br-xl' : 'bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl'}`}>
                    {/* Render bold text simply for now */}
                    {msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                    <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-500 dark:text-gray-400 text-xs p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 transition-colors">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isTyping}
                  placeholder="Ask about methodology..." 
                  className="flex-1 border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-800 dark:text-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#7a2039] disabled:opacity-50 transition-colors" 
                />
                <button 
                  type="submit"
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-[#7a2039] text-white px-3 rounded hover:bg-[#5a1528] transition cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI TOGGLE BUTTON (Mogawas kon isAiOpen = false) */}
        {!isAiOpen && !isFullscreen && (
          <button onClick={() => setIsAiOpen(true)} className="absolute right-4 bottom-4 bg-[#7a2039] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-[#5a1528] transition cursor-pointer z-20 border-2 border-white">
            ✨
          </button>
        )}
      </div>
    </div>
  );
}

export default ArchivePaperViewer;