import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import { db, auth } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function Layout({ children, title, breadcrumb, showSearch = true, searchQuery, onSearchChange }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile navigation drawer on route transition
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Update presence every minute
    const updatePresence = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            lastActive: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error('Failed to update presence', e);
        }
      }
    };
    
    updatePresence(); // initial call
    const interval = setInterval(updatePresence, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen h-[100dvh] bg-[#f5f0e6] dark:bg-stone-950 font-sans overflow-hidden">
      {/* Sidebar: Responsive slide-out on phone, static on desktop */}
      <Sidebar 
        isMobileOpen={isMobileNavOpen} 
        onCloseMobile={() => setIsMobileNavOpen(false)} 
      />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 w-full min-w-0 overflow-hidden relative">
        <Header 
          title={title} 
          breadcrumb={breadcrumb} 
          showSearch={showSearch} 
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onMenuToggle={() => setIsMobileNavOpen(prev => !prev)}
        />

        {/* Scrollable page body with bottom clearance for floating mobile navigation */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 pb-28 md:pb-8 custom-scrollbar">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav 
          onOpenMenu={() => setIsMobileNavOpen(true)} 
        />
      </div>
    </div>
  );
}

export default Layout;
