import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

        // Fetch dean profile from Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setDeanData(userDocSnap.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }

        // Listen to dean settings
        import('firebase/firestore').then(({ onSnapshot }) => {
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
          });
        });
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
