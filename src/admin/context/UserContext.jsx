import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  // currentUser shape: { uid, email, displayName, role, moduleAccess }
  // role: 'admin' | 'super-admin'
  // moduleAccess: { dashboard, reports, allUsers, activityLogs }

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
