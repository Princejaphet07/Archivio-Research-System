import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResearchRecords from './pages/ResearchRecords';
import PublishQueue from './pages/PublishQueue';
import Requirements from './pages/Requirements';
import Invitations from './pages/Invitations';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const sharedProps = { activePage, onNavigate: setActivePage };

  return (
    <>
      {activePage === 'dashboard'        && <Dashboard        {...sharedProps} />}
      {activePage === 'research-records' && <ResearchRecords  {...sharedProps} />}
      {activePage === 'publish-queue'    && <PublishQueue     {...sharedProps} />}
      {activePage === 'requirements'     && <Requirements     {...sharedProps} />}
      {activePage === 'invitations'      && <Invitations      {...sharedProps} />}
      {activePage === 'reports'          && <Reports          {...sharedProps} />}
      {activePage === 'user-management'  && <UserManagement   {...sharedProps} />}
      {activePage === 'settings'         && <Settings         {...sharedProps} />}
    </>
  );
}

export default App;