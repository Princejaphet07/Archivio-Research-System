import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Only the login page loads immediately — everything else is lazy
import UnifiedLogin from './pages/UnifiedLogin';
import DeanActivate from './pages/DeanActivate';
import ResetPassword from './pages/ResetPassword';
import PublicVerifyCertificate from './pages/PublicVerifyCertificate';
import NetworkStatusPill from './components/NetworkStatusPill';

import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy-load each sub-app so the browser downloads only the portal the user needs
const AdminApp = lazyWithRetry(() => import('./admin/App'));
const DeanApp = lazyWithRetry(() => import('./dean/App'));
const AdviserApp = lazyWithRetry(() => import('./adviser/App'));
const StudentApp = lazyWithRetry(() => import('./student/App'));

// Shared loading spinner shown while a sub-app chunk downloads
const PortalLoader = ({ text }) => {
  const isPathAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const isPathDean = typeof window !== 'undefined' && window.location.pathname.startsWith('/dean');
  const isPathAdviser = typeof window !== 'undefined' && window.location.pathname.startsWith('/adviser');
  const isPathStudent = typeof window !== 'undefined' && window.location.pathname.startsWith('/student');

  let label = text;
  if (!label) {
    if (isPathAdmin) label = 'LOADING ADMIN...';
    else if (isPathDean) label = 'LOADING DEAN...';
    else if (isPathAdviser) label = 'LOADING ADVISER...';
    else if (isPathStudent) label = 'LOADING STUDENT...';
    else label = 'LOADING ARCHIVIO...';
  }

  return (
    <div className="w-full h-screen min-h-screen flex flex-col items-center justify-center bg-[#FDF9ED] dark:bg-stone-900 transition-colors">
      <div className="w-12 h-12 border-4 border-[#7B1F35]/30 dark:border-[#f8d070]/30 border-t-[#7B1F35] dark:border-t-[#f8d070] rounded-full animate-spin mb-4"></div>
      <p className="text-[#7B1F35] dark:text-[#f8d070] font-serif text-sm font-semibold tracking-wider uppercase">
        {label}
      </p>
    </div>
  );
};

function App() {
  return (
    <Router>
      <NetworkStatusPill />
      <Suspense fallback={<PortalLoader />}>
        <Routes>
          {/* The Unified Login Page */}
          <Route path="/" element={<UnifiedLogin />} />

          {/* Sub-Apps — each downloads its own JS chunk on demand */}
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/dean/*" element={<DeanApp />} />
          <Route path="/adviser/*" element={<AdviserApp />} />
          
          {/* Student App */}
          <Route path="/student/*" element={<StudentApp />} />

          {/* Dean Activation */}
          <Route path="/dean-activate" element={<DeanActivate />} />

          {/* Password Reset (For Admin, Dean, Adviser, Student) */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public Archival Certificate Verification */}
          <Route path="/verify/:id" element={<PublicVerifyCertificate />} />

          {/* Catch all redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;