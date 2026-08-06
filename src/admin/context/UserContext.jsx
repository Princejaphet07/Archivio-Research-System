import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'admin' || userData.role === 'super-admin') {
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: userData.displayName || userData.email,
                role: userData.role,
                moduleAccess: userData.moduleAccess || {}
              });
            } else {
              // Not an admin, kick them out
              await signOut(auth);
              window.location.href = '/';
            }
          } else {
            await signOut(auth);
            window.location.href = '/';
          }
        } catch (err) {
          console.error("Auth check error:", err);
        }
      } else {
        setCurrentUser(null);
        // Only redirect if they are not on the dashboard/login root. 
        // Note: UnifiedLogin is at `/`, Admin is at `/admin/*`
        if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/') {
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
