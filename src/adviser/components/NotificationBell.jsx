import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
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
  if (lowerTitle.includes('manuscript') || lowerMsg.includes('document') || lowerTitle.includes('publish')) return '📄';
  if (lowerTitle.includes('message') || lowerTitle.includes('invite') || lowerTitle.includes('welcome')) return '✉️';
  if (lowerTitle.includes('task') || lowerTitle.includes('progress') || lowerTitle.includes('report')) return '📊';
  if (lowerTitle.includes('group') || lowerTitle.includes('user') || lowerTitle.includes('adviser')) return '👥';
  if (lowerTitle.includes('approved') || lowerTitle.includes('success')) return '✅';
  return '🔔';
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const prevNotifsRef = useRef(new Set()); // To track seen notifs for toasts
  const dropdownRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Listen to preferences in 'users' collection
    const unsubUser = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrefs(data.notificationPrefs || {});
      }
    });

    return () => unsubUser();
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
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#541b2f] dark:text-stone-500 dark:hover:text-[#f8d070] hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {showDot && unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-[14px] h-[14px] bg-[#CF3645] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200 dark:border-stone-800 overflow-hidden z-50 transform origin-top-right transition-all">
          <div className="bg-[#7B1F35] text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-[14px]">Notifications</h3>
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
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-3 opacity-50">📭</span>
                <p className="text-sm font-bold text-gray-500 dark:text-stone-400">All caught up!</p>
                <p className="text-xs text-gray-400 dark:text-stone-500 mt-1">No new notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`p-4 border-b border-stone-100 dark:border-stone-800 last:border-none flex flex-col gap-1.5 transition-colors ${!n.isRead ? 'bg-[#fcfbf7] dark:bg-[#f8d070]/5 cursor-pointer hover:bg-stone-50 dark:hover:bg-[#f8d070]/10' : 'bg-white dark:bg-transparent opacity-75'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-lg leading-none pt-0.5">{getIcon(n.title, n.message)}</span>
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-bold ${!n.isRead ? 'text-[#7B1F35] dark:text-[#f8d070]' : 'text-gray-700 dark:text-stone-300'}`}>
                          {n.title}
                        </span>
                        <p className="text-[12px] text-gray-600 dark:text-stone-400 leading-snug mt-0.5">{n.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#CF3645]"></span>}
                      <button 
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
