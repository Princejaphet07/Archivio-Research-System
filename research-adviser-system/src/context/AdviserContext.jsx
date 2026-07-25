import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AdviserContext = createContext();

export function AdviserProvider({ children }) {
  const [adviserData, setAdviserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch global role from users collection
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }

          // Try to find adviser by email first
          const advisersCollection = collection(db, 'advisers');
          const q = query(advisersCollection, where('email', '==', currentUser.email));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            setAdviserData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          } else {
            // Try to find by userId field (set during sign-up)
            const q2 = query(advisersCollection, where('userId', '==', currentUser.uid));
            const snapshot2 = await getDocs(q2);

            if (!snapshot2.empty) {
              setAdviserData({ id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() });
            }
          }
        } catch (error) {
          console.error('Error fetching adviser data:', error);
        }
      } else {
        setAdviserData(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AdviserContext.Provider value={{ adviserData, userRole, loading, user }}>
      {children}
    </AdviserContext.Provider>
  );
}

export function useAdviser() {
  const context = useContext(AdviserContext);
  if (!context) {
    throw new Error('useAdviser must be used within AdviserProvider');
  }
  return context;
}

