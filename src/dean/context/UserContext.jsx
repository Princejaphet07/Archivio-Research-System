import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [deanData, setDeanData] = useState(null);
  const [deanSettings, setDeanSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settingsUnsub = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Fetch dean profile from Firestore:
        // 1. Try 'deans' collection first (by email or uid)
        // 2. Try 'users' collection
        // 3. Fallback to 'advisers' collection
        try {
          let profile = null;

          // Check deans collection (direct doc, email query, uid query)
          const deansDirectSnap = await getDoc(doc(db, 'deans', firebaseUser.uid));
          if (deansDirectSnap.exists()) {
            profile = { ...deansDirectSnap.data(), docId: deansDirectSnap.id };
          } else {
            const deansEmailQuery = query(collection(db, 'deans'), where('email', '==', firebaseUser.email));
            const deansEmailSnap = await getDocs(deansEmailQuery);
            if (!deansEmailSnap.empty) {
              const dDoc = deansEmailSnap.docs[0];
              profile = { ...dDoc.data(), docId: dDoc.id };
            } else {
              const deansUidQuery = query(collection(db, 'deans'), where('uid', '==', firebaseUser.uid));
              const deansUidSnap = await getDocs(deansUidQuery);
              if (!deansUidSnap.empty) {
                const dDoc = deansUidSnap.docs[0];
                profile = { ...dDoc.data(), docId: dDoc.id };
              }
            }
          }

          // Check users collection if not found in deans
          if (!profile) {
            const usersQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const usersSnap = await getDocs(usersQuery);
            if (!usersSnap.empty) {
              const uDoc = usersSnap.docs[0];
              profile = { ...uDoc.data(), docId: uDoc.id };
            } else {
              const userDirectSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (userDirectSnap.exists()) {
                profile = { ...userDirectSnap.data(), docId: userDirectSnap.id };
              }
            }
          }

          // Fallback to advisers collection
          if (!profile) {
            const advisersQuery = query(collection(db, 'advisers'), where('email', '==', firebaseUser.email));
            const advisersSnap = await getDocs(advisersQuery);
            if (!advisersSnap.empty) {
              const aDoc = advisersSnap.docs[0];
              profile = { ...aDoc.data(), docId: aDoc.id };
            }
          }

          setDeanData(profile);
        } catch (error) {
          console.error('Error fetching dean data:', error);
        }

        // Listen to dean settings
        try {
          settingsUnsub = onSnapshot(doc(db, 'dean_settings', firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setDeanSettings(docSnap.data());
            } else {
              // Defaults if document doesn't exist
              setDeanSettings({
                emailTemplates: {
                  adviserInvitation: {
                    subject: "You're Invited to Join ARCHIVIO — SWU PHINMA Research Management System",
                    body: "Dear [Adviser Name],\n\nYou have been invited to join ARCHIVIO — the Web-Based Digital Research Archive Management System of Southwestern University PHINMA.\n\nAs a Research Adviser, you will be able to:\n• Manage your assigned student research groups\n• Review and evaluate submitted manuscripts\n• Track submission requirements and completion status\n• Approve and forward papers to the Dean for publication\n\nPlease click the button below to activate your account and set up your credentials."
                  }
                },
                schoolYear: 'SY 2026-2027',
                notifications: {
                  researchUpdates: true,
                  adviserAlerts: true,
                  publicationNotifs: true,
                  systemAnnouncements: false,
                  emailNotifs: true
                }
              });
            }
          }, (err) => {
            console.warn('Dean settings listener notice:', err.message);
          });
        } catch (e) {
          console.error('Error subscribing to dean settings:', e);
        }
      } else {
        setUser(null);
        setDeanData(null);
        setDeanSettings(null);
        if (settingsUnsub) settingsUnsub();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (settingsUnsub) settingsUnsub();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, deanData, deanSettings, loading }}>
      {children}
    </UserContext.Provider>
  );
};
