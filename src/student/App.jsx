import React, { useState } from 'react';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import StudentActivate from './pages/StudentActivate';
import StudentForgotPassword from './pages/StudentForgotPassword';
import StudentDashboard from './pages/StudentDashboard';

import ManuscriptPage from './pages/ManuscriptPage';
import RequirementsPage from './pages/RequirementsPage';
import ProgressPage from './pages/ProgressPage';
import MyGroupPage from './pages/MyGroupPage';
import SettingsPage from './pages/SettingsPage'; // 1. Added SettingsPage import
import { logActivity } from '../firebase/logActivity';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [studentInfo, setStudentInfo] = useState({ uid: '', name: 'STUDENT', initials: 'ST', groupName: 'Your Group', adviserName: 'Your Adviser' });
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loginPrefillEmail, setLoginPrefillEmail] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

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

  // Presence Tracking
  React.useEffect(() => {
    const updatePresence = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastActive: serverTimestamp()
          });
        } catch (e) {
          console.error('Failed to update presence', e);
        }
      }
    };
    
    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, []);

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
            let role = 'student';
            let groupStatus = 'pending';
            
            if (!snapshot.empty) {
              const studentData = snapshot.docs[0].data();
              displayName = studentData.displayName || (studentData.firstName ? studentData.firstName + ' ' + studentData.lastName : null) || displayName;
              groupName = studentData.groupName || 'Your Group';
              adviserName = studentData.invitedByName || 'Your Adviser';
              profilePhotoUrl = studentData.profilePhotoUrl || null;
              role = studentData.role || 'student';
              groupStatus = studentData.groupStatus || 'pending';
            }
            
            const initials = displayName.substring(0, 2).toUpperCase();
            setStudentInfo({ uid: user.uid, name: displayName, initials, groupName, adviserName, profilePhotoUrl, role, groupStatus });
          });
          
          // Only redirect to dashboard if they are on login or an invite route
          // Or if their group status is pending (to lock them out of other tabs)
          setCurrentPage((prev) => {
            if (prev === 'login' || prev === 'activate' || prev === 'signup' || groupStatus === 'pending') {
              return 'dashboard';
            }
            return prev;
          });
          
          if (groupStatus === 'pending') {
            setActiveTab('Dashboard');
          }
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
      if (studentInfo?.name) {
        await logActivity({
          user: studentInfo.name,
          role: 'Student',
          action: 'Log out',
          status: 'Success'
        });
      }
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };



  const handleNavigation = (tabName) => {
    // Lock access if group is still pending
    if (studentInfo.groupStatus === 'pending' && tabName !== 'Dashboard') {
      Swal.fire({
        icon: 'lock',
        title: 'Dashboard Locked',
        text: 'Your registration is still pending approval from your adviser. You cannot access this section yet.',
        confirmButtonColor: '#6B0F1A'
      });
      return;
    }

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
    <div className="w-full min-h-screen">
      {currentPage === 'login' && (
        (() => { window.location.href = '/'; return null; })()
      )}
      {currentPage === 'signup' && (
        <StudentSignup onSwitchPage={handlePageSwitch} />
      )}
      {currentPage === 'forgot-password' && (
        <StudentForgotPassword onSwitchPage={handlePageSwitch} />
      )}
      {currentPage === 'activate' && (
        <StudentActivate />
      )}
      {/* Authenticated Pages - Render together to preserve state (e.g. active uploads) when switching tabs */}
      {['dashboard', 'manuscript', 'requirements', 'progress', 'mygroup', 'settings'].includes(currentPage) && (
        <>
          <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
            <StudentDashboard
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              leaderUid={studentInfo.leaderUid}
              groupName={studentInfo.groupName}
              adviserName={studentInfo.adviserName}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
          
          <div style={{ display: currentPage === 'manuscript' ? 'block' : 'none' }}>
            <ManuscriptPage
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              leaderUid={studentInfo.leaderUid}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
          
          <div style={{ display: currentPage === 'requirements' ? 'block' : 'none' }}>
            <RequirementsPage
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              leaderUid={studentInfo.leaderUid}
              studentUid={studentInfo.uid}
              groupName={studentInfo.groupName}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
          
          <div style={{ display: currentPage === 'progress' ? 'block' : 'none' }}>
            <ProgressPage
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              leaderUid={studentInfo.leaderUid}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
          
          <div style={{ display: currentPage === 'mygroup' ? 'block' : 'none' }}>
            <MyGroupPage
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              leaderUid={studentInfo.leaderUid}
              groupName={studentInfo.groupName}
              adviserName={studentInfo.adviserName}
              studentUid={studentInfo.uid}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
          
          <div style={{ display: currentPage === 'settings' ? 'block' : 'none' }}>
            <SettingsPage
              onLogout={handleLogout}
              studentName={studentInfo.name}
              initials={studentInfo.initials}
              profilePhotoUrl={studentInfo.profilePhotoUrl}
              role={studentInfo.role}
              activeTab={activeTab}
              setActiveTab={handleNavigation}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
