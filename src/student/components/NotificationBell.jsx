import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import Swal from 'sweetalert2';

// 1. Helper function for relative time
const getRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
};

// 2. Helper function for category icons
const getIcon = (title, message) => {
  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();
  if (lowerTitle.includes('manuscript') || lowerMsg.includes('document')) return '📄';
  if (lowerTitle.includes('message') || lowerTitle.includes('invite') || lowerTitle.includes('welcome')) return '✉️';
  if (lowerTitle.includes('task') || lowerTitle.includes('progress')) return '📋';
  if (lowerTitle.includes('group') || lowerTitle.includes('member')) return '👥';
  if (lowerTitle.includes('approved') || lowerTitle.includes('success')) return '✅';
  return '🔔';
};

export default function NotificationBell({ onNavigate }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const prevNotifsRef = useRef(new Set()); // To track seen notifs for toasts
  const dropdownRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Listen to preferences
    const unsubStudent = onSnapshot(doc(db, 'students', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrefs(data.notificationPrefs || {});
      }
    });

    return () => unsubStudent();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Fetch notifications without orderBy to avoid needing a composite index
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      let notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Auto-delete and filter out Test Notifications
      notifs.forEach(n => {
        if (n.title === 'Test Notification') {
          deleteDoc(doc(db, 'notifications', n.id)).catch(console.error);
        }
      });
      notifs = notifs.filter(n => n.title !== 'Test Notification');

      // Sort descending client-side
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setNotifications(notifs);
    });

    return () => unsub();
  }, []);

  // Handle sounds and TOASTS for new notifications
  useEffect(() => {
    const currentUnread = notifications.filter(n => !n.isRead).length;
    
    // Check for entirely new unread notifications (not just total count change)
    const currentNotifIds = new Set(notifications.map(n => n.id));
    
    // Skip toast on initial load (when prev is empty but current has items)
    if (prevNotifsRef.current.size === 0 && notifications.length > 0) {
      prevNotifsRef.current = currentNotifIds;
      setPrevUnreadCount(currentUnread);
      return;
    }

    const hasNewUnread = notifications.some(n => !n.isRead && !prevNotifsRef.current.has(n.id));

    if (hasNewUnread && prefs && prefs['inapp-2'] !== false) {
      // PLAY SOUND
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        console.error("Audio play failed:", e);
      }

      // SHOW TOAST
      const newNotif = notifications.find(n => !n.isRead && !prevNotifsRef.current.has(n.id));
      if (newNotif) {
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          icon: 'info',
          title: newNotif.title,
          text: newNotif.message,
          showConfirmButton: false,
          timer: 4000,
          background: '#7B1F35',
          color: '#fff',
          iconColor: '#fff',
          customClass: { popup: 'rounded-xl shadow-xl' }
        });
      }
    }
    
    prevNotifsRef.current = currentNotifIds;
    setPrevUnreadCount(currentUnread);
  }, [notifications, prefs, prevUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const deleteNotification = async (id, e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent marking as read when clicking delete
    
    // Optimistically remove from UI instantly
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification", error);
      alert("Failed to delete notification: " + error.message);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    if (unreadNotifs.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read", error);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      setIsOpen(false);
    } catch (error) {
      console.error("Error clearing notifications", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const showDot = prefs ? prefs['inapp-1'] !== false : true;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full border border-[#E8DFCB] dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm cursor-pointer"
      >
        <svg className="w-5 h-5 text-[#8A7B61] dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {showDot && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#CF3645] text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-[#FDF9ED] dark:ring-stone-900">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-stone-700/50 overflow-hidden z-[9999] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-r from-[#7B1F35] to-[#9a2843] dark:from-stone-800 dark:to-stone-800 text-white px-5 py-4 flex justify-between items-center shadow-inner">
            <h3 className="font-bold text-[15px] tracking-wide">Notifications</h3>
            {notifications.length > 0 && (
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[11px] font-medium text-[#E8DFCB] hover:text-white transition-colors" title="Mark all as read">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                )}
                <button onClick={clearAllNotifications} className="text-[11px] font-medium text-[#E8DFCB] hover:text-white transition-colors" title="Clear all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 rounded-full flex items-center justify-center mb-5 shadow-inner border border-white/50 dark:border-stone-600/50 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>
                  <span className="text-4xl filter drop-shadow-sm relative z-10">📭</span>
                </div>
                <p className="text-[16px] font-bold text-stone-800 dark:text-stone-200 tracking-tight">All caught up!</p>
                <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-2 max-w-[200px]">You don't have any new notifications at the moment.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => {
                    if (!n.isRead) markAsRead(n.id);
                    if (onNavigate && n.link) {
                      setIsOpen(false);
                      // Map the link to the tab name
                      if (n.link.includes('requirements')) onNavigate('Requirements');
                      else if (n.link.includes('manuscript')) onNavigate('Manuscript');
                      else if (n.link.includes('progress')) onNavigate('Progress');
                      else if (n.link.includes('dashboard')) onNavigate('Dashboard');
                      else if (n.link.includes('group')) onNavigate('My Group');
                    } else if (n.link) {
                      setIsOpen(false);
                      navigate(n.link);
                    }
                  }}
                  className={`relative p-5 border-b border-stone-100 dark:border-stone-800/50 last:border-none flex flex-col gap-2 transition-all duration-300 group ${
                    !n.isRead 
                      ? 'bg-gradient-to-r from-white to-[#fffafb] dark:from-stone-800/90 dark:to-stone-800/70 cursor-pointer hover:shadow-md z-10 hover:-translate-y-[1px]' 
                      : `bg-white/40 dark:bg-stone-900/40 opacity-85 ${n.link ? 'cursor-pointer hover:bg-stone-50/80 dark:hover:bg-stone-800/60 hover:opacity-100' : ''}`
                  }`}
                >
                  {/* Unread Indicator Bar */}
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#7B1F35] to-[#DDA3B6] shadow-[0_0_8px_rgba(123,31,53,0.4)]"></div>
                  )}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4 items-start w-full">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                        !n.isRead 
                          ? 'bg-gradient-to-br from-[#7B1F35]/10 to-[#7B1F35]/5 border-[#7B1F35]/20 dark:from-[#7B1F35]/30 dark:to-[#7B1F35]/10 dark:border-[#7B1F35]/40' 
                          : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200/50 dark:border-stone-700/50'
                      }`}>
                        <span className="text-[18px] leading-none filter drop-shadow-sm transition-transform group-hover:scale-110 duration-300">{getIcon(n.title, n.message)}</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pr-6 mt-0.5">
                        <span className={`text-[14px] font-bold tracking-tight truncate ${!n.isRead ? 'text-[#7a2e46] dark:text-[#f8d070]' : 'text-stone-700 dark:text-stone-300'}`}>
                          {n.title}
                        </span>
                        <p className={`text-[13px] leading-relaxed mt-1.5 ${!n.isRead ? 'text-stone-800 dark:text-stone-200 font-medium' : 'text-stone-500 dark:text-stone-400'}`}>
                          {n.message}
                        </p>
                        {n.link && (
                          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#7a2e46]/70 dark:text-[#f8d070]/70 group-hover:text-[#7a2e46] dark:group-hover:text-[#f8d070] transition-colors">
                            <span>View Details</span>
                            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute right-4 top-5 flex flex-col items-end gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id, e);
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {n.createdAt && (
                    <span className="text-[10px] text-gray-400 dark:text-stone-500 font-medium self-end -mt-1">
                      {getRelativeTime(n.createdAt)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
