import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { DarkModeProvider } from './context/DarkModeContext';

// Login loads immediately (entry point for Admin)
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Lazy-load dashboard pages — only downloaded when navigated to
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const AllUsers = React.lazy(() => import('./pages/AllUsers'));
const ActivityLogs = React.lazy(() => import('./pages/ActivityLogs'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const SuperAdminSettings = React.lazy(() => import('./pages/SuperAdminSettings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[#fcfbfa]">
    <div className="w-10 h-10 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <DarkModeProvider>
      <UserProvider>
        <AcademicYearProvider>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </AcademicYearProvider>
      </UserProvider>
    </DarkModeProvider>
  );
}

export default App;
