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
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [studentInfo, setStudentInfo] = useState({ uid: '', name: 'STUDENT', initials: 'ST', groupName: 'Your Group', adviserName: 'Your Adviser' });
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loginPrefillEmail, setLoginPrefillEmail] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Global Maintenance Mode Listener
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [showAbstractSuccess, setShowAbstractSuccess] = useState(false);
  const [isGeneratingAbstract, setIsGeneratingAbstract] = useState(false);
  const prevGeneratingRef = React.useRef(false);

  React.useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'preferences'),
      (snap) => {
        if (snap.exists() && snap.data().maintenance === true) {
          setIsMaintenanceMode(true);
        } else {
          setIsMaintenanceMode(false);
        }
      },
      (err) => {
        console.warn('System preferences listener notice (non-fatal):', err.message);
      }
    );
    return () => unsub();
  }, []);

  // Presence Tracking
  React.useEffect(() => {
    const updatePresence = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Update presence in students collection (primary student document)
        await setDoc(doc(db, 'students', user.uid), {
          lastActive: serverTimestamp()
        }, { merge: true }).catch(() => {});

        // 2. Ensure/update users collection for cross-portal presence tracking (ChatWidget)
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef).catch(() => null);
        if (userSnap && userSnap.exists()) {
          await updateDoc(userRef, {
            lastActive: serverTimestamp()
          }).catch(() => {});
        } else {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            role: 'student',
            lastActive: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.warn('Presence ping notice (non-fatal):', e?.message || e);
      }
    };
    
    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, []);

  // Persistent AI Abstract listener for student's submission (keeps indicator visible across tab switches)
  React.useEffect(() => {
    if (!studentInfo?.uid) return;
    const lookupUid = (studentInfo.role === 'member' && studentInfo.leaderUid) ? studentInfo.leaderUid : studentInfo.uid;
    if (!lookupUid) return;

    const subQ = query(collection(db, 'submissions'), where('studentUid', '==', lookupUid));
    const unsub = onSnapshot(subQ, (snapshot) => {
      if (!snapshot.empty) {
        const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        subs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        const latest = subs[0];
        const generating = !!latest.abstractGenerating;

        if (prevGeneratingRef.current && !generating && latest.abstract) {
          setShowAbstractSuccess(true);
          const t = setTimeout(() => setShowAbstractSuccess(false), 5000);
          return () => clearTimeout(t);
        }

        prevGeneratingRef.current = generating;
        setIsGeneratingAbstract(generating);
      } else {
        setIsGeneratingAbstract(false);
      }
    }, (err) => {
      console.warn('Submissions listener notice in App.jsx:', err.message);
    });

    return () => unsub();
  }, [studentInfo?.uid, studentInfo?.leaderUid, studentInfo?.role]);

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
    let studentUnsub = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const path = window.location.pathname;
      const isInviteRoute = path.includes('signup') || path.includes('student-activate') || window.location.search.includes('token');

      if (user) {
        setAuthUser(user);
        if (isInviteRoute) {
          window.history.replaceState({}, '', '/student/');
        }

        try {
          const processStudentData = (studentData = {}) => {
            const displayName = studentData.displayName ||
              (studentData.firstName ? `${studentData.firstName} ${studentData.lastName || ''}`.trim() : null) ||
              user.displayName ||
              user.email?.split('@')[0] ||
              'Student';

            const groupName = studentData.groupName || studentData.groupMembers?.groupName || 'Your Group';
            const adviserName = studentData.invitedByName || studentData.groupMembers?.invitedByName || 'Your Adviser';
            const profilePhotoUrl = studentData.profilePhotoUrl || null;
            const role = studentData.role || 'student';
            const groupStatus = studentData.groupStatus || studentData.groupMembers?.groupStatus || 'approved';
            const initials = displayName.substring(0, 2).toUpperCase();

            setStudentInfo({
              uid: user.uid,
              name: displayName,
              initials,
              groupName,
              adviserName,
              profilePhotoUrl,
              role,
              groupStatus
            });

            setCurrentPage((prev) => {
              if (prev === 'login' || prev === 'activate' || prev === 'signup') {
                return 'dashboard';
              }
              return prev;
            });

            if (groupStatus === 'pending') {
              setActiveTab('Dashboard');
            }

            setIsInitializing(false);
          };

          // 1. Listen directly to doc with ID == user.uid
          const stdDocRef = doc(db, 'students', user.uid);
          studentUnsub = onSnapshot(stdDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              processStudentData(docSnap.data());
            } else {
              // Fallback: search by uid or email query if document was saved with random ID
              try {
                const qUid = query(collection(db, 'students'), where('uid', '==', user.uid));
                const snapUid = await getDocs(qUid);
                if (!snapUid.empty) {
                  processStudentData(snapUid.docs[0].data());
                } else {
                  const qEmail = query(collection(db, 'students'), where('email', '==', user.email?.toLowerCase().trim()));
                  const snapEmail = await getDocs(qEmail);
                  if (!snapEmail.empty) {
                    processStudentData(snapEmail.docs[0].data());
                  } else {
                    processStudentData({});
                  }
                }
              } catch (qErr) {
                console.warn('Fallback student query notice:', qErr.message);
                processStudentData({});
              }
            }
          }, (err) => {
            console.error("Student snapshot error:", err);
            processStudentData({});
          });

        } catch (error) {
          console.error("Error restoring session:", error);
          setCurrentPage('dashboard');
          setIsInitializing(false);
        }
      } else {
        setAuthUser(null);
        if (studentUnsub) {
          studentUnsub();
          studentUnsub = null;
        }
        if (!isInviteRoute) {
          setCurrentPage('login');
        }
        setIsInitializing(false);
      }
    });

    return () => {
      unsubscribe();
      if (studentUnsub) studentUnsub();
    };
  }, []);

  const handlePageSwitch = (pageName, data = null) => {
    if (pageName === 'dashboard') {
      window.history.replaceState({}, '', '/student/');
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
      if (studentInfo?.uid) {
        try {
          await updateDoc(doc(db, 'students', studentInfo.uid), { status: 'offline' });
          await updateDoc(doc(db, 'users', studentInfo.uid), { status: 'offline' });
        } catch (err) {
          console.error("Failed to update status on logout:", err);
        }
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
      {currentPage === 'login' && !authUser && !isInitializing && (
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
      {((authUser && currentPage === 'login') || ['dashboard', 'manuscript', 'requirements', 'progress', 'mygroup', 'settings'].includes(currentPage)) && (
        <>
          <div style={{ display: (currentPage === 'dashboard' || currentPage === 'login') ? 'block' : 'none' }}>
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

          {/* PERSISTENT FLOATING AI ABSTRACT GENERATION INDICATOR (naas ubos) */}
          {isGeneratingAbstract && (
            <div className="fixed bottom-6 right-6 z-[9999] bg-[#7B1F35] dark:bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 dark:border-stone-700 flex items-center gap-3 animate-fade-in pointer-events-auto">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
              <div>
                <p className="text-[13px] font-bold leading-tight flex items-center gap-1.5">
                  <span>✨</span> AI is reading your PDF...
                </p>
                <p className="text-[11px] text-white/80 dark:text-stone-300">
                  Generating abstract in the background
                </p>
              </div>
            </div>
          )}

          {showAbstractSuccess && (
            <div className="fixed bottom-6 right-6 z-[9999] bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-fade-in pointer-events-auto">
              <svg className="w-5 h-5 text-emerald-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="text-[13px] font-bold leading-tight">AI Abstract Generated!</p>
                <p className="text-[11px] text-emerald-100">Abstract has been updated in Manuscript.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
