import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { UserProvider } from './context/UserContext';
import { DarkModeProvider } from './context/DarkModeContext';

// Login loads immediately
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

import { lazyWithRetry } from '../utils/lazyWithRetry';

import LoadingScreen from './components/LoadingScreen';

// Lazy-load dashboard pages
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const ResearchRecords = lazyWithRetry(() => import('./pages/ResearchRecords'));
const PublishQueue = lazyWithRetry(() => import('./pages/PublishQueue'));
const Requirements = lazyWithRetry(() => import('./pages/Requirements'));
const Invitations = lazyWithRetry(() => import('./pages/Invitations'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const UserManagement = lazyWithRetry(() => import('./pages/UserManagement'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));

const PageLoader = () => <LoadingScreen text="LOADING DEAN..." />;

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen text="LOADING DEAN..." />;
  }

  return (
      <Routes>
        {/* Redirect from old login path */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes - Only accessible if user is logged in */}
        {user ? (
          <Route
            path="/*"
            element={
              <DarkModeProvider>
                <UserProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="research-records" element={<ResearchRecords />} />
                    <Route path="publish-queue" element={<PublishQueue />} />
                    <Route path="requirements" element={<Requirements />} />
                    <Route path="invitations" element={<Invitations />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="user-management" element={<UserManagement />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="/" element={<Navigate to="/dean/dashboard" replace />} />
                  </Routes>
                  </Suspense>
                </UserProvider>
              </DarkModeProvider>
          }
          />
        ) : (
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
  );
}

export default App;
