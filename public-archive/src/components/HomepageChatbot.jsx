import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, doc, getDocs, setDoc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import logo from '../assets/logo.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Swal from 'sweetalert2';

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
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100 break-words text-stone-800 dark:text-gray-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
    </div>
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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    const cleanText = text.replace(/[*#_]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a Filipino/Tagalog voice for natural pronunciation
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => v.lang.includes('fil') || v.lang.includes('tl') || v.name.includes('Tagalog') || v.name.includes('Filipino'));
    
    // Fallback to Indonesian if no PH voice (Indo vowels sound very similar to Bisaya)
    if (!voice) {
      voice = voices.find(v => v.lang.includes('id') || v.name.includes('Indonesian'));
    }
    
    // Ultimate fallback
    if (!voice) {
      voice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English')) || voices[0];
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

  const clearChat = () => {
    Swal.fire({
      title: 'Clear Conversation?',
      text: "Are you sure you want to clear this conversation and start a new topic?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7a2039',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear it!',
      customClass: {
        popup: 'dark:bg-gray-800 dark:text-gray-100',
        title: 'dark:text-gray-100',
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setChatHistory(defaultGreeting);
        setCurrentChatId(null);
      }
    });
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
    if ((!messageText.trim() && !imageBase64) || isTyping) return;

    const imagePayload = imageBase64 ? { data: imageBase64, mimeType: selectedImage.type } : null;
    
    // Clear image immediately for UI
    setSelectedImage(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const userMessage = messageText.trim() || "[Attached an image]";
    setChatInput('');
    const newHistoryUser = [...chatHistory, { role: 'user', content: userMessage + (imagePayload ? ' 🖼️' : '') }];
    const savedChatId = await updateAndSaveHistory(newHistoryUser, currentChatId);
    setIsTyping(true);

    try {
      const paperContext = `
        You are the Archivio AI Assistant for the SWU PHINMA public archive.
        Your role is to be a highly capable, all-purpose assistant for the users. 
        You can help them navigate the platform, but you must also be ready to answer ANY question they have—whether it's about academic research, brainstorming ideas, coding, general knowledge, or anything else they need.
        Be incredibly helpful, friendly, and professional. There are no strict limits to what you can answer.

        CRITICAL LANGUAGE INSTRUCTION:
        You are highly fluent in English, Tagalog, and Cebuano (Bisaya). You must ALWAYS reply in the exact language the user uses.
        - If the user speaks in English, reply in natural English.
        - If the user speaks in Tagalog, reply in natural, conversational Tagalog. Avoid awkward or overly formal translations.
        - If the user speaks in Cebuano/Bisaya, reply in pure, natural, and conversational Bisaya (Cebuano). Do not use awkward slang or Tagalog-Bisaya mix unless the user does. Your Bisaya must be extremely fluent and authentic.
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
          image: imagePayload,
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
      if (isVoiceEnabled) {
        speakText(data.text);
      }
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
            <div className="flex items-center gap-1">
              <button 
                onClick={clearChat}
                title="Clear Chat / New Topic"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer text-white/60 hover:text-white hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
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
                  <div className={`text-sm p-3 shadow-sm leading-relaxed relative group ${msg.role === 'user' ? 'bg-[#7a2039] text-white rounded-tl-xl rounded-bl-xl rounded-br-xl' : 'bg-white/90 dark:bg-gray-800/90 border border-white/50 dark:border-gray-700 text-stone-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl'}`}>
                    {msg.role === 'model' && idx === chatHistory.length - 1 ? (
                      <TypewriterWord content={msg.content} />
                    ) : (
                      msg.role === 'model' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-stone-800 prose-pre:text-stone-100 break-words text-stone-800 dark:text-gray-200">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)
                      )
                    )}
                    
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => navigator.clipboard.writeText(msg.content)} 
                        className="absolute -right-2 -bottom-2 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-500 dark:text-gray-300 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-stone-200 dark:hover:bg-gray-600 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                      </button>
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

          {/* Image Preview Area */}
          {selectedImage && (
            <div className="absolute bottom-[72px] left-4 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-stone-200 dark:border-gray-700 z-30 animate-fade-in-up">
              <div className="relative">
                <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
                <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600 cursor-pointer">&times;</button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleChatSubmit} className="p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shrink-0 transition-colors relative z-20">
            <div className="flex gap-2">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isListening}
                className="w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-md shrink-0 disabled:opacity-50 bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-gray-600"
                title="Attach Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
              </button>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isTyping}
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                className="flex-1 border border-stone-300 dark:border-gray-600 bg-stone-50 dark:bg-gray-700 text-stone-800 dark:text-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#7a2039] focus:ring-1 focus:ring-[#7a2039] disabled:opacity-50 transition-colors" 
              />
              <button
                type="button"
                onClick={startListening}
                disabled={isTyping || isListening}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-md shrink-0 disabled:opacity-50 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-gray-600'}`}
                title="Use Voice Input"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
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
