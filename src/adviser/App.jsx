import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase/config';

// Auth Pages
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { AdviserProvider } from './context/AdviserContext';

// Main App Pages
import Dashboard from './pages/Dashboard';
import MyGroups from './pages/MyGroups';
import ReviewSubmissions from './pages/ReviewSubmissions';
import ResearchCategories from './pages/ResearchCategories';
import GroupRegistrations from './pages/GroupRegistrations';
import SendInvitations from './pages/SendInvitations';
import SubmissionRequirements from './pages/SubmissionRequirements';
import MyProfile from './pages/MyProfile';

function App() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists() && snap.data().maintenance === true) {
        setIsMaintenanceMode(true);
      } else {
        setIsMaintenanceMode(false);
      }
    });
    return () => unsub();
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

  return (
      <Routes>
        <Route path="/" element={<Navigate to="/adviser/dashboard" replace />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/adviser-activate" element={<ActivateAccount />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/*" element={
          <AdviserProvider>
            <ProtectedRoute>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="my-groups" element={<MyGroups />} />
                <Route path="review-submissions" element={<ReviewSubmissions />} />
                <Route path="research-categories" element={<ResearchCategories />} />
                <Route path="group-registrations" element={<GroupRegistrations />} />
                <Route path="send-invitations" element={<SendInvitations />} />
                <Route path="submission-requirements" element={<SubmissionRequirements />} />
                <Route path="my-profile" element={<MyProfile />} />
              </Routes>
            </ProtectedRoute>
          </AdviserProvider>
        } />
      </Routes>
  );
}

export default App;
