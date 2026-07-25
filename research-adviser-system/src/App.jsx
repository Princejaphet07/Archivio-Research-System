import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import ActivateAccount from './pages/ActivateAccount';
import ProtectedRoute from './components/ProtectedRoute';

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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/adviser-activate" element={<ActivateAccount />} />
        
        {/* Protected App Pages */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/my-groups" element={<ProtectedRoute><MyGroups /></ProtectedRoute>} />
        <Route path="/review-submissions" element={<ProtectedRoute><ReviewSubmissions /></ProtectedRoute>} />
        <Route path="/research-categories" element={<ProtectedRoute><ResearchCategories /></ProtectedRoute>} />
        <Route path="/group-registrations" element={<ProtectedRoute><GroupRegistrations /></ProtectedRoute>} />
        <Route path="/send-invitations" element={<ProtectedRoute><SendInvitations /></ProtectedRoute>} />
        <Route path="/submission-requirements" element={<ProtectedRoute><SubmissionRequirements /></ProtectedRoute>} />
        <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;