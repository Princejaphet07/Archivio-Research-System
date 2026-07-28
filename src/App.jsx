import React, { useState } from 'react';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import StudentActivate from './pages/StudentActivate';
import StudentDashboard from './pages/StudentDashboard';
import ResearchPage from './pages/ResearchPage';
import ResearchUpload from './pages/ResearchUpload';
import ManuscriptPage from './pages/ManuscriptPage';
import RequirementsPage from './pages/RequirementsPage';
import ProgressPage from './pages/ProgressPage';
import MyGroupPage from './pages/MyGroupPage';
import SettingsPage from './pages/SettingsPage'; // 1. Added SettingsPage import
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [studentInfo, setStudentInfo] = useState({ uid: '', name: 'STUDENT', initials: 'ST', groupName: 'Your Group', adviserName: 'Your Adviser' });
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loginPrefillEmail, setLoginPrefillEmail] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Check if URL has activation token or signup path
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const path = window.location.pathname;
    
    // First, check URL paths to handle invites
    if (token || path.includes('student-activate')) {
      setCurrentPage('activate');
    } else if (path.includes('signup')) {
      setCurrentPage('signup');
    }
  }, []);

  // Persist session with Firebase Auth
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const path = window.location.pathname;
      const isInviteRoute = path.includes('signup') || path.includes('student-activate') || window.location.search.includes('token');

      if (user) {
        // Clean URL if they are logged in but stuck on an invite link
        if (isInviteRoute) {
          window.history.replaceState({}, '', '/');
        }

        try {
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('uid', '==', user.uid));
          
          onSnapshot(q, (snapshot) => {
            let displayName = user.displayName || user.email?.split('@')[0] || 'Student';
            let groupName = 'Your Group';
            let adviserName = 'Your Adviser';
            let profilePhotoUrl = null;
            
            if (!snapshot.empty) {
              const studentData = snapshot.docs[0].data();
              displayName = studentData.displayName || (studentData.firstName ? studentData.firstName + ' ' + studentData.lastName : null) || displayName;
              groupName = studentData.groupName || 'Your Group';
              adviserName = studentData.invitedByName || 'Your Adviser';
              profilePhotoUrl = studentData.profilePhotoUrl || null;
            }
            
            const initials = displayName.substring(0, 2).toUpperCase();
            setStudentInfo({ uid: user.uid, name: displayName, initials, groupName, adviserName, profilePhotoUrl });
          });
          
          // Only redirect to dashboard if they are on login or an invite route
          // (This prevents forcing them to dashboard if the listener fires for other reasons)
          setCurrentPage((prev) => {
            if (prev === 'login' || prev === 'activate' || prev === 'signup') {
              return 'dashboard';
            }
            return prev;
          });
        } catch (error) {
          console.error("Error restoring session:", error);
        }
      } else {
        // Not logged in. Let them stay on invite route if they are on one.
        if (!isInviteRoute) {
          setCurrentPage('login');
        }
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePageSwitch = (pageName, data = null) => {
    if (pageName === 'login' || pageName === 'dashboard') {
      window.history.replaceState({}, '', '/');
    }
    setCurrentPage(pageName);
    if (pageName === 'login' && data?.email) {
      setLoginPrefillEmail(data.email);
    }
  };

  const handleLogin = (name = 'STUDENT', initials = 'ST', groupName = 'Your Group', adviserName = 'Your Adviser') => {
    // uid will be set by the onAuthStateChanged listener that fires right after login
    setStudentInfo(prev => ({ ...prev, name, initials, groupName, adviserName }));
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
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

  if (isInitializing) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#FDF9ED]">
        <div className="w-12 h-12 border-4 border-[#7B1F35]/30 border-t-[#7B1F35] rounded-full animate-spin mb-4"></div>
        <p className="text-[#7B1F35] font-serif text-sm font-semibold tracking-wider">LOADING STUDENT PORTAL...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {currentPage === 'login' && (
        <StudentLogin
          onSwitchPage={handlePageSwitch}
          onLogin={handleLogin}
          prefilledEmail={loginPrefillEmail}
        />
      )}
      {currentPage === 'signup' && (
        <StudentSignup onSwitchPage={handlePageSwitch} />
      )}
      {currentPage === 'activate' && (
        <StudentActivate />
      )}
      {currentPage === 'dashboard' && (
        <StudentDashboard
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          groupName={studentInfo.groupName}
          adviserName={studentInfo.adviserName}
          onUploadClick={handleUploadClick}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'manuscript' && (
        <ManuscriptPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'requirements' && (
        <RequirementsPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          studentUid={studentInfo.uid}
          groupName={studentInfo.groupName}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'progress' && (
        <ProgressPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'mygroup' && (
        <MyGroupPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          groupName={studentInfo.groupName}
          adviserName={studentInfo.adviserName}
          studentUid={studentInfo.uid}
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
          profilePhotoUrl={studentInfo.profilePhotoUrl}
          activeTab={activeTab}
          setActiveTab={handleNavigation}
        />
      )}
      {currentPage === 'research' && (
        <ResearchPage
          onLogout={handleLogout}
          studentName={studentInfo.name}
          initials={studentInfo.initials}
          profilePhotoUrl={studentInfo.profilePhotoUrl}
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
          profilePhotoUrl={studentInfo.profilePhotoUrl}
        />
      )}
    </div>
  );
}

export default App;