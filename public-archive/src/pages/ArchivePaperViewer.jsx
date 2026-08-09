import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot, updateDoc, setDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
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
  const [numPages, setNumPages] = useState(null);
  const [relatedPapers, setRelatedPapers] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // AI Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Bookmark State
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    let unsubBookmark = () => {};
    if (currentUser && paper) {
      unsubBookmark = onSnapshot(doc(db, 'user_bookmarks', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsBookmarked(data.bookmarks?.includes(paper.id) || false);
        }
      });
    }
    return () => unsubBookmark();
  }, [currentUser, paper]);

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
                ? [groupData.leaderName, ...(groupData.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
                : subData.studentName || subData.groupName || 'Unknown Author',
              program: groupData?.program || subData.program,
              abstract: groupData?.abstract || subData.abstract
            });
            setTimeout(() => setLoading(false), 800);
          });
        } else {
          setPaper({
            ...subData,
            researchTitle: subData.researchTitle || subData.title,
            authorDisplay: subData.studentName || subData.groupName || 'Unknown Author',
            program: subData.program,
            abstract: subData.abstract
          });
          setTimeout(() => setLoading(false), 800);
        }
      } else {
        console.error("Paper not found");
        setError("Paper not found");
        setTimeout(() => setLoading(false), 800);
      }
    }, (err) => {
      console.error('Error fetching paper:', err);
      setError(err.message);
      setTimeout(() => setLoading(false), 800);
    });

    return () => {
      unsubSub();
      unsubGroup();
    };
  }, [id]);

  // Fetch Related Researches
  useEffect(() => {
    if (!paper || (!paper.program && !paper.category)) return;
    
    const fetchRelated = async () => {
      try {
        const qRelated = query(
          collection(db, 'submissions'),
          where('reviewStatus', '==', 'published'),
          where('program', '==', paper.program || paper.category)
        );
        const snapshot = await getDocs(qRelated);
        const related = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(doc => doc.id !== paper.id) // Exclude current paper
          .slice(0, 4); // Limit to 4 papers
          
        setRelatedPapers(related);
      } catch (err) {
        console.error('Failed to fetch related papers', err);
      }
    };
    fetchRelated();
  }, [paper?.id, paper?.program, paper?.category]);

  // Increment view count when paper viewer opens
  useEffect(() => {
    if (id) {
      const docRef = doc(db, 'submissions', id);
      updateDoc(docRef, { views: increment(1) }).catch(err => console.error("Failed to increment views:", err));
    }
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
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

  const handleToggleAudio = () => {
    if (!paper || !paper.abstract) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Ensure any existing speech is stopped
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(paper.abstract);
      // Optional: you can set the voice/rate here if desired
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  };

  const generateRIS = () => {
    if (!paper) return;
    const titleStr = paper.researchTitle || paper.title || 'Untitled';
    const authorStr = paper.authorDisplay || 'Unknown Author';
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();
    const content = [
      'TY  - RPRT',
      `TI  - ${titleStr}`,
      `AU  - ${authorStr}`,
      `PY  - ${yearStr}`,
      `PB  - SWU PHINMA`,
      `UR  - ${window.location.href}`,
      `AB  - ${paper.abstract || ''}`,
      'ER  - '
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleStr.replace(/\s+/g, '_')}.ris`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateBibTeX = () => {
    if (!paper) return;
    const titleStr = paper.researchTitle || paper.title || 'Untitled';
    const authorStr = paper.authorDisplay || 'Unknown Author';
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();
    const citationKey = `${authorStr.split(',')[0].replace(/\s+/g, '')}${yearStr}`;
    const content = [
      `@techreport{${citationKey},`,
      `  title = {${titleStr}},`,
      `  author = {${authorStr}},`,
      `  year = {${yearStr}},`,
      `  institution = {SWU PHINMA},`,
      `  url = {${window.location.href}}`,
      `}`
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleStr.replace(/\s+/g, '_')}.bib`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    Swal.fire({
      title: 'Link Copied',
      text: 'The link has been copied to your clipboard.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
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

  const handleBookmarkToggle = async () => {
    if (!currentUser) {
      Swal.fire({
        title: 'Login Required',
        text: 'Please log in to save papers to your bookmarks.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#7a2039'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = '/login';
        }
      });
      return;
    }
    
    const bookmarkRef = doc(db, 'user_bookmarks', currentUser.uid);
    try {
      if (isBookmarked) {
        await setDoc(bookmarkRef, { bookmarks: arrayRemove(paper.id) }, { merge: true });
      } else {
        await setDoc(bookmarkRef, { bookmarks: arrayUnion(paper.id) }, { merge: true });
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      Swal.fire('Error', 'Failed to update bookmarks', 'error');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) setIsAiOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#e5e5e5] dark:bg-gray-900 overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <header className="bg-[#5a1528] px-6 py-4 flex justify-between items-center z-20 h-[60px]">
          <div className="h-6 w-32 bg-white/20 rounded"></div>
          <div className="flex gap-4">
            <div className="h-6 w-16 bg-white/20 rounded hidden sm:block"></div>
            <div className="h-8 w-8 bg-white/20 rounded-full"></div>
          </div>
        </header>
        
        {/* Main Workspace Skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar Skeleton */}
          <div className="w-14 md:w-16 bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col items-center py-4 gap-4 flex-shrink-0 z-10">
            <div className="w-10 h-10 bg-stone-200 dark:bg-gray-700 rounded"></div>
            <div className="w-10 h-10 bg-stone-200 dark:bg-gray-700 rounded"></div>
            <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>
            <div className="w-10 h-10 bg-stone-200 dark:bg-gray-700 rounded"></div>
            <div className="w-10 h-10 bg-stone-200 dark:bg-gray-700 rounded"></div>
          </div>

          {/* Table of Contents Panel Skeleton */}
          <div className="w-64 lg:w-72 bg-[#fdfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 p-4 flex flex-col hidden md:flex z-10">
            <div className="h-5 w-24 bg-stone-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>)}
            </div>
          </div>

          {/* Document Content Skeleton */}
          <div className="flex-1 p-2 md:p-8 flex justify-center bg-[#e5e5e5] dark:bg-gray-900 overflow-hidden">
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-xl border border-stone-200 dark:border-gray-700 p-8 md:p-12 lg:p-20 flex flex-col h-full rounded-sm">
              <div className="h-10 w-3/4 bg-stone-200 dark:bg-gray-700 rounded mb-6 mx-auto"></div>
              <div className="h-4 w-1/2 bg-stone-100 dark:bg-gray-700 rounded mb-12 mx-auto"></div>
              <div className="space-y-4 mb-8">
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-5/6 bg-stone-100 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-4/5 bg-stone-100 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-stone-100 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-3/4 bg-stone-100 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
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
          <button onClick={() => handleTabClick('abstract')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'abstract' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Abstract">
            📝
          </button>
          <button onClick={() => handleTabClick('toc')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'toc' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Table of Content">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <button onClick={() => handleTabClick('pages')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'pages' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`} title="Pages">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </button>
          
          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>
          
          <button onClick={toggleFullscreen} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Fullscreen">⛶</button>
          <button 
            onClick={handleBookmarkToggle}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-700 ${isBookmarked ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400'}`} 
            title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
          >
            {isBookmarked ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>}
          </button>
          <div className="flex flex-col items-center gap-1 mt-2">
            <button 
              onClick={handleLike}
              className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-700 ${paper.likes?.includes(currentUser?.uid) ? 'text-red-600' : 'text-stone-500 dark:text-gray-400'}`} 
              title={paper.likes?.includes(currentUser?.uid) ? "Unlike" : "Like"}
            >
              {paper.likes?.includes(currentUser?.uid) ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              )}
            </button>
            <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400">{paper.likes?.length || 0}</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-gray-400 mt-2" title="Views">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
              {paper.views || 0}
            </span>
          </div>
          
          <button onClick={() => handleTabClick('cite')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'cite' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Cite">❞</button>
          
          <button onClick={() => handleTabClick('share')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'share' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Share">
            🔗
          </button>
          
          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>

          <button onClick={() => handleTabClick('related')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'related' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Related Researches">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </button>
        </div>

        {/* EXPANDABLE SIDEBAR PANEL */}
        {!isFullscreen && (
          <div className="w-[calc(100%-3.5rem)] sm:w-64 absolute sm:relative left-14 sm:left-0 h-full bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto z-20 sm:z-10 shadow-xl sm:shadow-none transition-colors">
            {activeTab === 'abstract' && (
              <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors">
                <div className="flex justify-between items-center mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">
                  <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200">Abstract</h2>
                  {paper.abstract && (
                    <button 
                      onClick={handleToggleAudio}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition cursor-pointer shadow-sm ${isSpeaking ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#7a2039] hover:bg-[#5a1528] text-white'}`}
                    >
                      {isSpeaking ? 'Stop ⏹️' : 'Play 🎧'}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <p className="text-sm text-stone-600 dark:text-gray-300 leading-relaxed text-justify indent-6">
                    {paper.abstract || 'No abstract available for this research paper.'}
                  </p>
                </div>
              </div>
            )}

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
                <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 items-center custom-scrollbar">
                  {numPages ? (
                    <Document file={paper.documents['Final Manuscript'].url}>
                      {Array.from({ length: numPages }).map((_, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 mb-4">
                          <button 
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`w-28 bg-white cursor-pointer transition-all overflow-hidden ${currentPage === idx + 1 ? 'ring-2 ring-[#7a2039] border-none shadow-md' : 'border border-stone-300 hover:border-stone-400 shadow-sm'}`}
                          >
                            <Page 
                              pageNumber={idx + 1} 
                              width={112} 
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </button>
                          <span className={`text-xs font-bold ${currentPage === idx + 1 ? 'text-[#7a2039]' : 'text-stone-500'}`}>
                            Page {idx + 1}
                          </span>
                        </div>
                      ))}
                    </Document>
                  ) : (
                    <div className="text-stone-400 text-xs p-4 text-center">Open a document to see pages...</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cite' && (
              <div className="p-4 flex flex-col h-full bg-[#f4f1ea] dark:bg-gray-900 transition-colors">
                <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200 mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">Citation Formats</h2>
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">APA 7th Edition</h3>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${authorName} (${year}). ${title}. SWU PHINMA.`);
                          Swal.fire({ title: 'Copied!', icon: 'success', timer: 1000, showConfirmButton: false });
                        }}
                        className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition flex items-center gap-1 cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-gray-400 leading-relaxed font-serif">
                      {authorName} ({year}). {title}. SWU PHINMA.
                    </p>
                  </div>
                  
                  {/* Export Section */}
                  <div className="mt-4 border-t border-stone-200 dark:border-gray-700 pt-4">
                    <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200 mb-3 uppercase tracking-wider">Export Citation</h3>
                    <div className="flex flex-col gap-2">
                      <button onClick={generateRIS} className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-4 py-2 rounded text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-sm text-left font-medium cursor-pointer flex justify-between items-center">
                        <span>Download .RIS (Mendeley, EndNote)</span>
                        <span className="text-[10px]">⬇</span>
                      </button>
                      <button onClick={generateBibTeX} className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-4 py-2 rounded text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-sm text-left font-medium cursor-pointer flex justify-between items-center">
                        <span>Download .BibTeX (LaTeX)</span>
                        <span className="text-[10px]">⬇</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors">
                <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200 mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">Share Research</h2>
                <div className="flex flex-col items-center gap-6 mt-4">
                  <div className="bg-white p-4 rounded-xl shadow-md border border-stone-200">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} 
                      alt="QR Code" 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">Scan to read on mobile devices</p>
                    <button 
                      onClick={copyLink}
                      className="bg-[#7a2039] text-white px-6 py-2 rounded-full hover:bg-[#5a1528] transition shadow-sm text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'related' && (
              <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors">
                <h2 className="font-serif font-bold text-lg text-stone-800 dark:text-gray-200 mb-6 border-b border-stone-200 dark:border-gray-700 pb-2">Related Researches</h2>
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
                  {relatedPapers.length > 0 ? (
                    relatedPapers.map(rp => (
                      <div key={rp.id} className="bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded p-4 shadow-sm hover:shadow-md transition">
                        <span className="text-[10px] bg-stone-100 dark:bg-gray-600 px-2 py-1 rounded text-stone-600 dark:text-gray-300 font-medium mb-2 inline-block truncate max-w-full">
                          {rp.program || 'Research'}
                        </span>
                        <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200 mb-1 line-clamp-2" title={rp.researchTitle || rp.title}>
                          {rp.researchTitle || rp.title || 'Untitled Research'}
                        </h3>
                        <p className="text-[10px] text-stone-500 dark:text-gray-400 mb-3 truncate">{rp.studentName || rp.groupName || 'Unknown Author'}</p>
                        <a href={`/viewer/${rp.id}`} className="text-[10px] bg-[#7a2039] text-white px-3 py-2 rounded hover:bg-[#5a1528] transition inline-block text-center w-full shadow-sm font-medium">
                          Read Paper
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-stone-500 dark:text-gray-400 text-xs mt-10">
                      No related researches found for this department.
                    </div>
                  )}
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
              <div className="w-full h-full relative overflow-y-auto flex justify-center custom-scrollbar py-8 pb-32">
                <Document
                  file={paper.documents['Final Manuscript'].url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-12 text-stone-500">
                      <div className="w-8 h-8 border-4 border-[#7a2039]/30 border-t-[#7a2039] rounded-full animate-spin"></div>
                    </div>
                  }
                  className="flex flex-col items-center shadow-2xl bg-white relative"
                >
                  <Page 
                    pageNumber={currentPage} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={800}
                    className="relative pointer-events-none"
                  />
                  
                  {/* WATERMARK OVERLAY DIRECTLY ON DOCUMENT */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-50">
                    <div className="w-full h-full relative flex items-center justify-center opacity-10">
                      <h2 className="text-8xl font-bold transform -rotate-45 text-stone-900 absolute">SWU PHINMA</h2>
                      <h2 className="text-5xl font-bold transform -rotate-45 text-stone-900 absolute top-1/4">CONFIDENTIAL</h2>
                      <h2 className="text-5xl font-bold transform -rotate-45 text-stone-900 absolute bottom-1/4">DO NOT COPY</h2>
                    </div>
                  </div>
                </Document>

                {/* PAGINATION CONTROLS */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#242b35]/90 backdrop-blur px-6 py-3 rounded-full shadow-lg z-50 border border-[#1f252e]">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="text-white hover:text-[#d6ad60] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm px-2 cursor-pointer"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm font-bold text-gray-300 min-w-[100px] text-center">
                    Page {currentPage} of {numPages || '--'}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(numPages || p, p + 1))}
                    disabled={currentPage >= numPages}
                    className="text-white hover:text-[#d6ad60] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm px-2 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
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