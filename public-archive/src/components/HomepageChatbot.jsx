import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, doc, getDocs, setDoc, addDoc, query, orderBy, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import logo from '../assets/logo.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Swal from 'sweetalert2';
import { getBackendUrl } from '../utils/backendUrl';
import { streamAIChat } from '../services/aiService';
import { useNetworkStatus } from './NetworkStatusPill';

const GUEST_MAX_QUERIES = 3;

const TypewriterWord = ({ content, onFinish }) => {
  const [visibleWords, setVisibleWords] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef(null);
  const words = content.split(' ');
  
  useEffect(() => {
    setVisibleWords(0);
    setIsTyping(true);
    timerRef.current = setInterval(() => {
      setVisibleWords(prev => {
        if (prev >= words.length) {
          clearInterval(timerRef.current);
          setIsTyping(false);
          if (onFinish) onFinish();
          return prev;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(timerRef.current);
  }, [content]);

  const stopTyping = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVisibleWords(words.length);
    setIsTyping(false);
    if (onFinish) onFinish();
  };

  const displayedContent = words.slice(0, visibleWords).join(' ');
  return (
    <div className="relative group">
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100 break-words text-stone-800 dark:text-gray-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
      </div>
      {isTyping && (
        <button
          onClick={stopTyping}
          className="absolute -bottom-10 left-0 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-500 dark:text-gray-300 rounded-full px-2.5 py-1 text-xs shadow hover:bg-stone-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 z-10 cursor-pointer animate-fade-in-up"
          title="Stop Generating"
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"></rect></svg>
          Stop typing
        </button>
      )}
    </div>
  );
};

export default function HomepageChatbot() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [guestQueriesLeft, setGuestQueriesLeft] = useState(() => {
    const stored = localStorage.getItem('archivio_guest_queries_left');
    return stored !== null ? Math.max(0, parseInt(stored, 10)) : GUEST_MAX_QUERIES;
  });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatEndRef = useRef(null);

  const [systemData, setSystemData] = useState('');

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const qSubs = query(collection(db, 'submissions'), where('reviewStatus', '==', 'published'));
        const snapshot = await getDocs(qSubs);
        
        let papers = snapshot.docs.map(doc => {
          const data = doc.data();
          return `- "${data.title || data.researchTitle}" by ${data.authors ? data.authors.join(', ') : 'Unknown'} (${data.program || 'N/A'}). Abstract: ${data.abstract ? data.abstract.substring(0, 150) + '...' : 'N/A'}`;
        });
        
        // Limit to 50 latest to avoid huge context payloads for now
        papers = papers.slice(0, 50);

        if (papers.length > 0) {
          setSystemData(`\n\nCURRENT AVAILABLE RESEARCH PAPERS IN THE SYSTEM:\n${papers.join('\n')}\n\nYou can use the above list to answer questions about what researches are currently stored in the system. Use it as your knowledge base. If they ask about papers not in this list, say you can't find it.`);
        } else {
          setSystemData('\n\nCurrently, there are no published research papers in the system.');
        }
      } catch (err) {
        console.error("Failed to fetch system data for AI context", err);
      }
    };
    fetchSystemData();
  }, []);

  // Clean up any old guest history that may have been saved before this fix
  useEffect(() => {
    localStorage.removeItem('guestChatHistory');
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please try using Google Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      // Auto-send the transcribed voice
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const speakText = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    // Clean text from markdown bold/italics
    const cleanText = text.replace(/[*#_`]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const isLocalLang = /\b(ang|mga|sa|og|ug|nga|kanang|kani|mao|dili|wala|apan|dinhi|inyong|kami|kita)\b/i.test(cleanText);

    let voice = null;
    if (isLocalLang) {
      voice = voices.find(v => v.lang.includes('fil') || v.lang.includes('tl') || v.name.includes('Tagalog') || v.name.includes('Filipino'));
      if (!voice) {
        voice = voices.find(v => v.lang.includes('id') || v.name.includes('Indonesian'));
      }
    } else {
      voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Female')))
        || voices.find(v => v.lang.startsWith('en'));
    }
    
    // Fallback if no specific voice match
    if (!voice) {
      voice = voices[0];
    }
    
    if (voice) utterance.voice = voice;
    
    window.speechSynthesis.speak(utterance);
  };

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0];
  const greetingText = userName 
    ? `Hi ${userName}! I'm the Archivio AI Assistant. How can I help you today?`
    : `Hi! I'm the Archivio AI Assistant. How can I help you today?`;
    
  const defaultGreeting = [{ role: 'model', content: greetingText }];

  // Load chat history from Firestore or LocalStorage
  useEffect(() => {
    const fetchConversations = async () => {
      setHistoryLoaded(false);
      try {
        if (currentUser) {
          const q = query(collection(db, 'userChats', currentUser.uid, 'conversations'), orderBy('lastUpdated', 'desc'));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setConversations(list);
          
          if (list.length > 0) {
            // Load the most recent conversation by default, filtering legacy error messages
            const rawHistory = list[0].history || defaultGreeting;
            const cleaned = rawHistory.filter(m => 
              !m.content?.includes("restart the email-service backend") &&
              !m.content?.includes("Backend server returned an invalid response")
            );
            setCurrentChatId(list[0].id);
            setChatHistory(cleaned.length > 0 ? cleaned : defaultGreeting);
          } else {
            // No history, start fresh
            setCurrentChatId(null);
            setChatHistory(defaultGreeting);
          }
        } else {
          // Guest User — no persistence, always start fresh
          setChatHistory(defaultGreeting);
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
        setChatHistory(defaultGreeting);
      } finally {
        setHistoryLoaded(true);
      }
    };
    
    if (isOpen) {
      fetchConversations();
    }
  }, [currentUser, isOpen]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping, isTypewriterActive]);

  const startNewChat = () => {
    setCurrentChatId(null);
    setChatHistory(defaultGreeting);
    setShowSidebar(false);
  };

  const loadChat = (chatId, history) => {
    setCurrentChatId(chatId);
    const cleaned = (history || defaultGreeting).filter(m => 
      !m.content?.includes("restart the email-service backend") &&
      !m.content?.includes("Backend server returned an invalid response")
    );
    setChatHistory(cleaned.length > 0 ? cleaned : defaultGreeting);
    setShowSidebar(false);
  };

  const deleteConversation = async (chatId, e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Chat?',
      text: "Are you sure you want to permanently delete this conversation?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-gray-100',
        title: 'dark:text-gray-100',
      }
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'userChats', currentUser.uid, 'conversations', chatId));
        setConversations(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
          setChatHistory(defaultGreeting);
          setCurrentChatId(null);
        }
      } catch (err) {
        console.error("Failed to delete chat", err);
      }
    }
  };

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const updateAndSaveHistory = async (newHistory, explicitChatId = null) => {
    setChatHistory(newHistory);
    let resolvedChatId = explicitChatId || currentChatId;
    try {
      if (currentUser) {
        let title = "New Conversation";
        if (newHistory.length > 1) {
          const firstUserMsg = newHistory.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }

        if (resolvedChatId) {
          // Update existing
          await setDoc(doc(db, 'userChats', currentUser.uid, 'conversations', resolvedChatId), {
            history: newHistory,
            lastUpdated: serverTimestamp(),
            title
          }, { merge: true });

          // Update local list for UI instantly
          setConversations(prev => prev.map(c => c.id === resolvedChatId ? { ...c, history: newHistory, title } : c));
          return resolvedChatId;
        } else {
          // Create new document
          const docRef = await addDoc(collection(db, 'userChats', currentUser.uid, 'conversations'), {
            history: newHistory,
            lastUpdated: serverTimestamp(),
            title
          });
          setCurrentChatId(docRef.id);
          
          // Re-fetch to get correct serverTimestamp and ID in list
          const q = query(collection(db, 'userChats', currentUser.uid, 'conversations'), orderBy('lastUpdated', 'desc'));
          const snapshot = await getDocs(q);
          setConversations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          return docRef.id;
        }
      } else {
        // Guest users: history is in-memory only, not persisted
        return null;
      }
    } catch (err) {
      console.error("Failed to save chat history", err);
      return null;
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isTyping) return;

    // Offline check
    if (!isOnline) {
      const userMsg = messageText.trim();
      setChatInput('');
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: userMsg },
        {
          role: 'assistant',
          content: "⚠️ **Offline Mode:** Your device has no active internet connection. Archivio AI cannot respond right now. Please reconnect to Wi-Fi or mobile data and try again."
        }
      ]);
      return;
    }

    // Guest anti-spam / query limit verification
    if (!currentUser) {
      if (guestQueriesLeft <= 0) {
        Swal.fire({
          icon: 'info',
          title: 'Guest Limit Reached',
          text: 'You have used all free guest queries. Please log in or sign up with your @phinmaed.com account to unlock unlimited AI access.',
          confirmButtonColor: '#7a2039',
          confirmButtonText: 'Log In Now',
          showCancelButton: true,
          cancelButtonText: 'Cancel',
          customClass: {
            popup: 'dark:bg-gray-800 dark:text-gray-100',
            title: 'dark:text-gray-100'
          }
        }).then((res) => {
          if (res.isConfirmed) {
            window.location.href = '/login';
          }
        });
        return;
      }

      if (isCooldown) {
        return;
      }
    }

    const userMessage = messageText.trim();
    setChatInput('');
    
    // Decrement guest queries counter & activate anti-spam cooldown
    if (!currentUser) {
      const remaining = Math.max(0, guestQueriesLeft - 1);
      setGuestQueriesLeft(remaining);
      localStorage.setItem('archivio_guest_queries_left', remaining.toString());
      setIsCooldown(true);
      setTimeout(() => setIsCooldown(false), 3000);
    }
    
    const newHistoryUser = [...chatHistory, { 
      role: 'user', 
      content: userMessage
    }];
    
    const savedChatId = await updateAndSaveHistory(newHistoryUser, currentChatId);
    setIsTyping(true);

    try {
      const paperContext = `
        You are the Archivio AI Research Assistant for the Southwestern University PHINMA (SWU PHINMA) Research & Capstone Archive.

        === CRITICAL LANGUAGE ENFORCEMENT (MANDATORY RULE) ===
        1. DEFAULT LANGUAGE IS ENGLISH: You MUST ALWAYS reply in articulate, professional, and academic English by default.
        2. STRICT PROHIBITION ON UNSOLICITED BISAYA: NEVER reply in Cebuano/Bisaya unless the user EXPLICITLY converses in Cebuano/Bisaya or explicitly requests Bisaya (e.g., "Tubaga sa Bisaya", "Unsaon pag...", "Ngano man...", "Pwede mag-Bisaya?").
        3. If the user asks their question in English (for example: "How do I write a good abstract?", "Explain research methodology", "What is ARCHIVIO?", "Help me formulate a research title"), your response MUST be 100% in English. Under NO circumstance should you use Bisaya for English prompts.
        4. If the user writes in Tagalog/Filipino, respond in natural Tagalog.
        5. If and ONLY IF the user explicitly speaks or requests Cebuano/Bisaya, respond in natural, authentic Cebuano/Bisaya.

        === CORE MISSION & STRICT DOMAIN BOUNDARY ===
        Your sole purpose is to serve as an academic research advisor, thesis mentor, and comprehensive guide for the Southwestern University PHINMA (SWU PHINMA) Public Research Archive.
        You are STRICTLY LIMITED to academic research topics:
        - Research titles, problem statements, objectives, and hypotheses
        - Research methodology (conceptual frameworks, qualitative vs. quantitative designs, sampling methods, data gathering instruments, statistical tools)
        - Review of Related Literature (RRL) synthesis, academic synthesis, and referencing standards (APA 7th, MLA 9th, Chicago, BibTeX)
        - Abstract writing, manuscript structuring (IMRAD format, 5-Chapter Thesis format)
        - Navigating the SWU PHINMA research repository, exploring published papers, verification certificates, and research metrics.

        === STRICT "NO CODE / NO PROGRAMMING" POLICY ===
        - You are strictly forbidden from writing, generating, debugging, or solving programming code (such as Python, Java, JavaScript, C++, PHP, SQL, HTML, CSS, etc.).
        - If a user asks for code, scripts, or coding tasks, politely refuse in English:
          "I apologize, but my capabilities are strictly confined to academic research guidance, thesis writing, and ARCHIVIO repository inquiries at SWU PHINMA. I cannot write or debug programming code. However, I can help explain the theoretical methodology, conceptual framework, or system architecture for your study."
          (Translate this refusal to Bisaya or Tagalog only if the user specifically asked in Bisaya or Tagalog).

        === DETAILED COMPREHENSIVE KNOWLEDGE ABOUT ARCHIVIO (PUBLIC ARCHIVE) ===
        ARCHIVIO is the official, state-of-the-art Web-Based Research Archive Management System developed for Southwestern University PHINMA (SWU PHINMA), Cebu City, Philippines. It digitizes, catalogs, verifies, and showcases academic capstone projects, senior high investigations, and undergraduate theses.

        Key System Features & How to Use the Public Archive:
        1. Public Archive & Research Discovery (/browse):
           - Search & Filtering: Users can search by research title, abstract keywords, author names, faculty advisers, and academic year.
           - Departmental Categories: Filter across SWU PHINMA colleges, including:
             * School of Computer Studies (BSIT Capstones, Systems, AI, IoT, Web/Mobile Applications)
             * School of Business & Management (Accountancy, Marketing, Hospitality, Operations)
             * School of Health & Allied Sciences (Medical Technology, Pharmacy, Physical Therapy)
             * School of Nursing
             * School of Engineering & Architecture
             * School of Arts & Sciences / Education / Criminology
           - Visual View Modes: Switch between responsive card grid view and compact list view, complete with view counts, likes, citation counts, and bookmark statistics.

        2. Interactive Document Reader (/paper/:id):
           - Full Abstract & Speech Narration: Instant abstract overview with an integrated Text-to-Speech audio player (Play 🎧 / Stop ⏹️) for auditory reading.
           - Smart In-Text Academic Dictionary: Double-click any academic, technical, or complex word in the abstract or manuscript to trigger a real-time dictionary pop-up with collegiate definitions.
           - Instant Citation Generator: One-click export for academic citations in APA 7th Edition, MLA 9th Edition, Chicago/Turabian, and BibTeX (.bib) format, alongside quick URL copying.
           - Research Citation Knowledge Graph: An interactive 2D Force-Directed Graph connecting related papers by shared advisers, author networks, and departmental research themes.
           - Dynamic Table of Contents (TOC) & Chapter Jump: Real-time outline and text scanner that identifies Chapter 1: Introduction, Chapter 2: Review of Literature, Chapter 3: Methodology, Chapter 4: Results & Discussion, and Chapter 5: Conclusion. Clicking any chapter automatically scrolls smoothly to its exact page in the PDF.
           - Secure In-Browser Manuscript Viewer: Right-click disabling, copy/cut/paste restrictions, digital watermark overlays, zoom controls (75% to 250%), and distraction-free Zen mode.

        3. Digital Verification Ledger & Institutional Certificate (/verify/:id):
           - Every published paper has an immutable digital verification ledger entry at /verify/:id.
           - Displays the official verification hash, faculty adviser endorsement, Dean's seal of approval, exact publication timestamp, and institutional authenticity verification for PACUCOA and CHED accreditation.

        4. User Roles & Account Privileges:
           - Public/Guest Users: Can search and browse papers, read abstracts, listen to audio summaries, generate citations, explore knowledge graphs, verify certificates, and use up to 3 free AI queries. They CANNOT view full PDF manuscripts without logging in.
           - Students: Sign in or register with their official school email (@phinmaed.com). Logging in unlocks:
             * 100% unrestricted reading of all full-text PDF manuscripts.
             * Unlimited AI assistant queries.
             * Personal Research Bookmarks (/bookmarks) to save studies for their own thesis review.
             * Engagement tools (liking papers, tracking research).
             * Access to the Thesis Submission Portal (in the main campus system) where student research leaders submit manuscripts, assign faculty advisers and panel members, receive revisions, and track progress until final Dean approval.
           - Faculty Advisers: Review student submissions, add chapter-by-chapter annotations, request revisions, or recommend endorsement to the Dean.
           - Dean / College Directors: Final academic approval authority; once approved, papers are permanently cataloged and published to the public archive.
           - System Administrators: Manage academic programs, departmental taxonomies, user roles, and repository analytics.

        5. System Creators & Capstone Origin:
           - ARCHIVIO was developed as an official BSIT Capstone Project at Southwestern University PHINMA by:
             * Prince Japhet Vender — Lead Programmer, Full-Stack Developer & System Architect
             * Jerika Zamoras — UI/UX Designer & Document Specialist
             * Hylla Mae Tejada — Project Manager & QA
             * Andrea Cañete Perote — Assistant Programmer & Researcher

        === RESPONSE QUALITY & DEPTH INSTRUCTION ===
        - Always deliver THOROUGH, HIGHLY DETAILED, AND ACADEMICALLY RIGOROUS answers.
        - Structure responses clearly using markdown headings (###), bullet points, and numbered steps.
        - When asked academic questions (e.g. "How do I write a good abstract?", "Explain research methodology", "How to formulate research titles"):
          * Break down the exact components and structure required.
          * Explain the standard academic conventions (e.g., for an abstract: 150-250 words, Background, Problem Statement, Objectives, Methodology, Results/Findings, Conclusion/Implications, followed by 4-6 Keywords).
          * Provide concrete university-level examples and best practices.
        ${systemData}
      `;

      // Add placeholder model bubble for typewriter stream
      setChatHistory(prev => [...prev, { role: 'model', content: '' }]);

      const finalText = await streamAIChat({
        paperContext,
        chatHistory: chatHistory.slice(1).filter(m => m.content),
        userMessage,
        onChunk: (accumulated) => {
          setChatHistory(prev => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (next[lastIdx]?.role === 'model') {
              next[lastIdx] = { ...next[lastIdx], content: accumulated };
            }
            return next;
          });
        }
      });

      const newHistoryModel = [...newHistoryUser, { role: 'model', content: finalText }];
      await updateAndSaveHistory(newHistoryModel, savedChatId);
      if (isVoiceEnabled) {
        speakText(finalText);
      }
    } catch (err) {
      console.error("AI Streaming Error:", err);
      const errMsg = `⚠️ **Notice:** ${err.message || 'Connection issue encountered'}. Please retry.`;
      setChatHistory(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (next[lastIdx]?.role === 'model') {
          next[lastIdx] = { ...next[lastIdx], content: errMsg };
        } else {
          next.push({ role: 'model', content: errMsg });
        }
        return next;
      });
      const newHistoryError = [...newHistoryUser, { role: 'model', content: errMsg }];
      await updateAndSaveHistory(newHistoryError, savedChatId);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    await sendMessage(chatInput);
  };

  // Guest users get introductory navigation prompts; Logged-in users get full research prompts
  const suggestions = currentUser ? [
    "💡 Help me formulate a research title",
    "📝 How do I write a good abstract?",
    "💻 Suggest a thesis topic for IT",
    "📄 What are the latest research papers here?",
    "📋 What are the requirements for uploading?"
  ] : [
    "🏛️ What is ARCHIVIO?",
    "🎓 How do students submit research here?"
  ];

  // Hide on authentication pages and viewer (all hooks are above — safe to return null here)
  const hiddenPaths = ['/login', '/forgot-password', '/reset-password', '/viewer'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] h-[500px] max-h-[82vh] mb-3 sm:mb-4 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/30 dark:border-white/10 transition-all origin-bottom-right relative animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-[#7a2039]/90 backdrop-blur-sm text-white p-4 flex justify-between items-center shrink-0 z-40 relative shadow-sm border-b border-white/10">
            <div className="flex items-center gap-3">
              {currentUser && (
                <button onClick={() => setShowSidebar(!showSidebar)} className="mr-1 text-white/80 hover:text-white transition cursor-pointer">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
              )}
              <img src={logo} alt="Archivio AI" className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow-sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[15px]">Archivio AI</h3>
                  {!isOnline ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-200 border-amber-400/30 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39m3.66 0A10.94 10.94 0 0119 12.55M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
                      </svg>
                      Offline
                    </span>
                  ) : !currentUser && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${guestQueriesLeft > 0 ? 'bg-amber-400/20 text-amber-200 border-amber-300/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}`}>
                      {guestQueriesLeft > 0 ? `${guestQueriesLeft} free query left` : 'Limit reached'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#f3e5ab] opacity-90">
                  {!isOnline ? 'Network Disconnected' : currentUser ? 'Always here to help' : 'Guest Mode (Limited)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {currentUser && (
                <button
                  type="button"
                  onClick={startNewChat}
                  title="Start New Chat"
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              )}
              <button 
                onClick={() => {
                  if (isVoiceEnabled) window.speechSynthesis.cancel();
                  setIsVoiceEnabled(!isVoiceEnabled);
                }}
                title={isVoiceEnabled ? "Mute AI Voice" : "Enable AI Voice"}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isVoiceEnabled ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {isVoiceEnabled ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
                )}
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white font-bold text-2xl cursor-pointer transition-colors px-2">&times;</button>
            </div>
          </div>

          {/* History Sidebar Overlay (Logged-in Only) */}
          {showSidebar && currentUser && (
            <div className="absolute inset-0 top-[72px] bg-white dark:bg-gray-800 z-30 flex flex-col border-t border-stone-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-stone-200 dark:border-gray-700">
                <button 
                  onClick={startNewChat}
                  className="w-full flex items-center justify-center gap-2 bg-[#7a2039] text-white py-2 rounded-lg hover:bg-[#5a1528] transition font-medium cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <p className="text-xs font-bold text-stone-500 uppercase px-2 mb-2 pt-2">Previous Chats</p>
                {conversations.length === 0 && (
                  <p className="text-sm text-stone-400 px-2 py-2">No history yet.</p>
                )}
                {conversations.map(conv => (
                  <div key={conv.id} className="relative group mb-1">
                    <button 
                      onClick={() => loadChat(conv.id, conv.history)}
                      className={`w-full text-left p-3 pr-10 rounded-lg text-sm truncate transition cursor-pointer ${currentChatId === conv.id ? 'bg-stone-100 dark:bg-gray-700 font-bold text-stone-800 dark:text-gray-100' : 'text-stone-600 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700/50'}`}
                    >
                      💬 {conv.title || 'Conversation'}
                    </button>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                      title="Delete Conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-transparent relative z-20">
            {!historyLoaded ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-stone-400 dark:text-gray-500 text-sm animate-pulse">Loading...</span>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm mt-1 ${msg.role === 'user' ? 'bg-stone-500 dark:bg-gray-700 text-white text-xs' : 'bg-white border border-stone-200 dark:border-gray-700'}`}>
                    {msg.role === 'user' ? 'U' : <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />}
                  </div>
                  <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`text-sm p-3 shadow-sm leading-relaxed relative group ${msg.role === 'user' ? 'bg-[#7a2039]/90 text-white rounded-tl-xl rounded-bl-xl rounded-br-xl backdrop-blur-sm' : 'bg-white/80 dark:bg-black/40 border border-white/40 dark:border-white/10 text-stone-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl backdrop-blur-sm'}`}>
                      {msg.role === 'model' ? (
                        msg.content ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100 break-words text-stone-800 dark:text-gray-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 items-center py-1">
                            <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            <span className="text-xs text-stone-400 dark:text-gray-500 ml-1">Thinking...</span>
                          </div>
                        )
                      ) : (
                        msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)
                      )}
                      
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => handleCopy(msg.content, idx)} 
                          className="absolute -right-2 -bottom-2 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-500 dark:text-gray-300 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow hover:bg-stone-200 dark:hover:bg-gray-600 cursor-pointer flex items-center justify-center gap-1"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              <span className="text-[10px] text-green-600 dark:text-green-400 font-bold pr-1">Copied!</span>
                            </>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Guest Limit Lock Card - only shown AFTER the AI finishes generating and typing */}
            {!currentUser && guestQueriesLeft <= 0 && !isTyping && !isTypewriterActive && (
              <div className="bg-gradient-to-br from-amber-500/15 via-[#7a2039]/20 to-amber-600/15 border border-amber-500/40 rounded-2xl p-4 text-center my-2 shadow-xl backdrop-blur-md animate-fade-in-up">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#7a2039] text-amber-300 flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">Free Guest Limit Reached</h4>
                <p className="text-xs text-stone-700 dark:text-stone-200 mt-1 mb-3 leading-relaxed">
                  Sign in with your <strong>@phinmaed.com</strong> account to unlock unlimited AI consultations, thesis assistance, and full research PDF viewing.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 bg-[#7a2039] hover:bg-[#5a1528] text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/login"
                    state={{ isSignUp: true }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-semibold rounded-lg shadow transition"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}

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
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions */}
          {chatHistory.length <= 1 && !isTyping && !isTypewriterActive && (currentUser || guestQueriesLeft > 0) && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 bg-transparent border-b border-stone-200/50 dark:border-gray-700">
              {suggestions.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(text)}
                  className="text-xs bg-white dark:bg-gray-800 border border-[#7a2039]/40 text-[#7a2039] dark:text-[#f3e5ab] px-3 py-1.5 rounded-full hover:bg-[#7a2039] hover:text-white dark:hover:bg-[#f3e5ab] dark:hover:text-[#7a2039] transition-colors text-left shadow-sm cursor-pointer"
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleChatSubmit} className="p-3 bg-white/10 dark:bg-black/20 backdrop-blur-sm shrink-0 transition-colors relative z-20 border-t border-white/20 dark:border-white/10">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={!isOnline || isTyping || isTypewriterActive || (!currentUser && guestQueriesLeft <= 0)}
                placeholder={!isOnline ? "⚠️ Offline. Please check your internet connection..." : !currentUser && guestQueriesLeft <= 0 && !isTyping && !isTypewriterActive ? "Log in to continue chatting with AI..." : (isListening ? "Listening..." : "Ask me anything...")}
                className="flex-1 min-w-0 border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-sm text-stone-800 dark:text-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#7a2039] focus:ring-1 focus:ring-[#7a2039] disabled:opacity-50 transition-colors placeholder-stone-500" 
              />
              <button
                type="button"
                onClick={startListening}
                disabled={!isOnline || isTyping || isListening || isTypewriterActive || (!currentUser && guestQueriesLeft <= 0)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-md shrink-0 disabled:opacity-50 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-gray-600'}`}
                title="Use Voice Input"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
              <button 
                type="submit"
                disabled={!isOnline || isTyping || isTypewriterActive || !chatInput.trim() || (!currentUser && guestQueriesLeft <= 0)}
                className="bg-[#7a2039] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#5a1528] transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="relative bg-[#7a2039] text-white w-14 h-14 rounded-full shadow-[0_4px_14px_0_rgba(122,32,57,0.39)] hover:shadow-[0_6px_20px_rgba(122,32,57,0.23)] hover:-translate-y-1 transform transition-all duration-200 flex items-center justify-center group cursor-pointer border-2 border-white"
        >
          <span className="absolute w-full h-full rounded-full bg-[#7a2039] opacity-40 animate-ping" style={{ animationDuration: '3s' }}></span>
          <svg className="w-7 h-7 text-white group-hover:scale-110 transition-transform relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        </button>
      )}
    </div>
  );
}
