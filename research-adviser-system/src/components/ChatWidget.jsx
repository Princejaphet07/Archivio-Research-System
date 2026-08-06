import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, deleteField, deleteDoc, increment } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [studentStatus, setStudentStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editMessageText, setEditMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // Listen for custom event to open chat
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Set adviser unread count to 0 when a group is selected
  useEffect(() => {
    if (selectedGroup && isOpen) {
      updateDoc(doc(db, 'groups', selectedGroup.id), { adviserUnreadCount: 0 }).catch(console.error);
    }
  }, [selectedGroup, isOpen]);

  // Fetch groups to calculate unread messages and display list
  useEffect(() => {
    const fetchGroups = async () => {
      const email = auth.currentUser?.email;
      if (!email) return;
      const q = query(
        collection(db, 'groups'),
        where('adviserUid', '==', email),
        where('status', '==', 'approved')
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return unsub;
    };
    const unsubscribe = fetchGroups();
    return () => {
      unsubscribe.then(unsub => { if(unsub) unsub() });
    };
  }, [isOpen]);

  // Fetch messages when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    const q = query(collection(db, `chats/${selectedGroup.id}/messages`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return unsub;
  }, [selectedGroup]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen]);

  // Presence Tracking Listener
  useEffect(() => {
    if (!selectedGroup?.leaderUid) return;
    
    const unsub = onSnapshot(doc(db, 'users', selectedGroup.leaderUid), (snap) => {
      if (snap.exists()) {
        setStudentStatus(snap.data().lastActive);
      }
    });

    return () => unsub();
  }, [selectedGroup]);

  const getPresenceText = () => {
    if (!studentStatus) return { text: 'Offline', isOnline: false };
    const diffMs = Date.now() - studentStatus.toMillis();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return { text: 'Online', isOnline: true };
    if (diffMins < 60) return { text: `Active ${diffMins}m ago`, isOnline: false };
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return { text: `Active ${diffHours}h ago`, isOnline: false };
    const diffDays = Math.floor(diffHours / 24);
    return { text: `Active ${diffDays}d ago`, isOnline: false };
  };

  const presence = getPresenceText();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    const user = auth.currentUser;
    let displayName = user.displayName || user.email?.split('@')[0] || 'Adviser';
    
    await addDoc(collection(db, `chats/${selectedGroup.id}/messages`), {
      text,
      senderUid: user.uid,
      senderName: displayName,
      senderRole: 'adviser',
      timestamp: serverTimestamp(),
      reactions: {} // Object instead of array
    });
    
    await updateDoc(doc(db, 'groups', selectedGroup.id), {
      studentUnreadCount: increment(1)
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      Swal.fire('Error', 'Please select an image or video file.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(25); // Simulate progress for fetch
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'Archivio');

      const res = await fetch('https://api.cloudinary.com/v1_1/peqpcqug/auto/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Cloudinary upload failed');
      
      setUploadProgress(75);
      const data = await res.json();
      const downloadURL = data.secure_url;
      
      const user = auth.currentUser;
      let displayName = user.displayName || user.email?.split('@')[0] || 'Adviser';
      
      await addDoc(collection(db, `chats/${selectedGroup.id}/messages`), {
        text: '',
        mediaUrl: downloadURL,
        mediaType: isImage ? 'image' : 'video',
        senderUid: user.uid,
        senderName: displayName,
        senderRole: 'adviser',
        timestamp: serverTimestamp(),
        reactions: {}
      });
      
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        studentUnreadCount: increment(1)
      });
      
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      Swal.fire('Error', 'Failed to upload media.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleReaction = async (msgId, currentReactions = {}, emoji) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedGroup) return;
    
    let safeReactions = currentReactions;
    if (Array.isArray(currentReactions)) safeReactions = {};

    const msgRef = doc(db, `chats/${selectedGroup.id}/messages`, msgId);
    
    if (safeReactions[uid] === emoji) {
      await updateDoc(msgRef, { [`reactions.${uid}`]: deleteField() });
    } else {
      await updateDoc(msgRef, { [`reactions.${uid}`]: emoji });
    }
    setHoveredMsgId(null);
  };

  const handleDeleteMessage = async (msg) => {
    if (!selectedGroup || msg.senderUid !== auth.currentUser?.uid) return;
    const result = await Swal.fire({
      title: 'Delete Message?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      if (msg.mediaUrl) {
        try {
          await fetch('http://localhost:3001/api/delete-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: msg.mediaUrl })
          });
        } catch (e) {
          console.error("Failed to delete from cloudinary", e);
        }
      }

      const msgRef = doc(db, `chats/${selectedGroup.id}/messages`, msg.id);
      await deleteDoc(msgRef);
    }
  };

  const startEditing = (msg) => {
    setEditingMsgId(msg.id);
    setEditMessageText(msg.text);
    setHoveredMsgId(null);
  };

  const saveEdit = async (msgId) => {
    if (!selectedGroup || !editMessageText.trim()) return;
    const msgRef = doc(db, `chats/${selectedGroup.id}/messages`, msgId);
    await updateDoc(msgRef, {
      text: editMessageText.trim(),
      edited: true
    });
    setEditingMsgId(null);
    setEditMessageText('');
  };

  const totalUnreadCount = groups.reduce((sum, g) => sum + (g.adviserUnreadCount || 0), 0);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#7B1F35] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#5a1626] transition-all z-50 hover:scale-105 active:scale-95"
      >
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#7B1F35] p-4 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center gap-2">
          {selectedGroup && (
            <button onClick={() => setSelectedGroup(null)} className="mr-1 hover:bg-white/10 rounded-full p-1 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        <div>
          <h3 className="font-bold text-sm tracking-wide uppercase">{selectedGroup?.groupName || 'My Groups'}</h3>
          {selectedGroup && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">Group Chat</span>
            <span className="text-[10px] text-white/50">•</span>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${presence.isOnline ? 'bg-green-400 animate-pulse' : 'bg-stone-400'}`}></span>
              <span className={`text-[9px] font-medium tracking-wide ${presence.isOnline ? 'text-green-300' : 'text-stone-300'}`}>
                {presence.text}
              </span>
            </div>
          </div>
          )}
        </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition rounded-full hover:bg-white/10 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {!selectedGroup ? (
        /* Group List Screen */
        <div className="flex-1 bg-[#FDF9ED] p-3 overflow-y-auto flex flex-col gap-2">
          {groups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm font-semibold text-stone-700">No Groups Found</p>
              <p className="text-xs text-stone-500 mt-1">You aren't advising any approved groups yet.</p>
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="w-full text-left bg-white p-3 rounded-xl border border-stone-200 hover:border-[#7B1F35]/30 hover:shadow-sm transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="font-bold text-stone-800 text-sm">{group.groupName}</h4>
                  <p className="text-xs text-stone-500 mt-0.5 truncate w-[220px]">{group.researchTitle || 'Untitled Research'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-[#7B1F35] group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Chat Screen */
        <>
          <div className="flex-1 bg-[#FDF9ED] p-4 overflow-y-auto flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 bg-[#7B1F35]/10 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#7B1F35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-stone-700">Start the conversation</p>
                <p className="text-xs text-stone-500 mt-1">Send a message to your students in {selectedGroup.groupName}.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderUid === auth.currentUser?.uid;
                
                let reactionsObj = msg.reactions || {};
                if (Array.isArray(reactionsObj)) {
                  reactionsObj = reactionsObj.reduce((acc, uid) => ({...acc, [uid]: '❤️'}), {});
                }
                
                const reactionKeys = Object.keys(reactionsObj);
                const hasReactions = reactionKeys.length > 0;
                const myReaction = reactionsObj[auth.currentUser?.uid];
                const uniqueEmojis = [...new Set(Object.values(reactionsObj))];

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {/* Messenger-style Multi-Emoji Toolbar (Moved here to avoid clipping) */}
                    {hoveredMsgId === msg.id && (
                      <div className={`absolute z-30 -top-10 ${isMe ? 'right-0' : 'left-0'} bg-white shadow-lg border border-stone-100 rounded-full flex items-center gap-1 p-1.5 animate-fade-in-up`}>
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, reactionsObj, emoji)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xl hover:scale-125 hover:-translate-y-1 transition-transform ${myReaction === emoji ? 'bg-stone-100' : ''}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {!isMe && <span className="text-[10px] font-bold text-stone-500 mb-1 ml-1">{msg.senderName}</span>}
                    
                    <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Message Bubble */}
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[240px] text-sm shadow-sm relative ${
                        isMe 
                          ? 'bg-[#7B1F35] text-white rounded-br-sm' 
                          : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm'
                      }`}>
                        {msg.mediaUrl && (
                          <div className="mb-1 rounded-xl overflow-hidden bg-black/10">
                            {msg.mediaType === 'image' ? (
                              <img src={msg.mediaUrl} alt="media" className="max-w-full h-auto cursor-pointer hover:opacity-90 transition" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                            ) : (
                              <video src={msg.mediaUrl} controls className="max-w-full h-auto" />
                            )}
                          </div>
                        )}
                        
                        {/* Editing Mode vs Normal Text */}
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <input 
                              type="text" 
                              value={editMessageText} 
                              onChange={(e) => setEditMessageText(e.target.value)}
                              className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(msg.id);
                                if (e.key === 'Escape') setEditingMsgId(null);
                              }}
                            />
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setEditingMsgId(null)} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded">Cancel</button>
                              <button onClick={() => saveEdit(msg.id)} className="text-[10px] bg-white text-[#7B1F35] font-bold hover:bg-stone-100 px-2 py-1 rounded">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="break-words">
                            {msg.text}
                          </div>
                        )}
                        
                        {/* Reaction Badge */}
                        {hasReactions && (
                          <div className={`absolute -bottom-2 ${isMe ? 'left-2' : 'right-2'} bg-white border border-stone-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center gap-1 z-10 cursor-pointer hover:bg-stone-50`} onClick={() => setHoveredMsgId(msg.id)}>
                            <div className="flex -space-x-1">
                              {uniqueEmojis.slice(0, 3).map((emoji, idx) => (
                                <span key={idx} className="text-xs z-10 bg-white rounded-full">{emoji}</span>
                              ))}
                            </div>
                            <span className="text-[9px] font-bold text-stone-600 pl-0.5">{reactionKeys.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Reaction Button / Toolbar */}
                      <div className={`relative flex items-center gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <button 
                          onClick={() => hoveredMsgId === msg.id ? setHoveredMsgId(null) : setHoveredMsgId(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm shadow-sm"
                          title="React"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        
                        {/* Edit and Delete Buttons for Own Messages */}
                        {isMe && !editingMsgId && (
                          <>
                            {msg.text && (
                              <button 
                                onClick={() => startEditing(msg)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-sm shadow-sm"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteMessage(msg)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-stone-100 hover:bg-red-50 flex items-center justify-center text-sm shadow-sm"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {i === messages.length - 1 && (
                      <div className={`flex items-center gap-1 mt-1 ${hasReactions ? 'mt-3' : ''}`}>
                        <span className="text-[9px] font-medium text-stone-400">
                          {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sending...'}
                        </span>
                        {msg.edited && <span className="text-[9px] font-medium text-stone-400 italic">(edited)</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {isUploading && (
              <div className="flex flex-col items-end">
                <div className="bg-[#7B1F35]/10 border border-[#7B1F35]/20 px-4 py-2 rounded-2xl rounded-br-sm max-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3 h-3 text-[#7B1F35] animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    <span className="text-[10px] text-[#7B1F35] font-bold uppercase tracking-wider">Sending Media</span>
                  </div>
                  <div className="w-full bg-[#7B1F35]/20 rounded-full h-1">
                    <div className="bg-[#7B1F35] h-1 rounded-full transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex gap-2 items-center relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*,video/*" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedGroup || isUploading}
              className="w-10 h-10 shrink-0 text-stone-400 hover:text-[#7B1F35] bg-stone-100 hover:bg-[#7B1F35]/10 rounded-full flex items-center justify-center transition disabled:opacity-50"
              title="Attach Photo or Video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isUploading}
              className="flex-1 bg-stone-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1F35]/30 focus:bg-white transition-all"
            />
            <button 
              type="submit" 
              disabled={(!newMessage.trim() && !isUploading)}
              className="w-10 h-10 shrink-0 bg-[#7B1F35] text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-[#5a1626] transition transform active:scale-95 disabled:active:scale-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
