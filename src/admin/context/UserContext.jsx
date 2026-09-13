import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // currentUser shape: { uid, email, displayName, role, moduleAccess }
  // role: 'admin' | 'super-admin'
  // moduleAccess: { dashboard, reports, allUsers, activityLogs }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let userData = null;
          let role = null;
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
            role = userData.role;
          }

          if (role !== 'admin' && role !== 'super-admin') {
            // Check super_admins collection by uid
            const saQuery = query(collection(db, 'super_admins'), where('uid', '==', user.uid));
            const saSnap = await getDocs(saQuery);
            if (!saSnap.empty) {
              userData = saSnap.docs[0].data();
              role = 'super-admin';
            } else {
              // Check super_admins collection by email
              const saEmailQuery = query(collection(db, 'super_admins'), where('email', '==', user.email));
              const saEmailSnap = await getDocs(saEmailQuery);
              if (!saEmailSnap.empty) {
                userData = saEmailSnap.docs[0].data();
                role = 'super-admin';
              }
            }
          }

          if (role === 'admin' || role === 'super-admin') {
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              displayName: userData?.displayName || user.displayName || user.email,
              role: role,
              moduleAccess: userData?.moduleAccess || { dashboard: true, reports: true, allUsers: true, activityLogs: true }
            });
          } else {
            // Not an admin, kick them out
            await signOut(auth);
            window.location.href = '/';
          }
        } catch (err) {
          console.error("Auth check error:", err);
        }
      } else {
        setCurrentUser(null);
        // Only redirect if they are not on the dashboard/login root or forgot password page. 
        // Note: UnifiedLogin is at `/`, Admin is at `/admin/*`
        if (
          window.location.pathname.startsWith('/admin') && 
          window.location.pathname !== '/admin/' &&
          window.location.pathname !== '/admin/forgot-password'
        ) {
           window.location.href = '/';
        }
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#e8e3d6]"><div className="w-8 h-8 border-4 border-[#801e38] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, authLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
