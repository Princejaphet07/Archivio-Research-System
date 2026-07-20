import React, { useState } from 'react';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import StudentDashboard from './pages/StudentDashboard';
import ResearchPage from './pages/ResearchPage';
import ResearchUpload from './pages/ResearchUpload';
import ManuscriptPage from './pages/ManuscriptPage';
import RequirementsPage from './pages/RequirementsPage';
import ProgressPage from './pages/ProgressPage';
import MyGroupPage from './pages/MyGroupPage';
import SettingsPage from './pages/SettingsPage'; // 1. Added SettingsPage import

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [studentInfo, setStudentInfo] = useState({ name: 'STUDENT', initials: 'JZ' });
  const [activeTab, setActiveTab] = useState('Dashboard');

  const handlePageSwitch = (pageName) => {
    setCurrentPage(pageName);
  };

  const handleLogin = (name = 'STUDENT', initials = 'JZ') => {
    setStudentInfo({ name, initials });
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentPage('login');
  };

  const handleUploadClick = () => {
    setCurrentPage('upload');
  };

  const handleBackToResearch = () => {
    setCurrentPage('research');
  };

  const handleNavigation = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'Dashboard') {
      setCurrentPage('dashboard');
    } else if (tabName === 'Manuscript') {
      setCurrentPage('manuscript');
    } else if (tabName === 'Requirements') {
      setCurrentPage('requirements');
    } else if (tabName === 'Progress') {
      setCurrentPage('progress');
    } else if (tabName === 'My Group') {
      setCurrentPage('mygroup'); 
    } else if (tabName === 'Settings') { // 2. Added routing logic for Settings
      setCurrentPage('settings'); 
    } else if (tabName === 'Research') {
      setCurrentPage('research');
    }
  };

  return (
    <div className="w-full min-h-screen">
      {currentPage === 'login' && (
        <StudentLogin
          onSwitchPage={handlePageSwitch}
          onLogin={handleLogin}
        />
      )}
      {currentPage === 'signup' && (
        <StudentSignup onSwitchPage={handlePageSwitch} />
      )}
      {currentPage === 'dashboard' && (
        <StudentDashboard
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          onUploadClick={handleUploadClick}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'manuscript' && (
        <ManuscriptPage
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'requirements' && (
        <RequirementsPage
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'progress' && (
        <ProgressPage
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'mygroup' && (
        <MyGroupPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {/* 3. Added the SettingsPage component to the render list */}
      {currentPage === 'settings' && (
        <SettingsPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'research' && (
        <ResearchPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          onUploadClick={handleUploadClick}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'upload' && (
        <ResearchUpload
          onBackToResearch={handleBackToResearch}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
        />
      )}
    </div>
  );
}

export default App;