import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomepageChatbot from './components/HomepageChatbot';
import SpotlightSearch from './components/SpotlightSearch';
import NetworkStatusPill from './components/NetworkStatusPill';

// Lazy-loaded pages to optimize initial bundle size and ensure instant load times
const ArchiveHome = lazy(() => import('./pages/ArchiveHome'));
const ArchiveBrowse = lazy(() => import('./pages/ArchiveBrowse'));
const ArchiveBookmarks = lazy(() => import('./pages/ArchiveBookmarks'));
const ArchiveAbout = lazy(() => import('./pages/ArchiveAbout'));
const ArchiveVerifyCertificate = lazy(() => import('./pages/ArchiveVerifyCertificate'));
const ArchivePaperViewer = lazy(() => import('./pages/ArchivePaperViewer'));
const ArchiveLogin = lazy(() => import('./pages/ArchiveLogin'));
const ArchiveForgotPassword = lazy(() => import('./pages/ArchiveForgotPassword'));
const ArchiveResetPassword = lazy(() => import('./pages/ArchiveResetPassword'));

// Preload helper for instant paper viewer opening
export const preloadPaperViewer = () => import('./pages/ArchivePaperViewer');

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 transition-colors duration-200">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7a2039]/20 border-t-[#7a2039] rounded-full animate-spin"></div>
        <div className="absolute w-6 h-6 rounded-full bg-[#7a2039]/10 animate-ping"></div>
      </div>
      <p className="mt-4 text-xs font-semibold tracking-widest uppercase text-stone-500 dark:text-gray-400 animate-pulse">
        Loading ARCHIVIO...
      </p>
    </div>
  );
}

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
          <NetworkStatusPill />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<ArchiveHome />} />
              <Route path="/login" element={<ArchiveLogin />} />
              <Route path="/forgot-password" element={<ArchiveForgotPassword />} />
              <Route path="/reset-password" element={<ArchiveResetPassword />} />
              <Route path="/browse" element={<ArchiveBrowse />} />
              <Route path="/about" element={<ArchiveAbout />} />
              <Route path="/verify/:id" element={<ArchiveVerifyCertificate />} />

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
          </Suspense>
          <SpotlightSearch />
          <HomepageChatbot />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;