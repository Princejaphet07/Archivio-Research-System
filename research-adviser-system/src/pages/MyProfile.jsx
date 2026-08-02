import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

function MyProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: 'College of Information Technology',
    title: 'Prof.',
    docId: null
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserData(prev => ({ ...prev, email: user.email }));
        try {
          const q = query(collection(db, 'advisers'), where('userId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const document = querySnapshot.docs[0];
            const data = document.data();
            setUserData(prev => ({
              ...prev,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              department: data.department || 'College of Information Technology',
              title: data.title || 'Prof.',
              docId: document.id
            }));
          }
        } catch (error) {
          console.error("Error fetching adviser profile:", error);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSaveChanges = async () => {
    if (!userData.docId) return;
    setSaveStatus('Saving...');
    try {
      const adviserRef = doc(db, 'advisers', userData.docId);
      await updateDoc(adviserRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        department: userData.department,
        title: userData.title,
        displayName: `${userData.title} ${userData.firstName} ${userData.lastName}`
      });
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus('Failed to update profile.');
    }
  };

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    newSubmissions: true,
    groupRegistrations: true,
    missingRequirements: true,
    paperApproved: true,
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Layout title="My Profile" breadcrumb="ARCHIVIO › My Profile" showSearch={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your adviser account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Menu */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-5 py-4 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'profile' 
                    ? 'border-l-4 border-l-[#7a2e46] bg-[#faf5f6] text-[#7a2e46]' 
                    : 'border-l-4 border-l-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                👤 Profile
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-5 py-4 text-sm font-medium flex items-center gap-3 border-t border-gray-100 transition-colors ${
                  activeTab === 'notifications' 
                    ? 'border-l-4 border-l-[#7a2e46] bg-[#faf5f6] text-[#7a2e46]' 
                    : 'border-l-4 border-l-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                🔔 Notifications
              </button>
              <button 
                onClick={() => setActiveTab('password')}
                className={`w-full text-left px-5 py-4 text-sm font-medium flex items-center gap-3 border-t border-gray-100 transition-colors ${
                  activeTab === 'password' 
                    ? 'border-l-4 border-l-[#7a2e46] bg-[#faf5f6] text-[#7a2e46]' 
                    : 'border-l-4 border-l-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                🔒 Password
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-5 py-4 text-sm font-bold text-red-600 border-t border-gray-100 hover:bg-red-50 flex items-center gap-3 border-l-4 border-l-transparent transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {activeTab === 'profile' && 'My Profile'}
                {activeTab === 'notifications' && 'Notification Preferences'}
                {activeTab === 'password' && 'Change Password'}
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <>
                  {saveStatus && (
                    <div className={`p-3 rounded-lg text-sm mb-4 ${saveStatus.includes('success') ? 'bg-green-50 text-green-700' : saveStatus === 'Saving...' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                      {saveStatus}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">First Name</label>
                      <input type="text" value={userData.firstName} onChange={(e) => setUserData({...userData, firstName: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" disabled={loading} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Last Name</label>
                      <input type="text" value={userData.lastName} onChange={(e) => setUserData({...userData, lastName: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" disabled={loading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Institutional Email</label>
                    <input type="email" value={userData.email} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none text-gray-400" readOnly />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Department</label>
                    <input type="text" value={userData.department} onChange={(e) => setUserData({...userData, department: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" disabled={loading} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Title / Honorific</label>
                    <select value={userData.title} onChange={(e) => setUserData({...userData, title: e.target.value})} className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] w-full md:w-48 text-gray-900" disabled={loading}>
                      <option value="Prof.">Prof.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">ORGANIZATIONAL MEMBERSHIP</h3>
                        <p className="text-xs text-gray-500">Add your professional or academic organizational memberships.</p>
                      </div>
                      <button className="w-8 h-8 bg-[#7a2e46] text-white rounded-lg flex items-center justify-center font-bold hover:bg-[#5f2135]">
                        +
                      </button>
                    </div>
                    
                    <div className="border border-dashed border-gray-300 rounded-lg py-8 text-center bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">No organizational memberships added yet</p>
                      <p className="text-xs text-gray-500 mt-1">Click the + button above to add your first membership</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveChanges} disabled={loading || saveStatus === 'Saving...'} className="bg-[#7a2e46] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5f2135] disabled:opacity-50 transition">
                      {saveStatus === 'Saving...' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <>
                  {/* Info Alert */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <span className="text-blue-600 text-xl flex-shrink-0">🔔</span>
                    <p className="text-sm text-blue-800">
                      You will receive in-app notifications based on your preferences below.
                    </p>
                  </div>

                  {/* Notification Options */}
                  <div className="space-y-4">
                    {/* New submission from my groups */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">New submission from my groups</p>
                        <p className="text-xs text-gray-500">Notify when a group uploads research</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input 
                          type="checkbox" 
                          checked={notifications.newSubmissions}
                          onChange={() => toggleNotification('newSubmissions')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46]"></div>
                      </label>
                    </div>

                    {/* Group registration requests */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">Group registration requests</p>
                        <p className="text-xs text-gray-500">Notify when students request to register</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input 
                          type="checkbox" 
                          checked={notifications.groupRegistrations}
                          onChange={() => toggleNotification('groupRegistrations')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46]"></div>
                      </label>
                    </div>

                    {/* Missing requirements alerts */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">Missing requirements alerts</p>
                        <p className="text-xs text-gray-500">Remind when groups have incomplete requirements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input 
                          type="checkbox" 
                          checked={notifications.missingRequirements}
                          onChange={() => toggleNotification('missingRequirements')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46]"></div>
                      </label>
                    </div>

                    {/* Paper approved and publish */}
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">Paper approved and publish</p>
                        <p className="text-xs text-gray-500">Notify when a paper is approved by Dean</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input 
                          type="checkbox" 
                          checked={notifications.paperApproved}
                          onChange={() => toggleNotification('paperApproved')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button className="bg-[#7a2e46] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition">
                      Save Preferences
                    </button>
                  </div>
                </>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <>
                  {/* Info Alert */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <span className="text-blue-600 text-xl flex-shrink-0">🔒</span>
                    <p className="text-sm text-blue-800">
                      Your password is <span className="font-semibold">private</span> – only you have access. The System Administrator and Dean cannot view or reset your password.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] text-gray-900" 
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Password requirements:</p>
                      <p className="text-xs text-gray-600">
                        At least 8 characters · One uppercase letter · One number · One special character
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button className="bg-[#7a2e46] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition">
                      Update Password
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default MyProfile;
