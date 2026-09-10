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

// Lazy-load dashboard pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ResearchRecords = React.lazy(() => import('./pages/ResearchRecords'));
const PublishQueue = React.lazy(() => import('./pages/PublishQueue'));
const Requirements = React.lazy(() => import('./pages/Requirements'));
const Invitations = React.lazy(() => import('./pages/Invitations'));
const Reports = React.lazy(() => import('./pages/Reports'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Settings = React.lazy(() => import('./pages/Settings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[#fcfbfa]">
    <div className="w-10 h-10 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin"></div>
  </div>
);

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
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fcfbfa]">
        <div className="w-12 h-12 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-[#7a1f3d] tracking-widest uppercase">Loading ARCHIVIO</p>
      </div>
    );
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
