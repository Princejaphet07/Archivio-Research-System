import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import SignUp from './pages/SignUp';
import Login from './pages/Login';

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
        
        {/* App Pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-groups" element={<MyGroups />} />
        <Route path="/review-submissions" element={<ReviewSubmissions />} />
        <Route path="/research-categories" element={<ResearchCategories />} />
        <Route path="/group-registrations" element={<GroupRegistrations />} />
        <Route path="/send-invitations" element={<SendInvitations />} />
        <Route path="/submission-requirements" element={<SubmissionRequirements />} />
        <Route path="/my-profile" element={<MyProfile />} />
      </Routes>
    </Router>
  );
}

export default App;