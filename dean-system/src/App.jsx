import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase/config';
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
  const [isMaintenanceMode, setIsMaintenanceMode] = React.useState(false);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists() && snap.data().maintenance === true) {
        setIsMaintenanceMode(true);
      } else {
        setIsMaintenanceMode(false);
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    // Check if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-6">🛠️</span>
        <h1 className="text-3xl font-serif font-bold text-[#801e38] mb-4">System Under Maintenance</h1>
        <p className="text-stone-600 max-w-md mx-auto">
          ARCHIVIO is currently undergoing scheduled maintenance and updates. 
          Please check back later. We apologize for the inconvenience.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fcfbfa]">
        <div className="w-12 h-12 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-[#7a1f3d] tracking-widest uppercase">Loading ARCHIVIO</p>
      </div>
    );
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