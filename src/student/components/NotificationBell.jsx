import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
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

  // Handle sounds for new notifications
  useEffect(() => {
    const currentUnread = notifications.filter(n => !n.isRead).length;
    
    if (currentUnread > prevUnreadCount && prefs && prefs['inapp-2'] === true) {
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
    }
    
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

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const showDot = prefs ? prefs['inapp-1'] !== false : true;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full border border-[#E8DFCB] bg-white flex items-center justify-center hover:bg-black/5 transition-all shadow-sm cursor-pointer"
      >
        <svg className="w-5 h-5 text-[#8A7B61]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {showDot && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#CF3645] text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-[#FDF9ED]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50 transform origin-top-right transition-all">
          <div className="bg-[#7B1F35] text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-[14px]">Notifications</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`p-4 border-b border-stone-100 last:border-none flex flex-col gap-1 transition-colors ${!n.isRead ? 'bg-[#fcfbf7] cursor-pointer hover:bg-stone-100' : 'bg-white opacity-70'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                      <span className={`text-[13px] font-bold ${!n.isRead ? 'text-[#7B1F35]' : 'text-gray-700'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#CF3645] shrink-0"></span>}
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="relative z-10 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 -m-1 rounded-full transition-colors shrink-0 cursor-pointer"
                      title="Remove notification"
                    >
                      <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[12px] text-gray-600 leading-tight pr-4">{n.message}</p>
                  {n.createdAt && (
                    <span className="text-[10px] text-gray-400 mt-1">
                      {n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : 'Just now'}
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
