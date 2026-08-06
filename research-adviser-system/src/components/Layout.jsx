import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatWidget from './ChatWidget';
import { db, auth } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function Layout({ children, title, breadcrumb, showSearch = true, searchQuery, onSearchChange }) {
  useEffect(() => {
    // Update presence every minute
    const updatePresence = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastActive: serverTimestamp()
          });
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
    <div className="flex h-screen bg-[#f5f0e6] font-sans overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Header 
          title={title} 
          breadcrumb={breadcrumb} 
          showSearch={showSearch} 
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}

export default Layout;