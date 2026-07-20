import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeanOnboarding from './pages/DeanOnboarding';
import DepartmentsPrograms from './pages/DepartmentsPrograms';
import AllUsers from './pages/AllUsers';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import Settings from './pages/Settings'; // <-- New import

function App() {
  return (
    <Router>
      <Routes>
        {/* Default Route: Login Page */}
        <Route path="/" element={<Login />} />

        {/* Main */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dean-onboarding" element={<DeanOnboarding />} />
        <Route path="/departments" element={<DepartmentsPrograms />} />

        {/* Monitoring */}
        <Route path="/all-users" element={<AllUsers />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/reports" element={<Reports />} />
        
        {/* System */}
        <Route path="/settings" element={<Settings />} /> {/* <-- New Route */}
      </Routes>
    </Router>
  );
}

export default App;