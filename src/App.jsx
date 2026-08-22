import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Only the login page loads immediately — everything else is lazy
import UnifiedLogin from './pages/UnifiedLogin';
import DeanActivate from './pages/DeanActivate';

// Lazy-load each sub-app so the browser downloads only the portal the user needs
const AdminApp = React.lazy(() => import('./admin/App'));
const DeanApp = React.lazy(() => import('./dean/App'));
const AdviserApp = React.lazy(() => import('./adviser/App'));
const StudentApp = React.lazy(() => import('./student/App'));

// Shared loading spinner shown while a sub-app chunk downloads
const PortalLoader = () => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-[#FDF9ED]">
    <div className="w-12 h-12 border-4 border-[#7B1F35]/30 border-t-[#7B1F35] rounded-full animate-spin mb-4"></div>
    <p className="text-[#7B1F35] font-serif text-sm font-semibold tracking-wider">LOADING ARCHIVIO...</p>
  </div>
);

function App() {
  return (
    <Router>
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

          {/* Catch all redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;