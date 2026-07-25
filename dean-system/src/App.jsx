import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { UserProvider } from './context/UserContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResearchRecords from './pages/ResearchRecords';
import PublishQueue from './pages/PublishQueue';
import Requirements from './pages/Requirements';
import Invitations from './pages/Invitations';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import './App.css';

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes - Only accessible if user is logged in */}
        {user ? (
          <Route
            path="/*"
            element={
              <UserProvider>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/research-records" element={<ResearchRecords />} />
                  <Route path="/publish-queue" element={<PublishQueue />} />
                  <Route path="/requirements" element={<Requirements />} />
                  <Route path="/invitations" element={<Invitations />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </UserProvider>
            }
          />
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;