import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
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
          let detectedRole = null;
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            detectedRole = userDoc.data().role;
            setUserRole(detectedRole);
          }

          // Check deans collection to see if user has dean or dean+adviser role
          const deansCol = collection(db, 'deans');
          const qDeanEmail = query(deansCol, where('email', '==', currentUser.email));
          const deanSnap = await getDocs(qDeanEmail);
          let deanProfile = null;
          if (!deanSnap.empty) {
            deanProfile = deanSnap.docs[0].data();
            if (deanProfile.role === 'dean+adviser') {
              detectedRole = 'dean+adviser';
              setUserRole('dean+adviser');
            }
          } else {
            const qDeanUid = query(deansCol, where('uid', '==', currentUser.uid));
            const deanUidSnap = await getDocs(qDeanUid);
            if (!deanUidSnap.empty) {
              deanProfile = deanUidSnap.docs[0].data();
              if (deanProfile.role === 'dean+adviser') {
                detectedRole = 'dean+adviser';
                setUserRole('dean+adviser');
              }
            }
          }

          // Try to find adviser by doc ID first, then by email
          const advisersCollection = collection(db, 'advisers');
          const directAdvSnap = await getDoc(doc(db, 'advisers', currentUser.uid));
          let foundAdvDoc = null;

          if (directAdvSnap.exists()) {
            foundAdvDoc = directAdvSnap;
          } else {
            const q = query(advisersCollection, where('email', '==', currentUser.email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              foundAdvDoc = snapshot.docs[0];
            }
          }

          if (foundAdvDoc) {
            const data = foundAdvDoc.data();
            if (data.role === 'dean+adviser' || detectedRole === 'dean+adviser') {
              setUserRole('dean+adviser');
            }
            setAdviserData({ id: foundAdvDoc.id, ...data });
          } else {
            // Try to find by userId field (set during sign-up)
            const q2 = query(advisersCollection, where('userId', '==', currentUser.uid));
            const snapshot2 = await getDocs(q2);

            if (!snapshot2.empty) {
              const advDoc = snapshot2.docs[0];
              const data = advDoc.data();
              if (data.role === 'dean+adviser' || detectedRole === 'dean+adviser') {
                setUserRole('dean+adviser');
              }
              setAdviserData({ id: advDoc.id, ...data });
            } else if (detectedRole === 'dean+adviser' || deanProfile?.role === 'dean+adviser') {
              // Self-heal: Automatically create the adviser record if Dean is dual role
              const sourceData = deanProfile || (userDoc.exists() ? userDoc.data() : {});
              const newAdvData = {
                firstName: sourceData.firstName || currentUser.displayName?.split(' ')[0] || 'Dean',
                lastName: sourceData.lastName || currentUser.displayName?.split(' ').slice(1).join(' ') || 'Adviser',
                displayName: sourceData.displayName || currentUser.displayName || 'Dean & Adviser',
                email: currentUser.email.toLowerCase().trim(),
                department: sourceData.department || 'General Academics',
                programs: sourceData.programs || [],
                role: 'dean+adviser',
                status: 'active',
                userId: currentUser.uid,
                uid: currentUser.uid,
                createdAt: sourceData.createdAt || new Date().toISOString(),
                createdBy: 'system_auto_sync'
              };
              try {
                const addedRef = await addDoc(advisersCollection, newAdvData);
                setAdviserData({ id: addedRef.id, ...newAdvData });
              } catch (addErr) {
                console.error('Failed to auto-create adviser doc:', addErr);
                setAdviserData({ id: currentUser.uid, ...newAdvData });
              }
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

  const adviserName = adviserData?.displayName || (adviserData?.firstName ? `${adviserData.firstName} ${adviserData.lastName || ''}`.trim() : user?.displayName || 'Research Adviser');
  const profilePhotoUrl = adviserData?.profilePhoto || adviserData?.photoURL || user?.photoURL || null;

  return (
    <AdviserContext.Provider value={{ adviserData, userRole, loading, user, adviserName, profilePhotoUrl }}>
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

