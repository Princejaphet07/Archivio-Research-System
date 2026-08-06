import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
        <Routes>
          {/* Default Route: Redirect to dashboard if logged in */}
          <Route path="/" element={<Dashboard />} />
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
      </AcademicYearProvider>
    </UserProvider>
  );
}

export default App;
