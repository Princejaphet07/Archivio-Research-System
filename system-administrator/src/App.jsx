import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { AcademicYearProvider } from './context/AcademicYearContext';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import AllUsers from './pages/AllUsers';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SuperAdminSettings from './pages/SuperAdminSettings';

function App() {
  return (
    <UserProvider>
      <AcademicYearProvider>
        <Router>
          <Routes>
          {/* Default Route: Login Page */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Main */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/user-management" element={<UserManagement />} />

          {/* Monitoring */}
          <Route path="/all-users" element={<AllUsers />} />
          <Route path="/activity-logs" element={<ActivityLogs />} />
          <Route path="/reports" element={<Reports />} />
          
          {/* System */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/super-admin-settings" element={<SuperAdminSettings />} />
        </Routes>
      </Router>
      </AcademicYearProvider>
    </UserProvider>
  );
}

export default App;