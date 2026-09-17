import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { DarkModeProvider } from './context/DarkModeContext';

// Login loads immediately (entry point for Admin)
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

import { lazyWithRetry } from '../utils/lazyWithRetry';
import LoadingScreen from './components/LoadingScreen';

// Lazy-load dashboard pages — only downloaded when navigated to
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const UserManagement = lazyWithRetry(() => import('./pages/UserManagement'));
const AllUsers = lazyWithRetry(() => import('./pages/AllUsers'));
const ActivityLogs = lazyWithRetry(() => import('./pages/ActivityLogs'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const SuperAdminSettings = lazyWithRetry(() => import('./pages/SuperAdminSettings'));

const PageLoader = () => <LoadingScreen text="LOADING ADMIN..." />;

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
