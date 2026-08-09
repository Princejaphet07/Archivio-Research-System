import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, doc, getDocs, setDoc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import logo from '../assets/logo.png';

const TypewriterWord = ({ content }) => {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = content.split(' ');
  
  useEffect(() => {
    setVisibleWords(0);
    const timer = setInterval(() => {
      setVisibleWords(prev => {
        if (prev >= words.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [content]);

  const displayedContent = words.slice(0, visibleWords).join(' ');
  return (
    <span>{displayedContent.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)}</span>
  );
};

export default function HomepageChatbot() {
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const chatEndRef = useRef(null);

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
            // Load the most recent conversation by default
            setCurrentChatId(list[0].id);
            setChatHistory(list[0].history || defaultGreeting);
          } else {
            // No history, start fresh
            setCurrentChatId(null);
            setChatHistory(defaultGreeting);
          }
        } else {
          // Guest User (Local Storage Only)
          const guestHistory = localStorage.getItem('guestChatHistory');
          if (guestHistory) {
            setChatHistory(JSON.parse(guestHistory));
          } else {
            setChatHistory(defaultGreeting);
          }
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
  }, [chatHistory, isTyping]);

  const startNewChat = () => {
    setCurrentChatId(null);
    setChatHistory(defaultGreeting);
    setShowSidebar(false);
  };

  const loadChat = (chatId, history) => {
    setCurrentChatId(chatId);
    setChatHistory(history);
    setShowSidebar(false);
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
        localStorage.setItem('guestChatHistory', JSON.stringify(newHistory));
        return null;
      }
    } catch (err) {
      console.error("Failed to save chat history", err);
      return null;
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isTyping) return;

    const userMessage = messageText.trim();
    setChatInput('');
    const newHistoryUser = [...chatHistory, { role: 'user', content: userMessage }];
    const savedChatId = await updateAndSaveHistory(newHistoryUser, currentChatId);
    setIsTyping(true);

    try {
      const paperContext = `
        You are the Archivio AI Assistant for the SWU PHINMA public archive.
        Your role is to be a highly capable, all-purpose assistant for the users. 
        You can help them navigate the platform, but you must also be ready to answer ANY question they have—whether it's about academic research, brainstorming ideas, coding, general knowledge, or anything else they need.
        Be incredibly helpful, friendly, and professional. There are no strict limits to what you can answer.
      `;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paperContext,
          chatHistory: chatHistory.slice(1), // Exclude initial greeting
          userMessage,
          pdfUrl: null
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

      const newHistoryModel = [...newHistoryUser, { role: 'model', content: data.text }];
      await updateAndSaveHistory(newHistoryModel, savedChatId);
    } catch (err) {
      console.error("AI Error:", err);
      const newHistoryError = [...newHistoryUser, { role: 'model', content: `**Error:** ${err.message}` }];
      await updateAndSaveHistory(newHistoryError, savedChatId);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    await sendMessage(chatInput);
  };

  const suggestions = [
    "📄 What are the latest research papers?",
    "🔍 How do I search for a specific topic?",
    "💡 Can you help me brainstorm a research title?",
    "📋 What are the requirements for uploading?",
    "✨ Summarize the main features of Archivio."
  ];

  // Hide the chatbot on the viewer page (has its own AI) and login page
  if (location.pathname.startsWith('/viewer') || location.pathname.startsWith('/login')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] mb-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/40 dark:border-gray-700 transition-all origin-bottom-right relative animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-[#7a2039] text-white p-4 flex justify-between items-center shrink-0 z-40 relative shadow-sm">
            <div className="flex items-center gap-3">
              {currentUser && (
                <button onClick={() => setShowSidebar(!showSidebar)} className="mr-1 text-white/80 hover:text-white transition cursor-pointer">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
              )}
              <img src={logo} alt="Archivio AI" className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow-sm" />
              <div>
                <h3 className="font-bold text-[15px]">Archivio AI</h3>
                <p className="text-xs text-[#f3e5ab] opacity-90">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white font-bold text-2xl cursor-pointer transition-colors px-2">&times;</button>
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
                  <button 
                    key={conv.id}
                    onClick={() => loadChat(conv.id, conv.history)}
                    className={`w-full text-left p-3 rounded-lg text-sm truncate mb-1 transition cursor-pointer ${currentChatId === conv.id ? 'bg-stone-100 dark:bg-gray-700 font-bold text-stone-800 dark:text-gray-100' : 'text-stone-600 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700/50'}`}
                  >
                    💬 {conv.title || 'Conversation'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-transparent transition-colors z-10 scrollbar-hide">
            {!historyLoaded ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-stone-400 dark:text-gray-500 text-sm animate-pulse">Loading...</span>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${msg.role === 'user' ? 'bg-stone-500 dark:bg-gray-700 text-white text-xs' : 'bg-white border border-stone-200 dark:border-gray-700'}`}>
                    {msg.role === 'user' ? 'U' : <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />}
                  </div>
                  <div className={`text-sm p-3 shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#7a2039] text-white rounded-tl-xl rounded-bl-xl rounded-br-xl' : 'bg-white/90 dark:bg-gray-800/90 border border-white/50 dark:border-gray-700 text-stone-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl'}`}>
                    {msg.role === 'model' && idx === chatHistory.length - 1 ? (
                      <TypewriterWord content={msg.content} />
                    ) : (
                      msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)
                    )}
                  </div>
                </div>
              ))
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
          {chatHistory.length <= 1 && !isTyping && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 bg-transparent border-b border-stone-200/50 dark:border-gray-700">
              {suggestions.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(text)}
                  className="text-xs bg-white dark:bg-gray-800 border border-[#7a2039]/40 text-[#7a2039] dark:text-[#f3e5ab] px-3 py-1.5 rounded-full hover:bg-[#7a2039] hover:text-white dark:hover:bg-[#f3e5ab] dark:hover:text-[#7a2039] transition-colors text-left shadow-sm"
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleChatSubmit} className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shrink-0 transition-colors relative z-20">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTyping}
                placeholder="Ask me anything..." 
                className="flex-1 border border-stone-300 dark:border-gray-600 bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#7a2039] focus:ring-1 focus:ring-[#7a2039] disabled:opacity-50 transition-colors" 
              />
              <button 
                type="submit"
                disabled={isTyping || !chatInput.trim()}
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
