import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import the sub-apps
import AdminApp from './admin/App';
import DeanApp from './dean/App';
import AdviserApp from './adviser/App';
import StudentApp from './student/App';

import UnifiedLogin from './pages/UnifiedLogin';
import DeanActivate from './pages/DeanActivate';

function App() {
  return (
    <Router>
      <Routes>
        {/* The Unified Login Page */}
        <Route path="/" element={<UnifiedLogin />} />

        {/* Sub-Apps */}
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
    </Router>
  );
}

export default App;