import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ArchiveLogin from './pages/ArchiveLogin';
import ArchiveHome from './pages/ArchiveHome';
import ArchiveBrowse from './pages/ArchiveBrowse';
import ArchiveBookmarks from './pages/ArchiveBookmarks';
import ArchiveAbout from './pages/ArchiveAbout';
import ArchivePaperViewer from './pages/ArchivePaperViewer';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomepageChatbot from './components/HomepageChatbot';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';

function App() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists() && snap.data().maintenance === true) {
        setIsMaintenanceMode(true);
      } else {
        setIsMaintenanceMode(false);
      }
    });
    return () => unsub();
  }, []);

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-6">🛠️</span>
        <h1 className="text-3xl font-serif font-bold text-[#801e38] mb-4">System Under Maintenance</h1>
        <p className="text-stone-600 max-w-md mx-auto">
          ARCHIVIO is currently undergoing scheduled maintenance and updates. 
          Please check back later. We apologize for the inconvenience.
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/" element={<ArchiveHome />} />
          <Route path="/login" element={<ArchiveLogin />} />
          <Route path="/browse" element={<ArchiveBrowse />} />
          <Route path="/about" element={<ArchiveAbout />} />
          
          {/* Protected Routes */}
          <Route path="/bookmarks" element={
            <ProtectedRoute>
              <ArchiveBookmarks />
            </ProtectedRoute>
          } />
          
          <Route path="/viewer/:id" element={
            <ProtectedRoute>
              <ArchivePaperViewer />
            </ProtectedRoute>
          } />
        </Routes>
        <HomepageChatbot />
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;