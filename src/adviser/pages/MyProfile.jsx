import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logActivity } from '../../firebase/logActivity';
import Layout from '../components/Layout';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, updateDoc, setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';

function MyProfile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: 'College of Information Technology',
    title: 'Prof.',
    docId: null,
    memberships: []
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Organizational Membership Modal State
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [membershipForm, setMembershipForm] = useState({
    organizationName: '',
    role: '',
    yearJoined: ''
  });
  const [membershipErrors, setMembershipErrors] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserData(prev => ({ ...prev, email: user.email }));
        try {
          let foundDocId = null;
          let foundData = null;

          // 1. Try finding in 'advisers' by userId == user.uid
          const q1 = query(collection(db, 'advisers'), where('userId', '==', user.uid));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            foundDocId = snap1.docs[0].id;
            foundData = snap1.docs[0].data();
          }

          // 2. If not found, try finding in 'advisers' by email
          if (!foundData && user.email) {
            const q2 = query(collection(db, 'advisers'), where('email', '==', user.email));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) {
              foundDocId = snap2.docs[0].id;
              foundData = snap2.docs[0].data();
            }
          }

          // 3. Fallback to direct 'users' document
          if (!foundData) {
            const uSnap = await getDoc(doc(db, 'users', user.uid));
            if (uSnap.exists()) {
              foundData = uSnap.data();
            }
          }

          if (foundData) {
            setUserData(prev => ({
              ...prev,
              firstName: foundData.firstName || foundData.displayName?.split(' ')[0] || '',
              lastName: foundData.lastName || foundData.displayName?.split(' ').slice(1).join(' ') || '',
              department: foundData.department || 'College of Information Technology',
              title: foundData.title || 'Prof.',
              docId: foundDocId,
              memberships: Array.isArray(foundData.memberships) ? foundData.memberships : []
            }));
          }
        } catch (error) {
          console.error("Error fetching adviser profile:", error);
        }
      } else {
        navigate('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Organizational Membership Handlers
  const handleOpenMembershipModal = () => {
    setMembershipForm({ organizationName: '', role: '', yearJoined: '' });
    setMembershipErrors({});
    setShowMembershipModal(true);
  };

  const handleAddMembership = (e) => {
    e.preventDefault();
    const errors = {};
    if (!membershipForm.organizationName?.trim()) {
      errors.organizationName = 'Organization name is required';
    }
    if (Object.keys(errors).length > 0) {
      setMembershipErrors(errors);
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      organizationName: membershipForm.organizationName.trim(),
      role: membershipForm.role?.trim() || '',
      yearJoined: membershipForm.yearJoined?.trim() || ''
    };

    setUserData(prev => ({
      ...prev,
      memberships: [...(prev.memberships || []), newItem]
    }));
    setShowMembershipModal(false);
  };

  const handleDeleteMembership = async (id) => {
    const res = await Swal.fire({
      title: 'Remove membership?',
      text: 'Are you sure you want to remove this organizational membership?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7a2e46',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove'
    });

    if (res.isConfirmed) {
      setUserData(prev => ({
        ...prev,
        memberships: (prev.memberships || []).filter(m => m.id !== id)
      }));
    }
  };

  const handleSaveChanges = async () => {
    setSaveStatus('Saving...');
    try {
      const payload = {
        firstName: userData.firstName?.trim() || '',
        lastName: userData.lastName?.trim() || '',
        department: userData.department || 'College of Information Technology',
        title: userData.title || 'Prof.',
        memberships: userData.memberships || [],
        displayName: `${userData.title || 'Prof.'} ${userData.firstName?.trim() || ''} ${userData.lastName?.trim() || ''}`.trim(),
        updatedAt: new Date().toISOString()
      };

      // 1. Update advisers collection
      if (userData.docId) {
        const adviserRef = doc(db, 'advisers', userData.docId);
        await updateDoc(adviserRef, payload);
      } else if (auth.currentUser?.uid) {
        await setDoc(doc(db, 'advisers', auth.currentUser.uid), {
          ...payload,
          email: auth.currentUser.email,
          userId: auth.currentUser.uid
        }, { merge: true });
      }

      // 2. Also sync to users collection
      if (auth.currentUser?.uid) {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid), payload, { merge: true });
        } catch (err) {
          console.warn('Could not sync to users document:', err);
        }
      }

      setSaveStatus('Profile updated successfully!');
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated',
        text: 'Your profile and organizational memberships have been saved.',
        confirmButtonColor: '#7a2e46',
        timer: 2000,
        showConfirmButton: false
      });
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveStatus('Failed to update profile.');
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update profile.',
        confirmButtonColor: '#7a2e46'
      });
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
      const email = auth.currentUser?.email;
      if (email) {
        await logActivity({
          user: `${userData.firstName} ${userData.lastName}`.trim() || email,
          role: 'Adviser',
          action: 'Log out',
          status: 'Success'
        });
      }
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
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
        <SectionTitle sub="Manage your adviser account and preferences">
          My Profile
        </SectionTitle>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
          {/* Mobile Tab Strip (Horizontal) */}
          <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-stone-100 dark:bg-stone-900/80 rounded-xl border border-stone-200 dark:border-stone-800">
            <button 
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-stone-800 text-[#7a2e46] dark:text-[#f8d070] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <span>👤</span>
              <span>Profile</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'notifications'
                  ? 'bg-white dark:bg-stone-800 text-[#7a2e46] dark:text-[#f8d070] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <span>🔔</span>
              <span>Alerts</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 min-w-[90px] py-2.5 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'password'
                  ? 'bg-white dark:bg-stone-800 text-[#7a2e46] dark:text-[#f8d070] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <span>🔒</span>
              <span>Security</span>
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              className="py-2.5 px-3 text-xs font-bold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center gap-1"
            >
              <span>🚪</span>
              <span>Exit</span>
            </button>
          </div>

          {/* Desktop Sidebar Menu */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <Card glass={true} className="overflow-hidden rounded-2xl">
              <button 
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-5 py-4 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'profile' 
                    ? 'border-l-4 border-l-[#7a2e46] dark:border-l-[#f8d070] bg-[#faf5f6] dark:bg-stone-950 text-[#7a2e46] dark:text-[#f8d070]' 
                    : 'border-l-4 border-l-transparent text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'
                }`}
              >
                👤 Profile
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-5 py-4 text-sm font-medium flex items-center gap-3 border-t border-gray-100 dark:border-stone-800 transition-colors ${
                  activeTab === 'notifications' 
                    ? 'border-l-4 border-l-[#7a2e46] dark:border-l-[#f8d070] bg-[#faf5f6] dark:bg-stone-950 text-[#7a2e46] dark:text-[#f8d070]' 
                    : 'border-l-4 border-l-transparent text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'
                }`}
              >
                🔔 Notifications
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('password')}
                className={`w-full text-left px-5 py-4 text-sm font-medium flex items-center gap-3 border-t border-gray-100 dark:border-stone-800 transition-colors ${
                  activeTab === 'password' 
                    ? 'border-l-4 border-l-[#7a2e46] dark:border-l-[#f8d070] bg-[#faf5f6] dark:bg-stone-950 text-[#7a2e46] dark:text-[#f8d070]' 
                    : 'border-l-4 border-l-transparent text-gray-600 dark:text-stone-400 hover:bg-gray-50 dark:hover:bg-stone-800'
                }`}
              >
                🔒 Password
              </button>
              <button 
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-5 py-4 text-sm font-bold text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-stone-800 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 border-l-4 border-l-transparent transition-colors"
              >
                🚪 Logout
              </button>
            </Card>
          </div>

          {/* Form Content */}
          <Card glass={true} className="flex-1 rounded-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-stone-800">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-stone-100">
                {activeTab === 'profile' && 'My Profile'}
                {activeTab === 'notifications' && 'Notification Preferences'}
                {activeTab === 'password' && 'Change Password'}
              </h2>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <>
                  {saveStatus && (
                    <div className={`p-3 rounded-lg text-sm mb-4 ${saveStatus.includes('success') ? 'bg-green-50 text-green-700' : saveStatus === 'Saving...' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                      {saveStatus}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">First Name</label>
                      <input type="text" value={userData.firstName} onChange={(e) => setUserData({...userData, firstName: e.target.value})} className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" disabled={loading} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Last Name</label>
                      <input type="text" value={userData.lastName} onChange={(e) => setUserData({...userData, lastName: e.target.value})} className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" disabled={loading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Institutional Email</label>
                    <input type="email" value={userData.email} className="w-full bg-gray-50 dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none text-gray-400 dark:text-stone-500" readOnly />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Department</label>
                    <input type="text" value={userData.department} onChange={(e) => setUserData({...userData, department: e.target.value})} className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" disabled={loading} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Title / Honorific</label>
                    <select value={userData.title} onChange={(e) => setUserData({...userData, title: e.target.value})} className="bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] w-full sm:w-48 text-gray-900 dark:text-stone-100" disabled={loading}>
                      <option value="Prof.">Prof.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                    </select>
                  </div>

                  <div className="pt-5 sm:pt-6 border-t border-gray-100 dark:border-stone-800">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-stone-100 uppercase tracking-wider">ORGANIZATIONAL MEMBERSHIP</h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Add your professional or academic memberships.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleOpenMembershipModal}
                        className="w-8 h-8 bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 rounded-lg flex items-center justify-center font-bold hover:bg-[#5f2135] dark:hover:bg-[#ffe090] transition shadow-sm"
                        title="Add Organizational Membership"
                      >
                        +
                      </button>
                    </div>
                    
                    {(!userData.memberships || userData.memberships.length === 0) ? (
                      <div className="border border-stone-200 dark:border-stone-800 rounded-xl py-6 sm:py-8 text-center bg-gray-50/50 dark:bg-stone-900/40">
                        <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-stone-300">No organizational memberships added yet</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400 mt-1">Click the + button above to add your first membership</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userData.memberships.map((item) => (
                          <div 
                            key={item.id} 
                            className="bg-gray-50/70 dark:bg-stone-800/60 border border-gray-200 dark:border-stone-700 rounded-xl p-4 flex items-center justify-between hover:border-[#7a2e46]/40 dark:hover:border-[#f8d070]/40 transition group"
                          >
                            <div className="space-y-1">
                              <h5 className="text-sm font-bold text-gray-900 dark:text-stone-100">
                                {item.organizationName}
                              </h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-stone-400">
                                {item.role && (
                                  <span className="px-2 py-0.5 bg-gray-200/80 dark:bg-stone-700 rounded text-gray-700 dark:text-stone-300 font-medium">
                                    {item.role}
                                  </span>
                                )}
                                {item.yearJoined && (
                                  <span>Joined: <strong className="font-semibold text-gray-700 dark:text-stone-300">{item.yearJoined}</strong></span>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteMembership(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              title="Remove Membership"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <PremiumButton onClick={handleSaveChanges} disabled={loading || saveStatus === 'Saving...'} variant="primary" className="w-full sm:w-auto">
                      {saveStatus === 'Saving...' ? 'Saving...' : 'Save Changes'}
                    </PremiumButton>
                  </div>
                </>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <>
                  {/* Info Alert */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
                    <span className="text-blue-600 text-xl flex-shrink-0">🔔</span>
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
                      You will receive in-app notifications based on your preferences below.
                    </p>
                  </div>

                  {/* Notification Options */}
                  <div className="space-y-4">
                    {/* New submission from my groups */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-stone-800">
                      <div className="flex-1 pr-3">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-stone-100 mb-0.5">New submission from my groups</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Notify when a group uploads research</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={notifications.newSubmissions}
                          onChange={() => toggleNotification('newSubmissions')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-stone-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 dark:peer-focus:ring-[#f8d070]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-stone-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-stone-200 after:border-gray-300 dark:after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46] dark:peer-checked:bg-[#f8d070]"></div>
                      </label>
                    </div>

                    {/* Group registration requests */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-stone-800">
                      <div className="flex-1 pr-3">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-stone-100 mb-0.5">Group registration requests</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Notify when students request to register</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={notifications.groupRegistrations}
                          onChange={() => toggleNotification('groupRegistrations')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-stone-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 dark:peer-focus:ring-[#f8d070]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-stone-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-stone-200 after:border-gray-300 dark:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46] dark:peer-checked:bg-[#f8d070]"></div>
                      </label>
                    </div>

                    {/* Missing requirements alerts */}
                    <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-stone-800">
                      <div className="flex-1 pr-3">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-stone-100 mb-0.5">Missing requirements alerts</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Remind when groups have incomplete requirements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={notifications.missingRequirements}
                          onChange={() => toggleNotification('missingRequirements')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-stone-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 dark:peer-focus:ring-[#f8d070]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-stone-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-stone-200 after:border-gray-300 dark:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46] dark:peer-checked:bg-[#f8d070]"></div>
                      </label>
                    </div>

                    {/* Paper approved and publish */}
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1 pr-3">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-stone-100 mb-0.5">Paper approved and publish</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Notify when a paper is approved by Dean</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={notifications.paperApproved}
                          onChange={() => toggleNotification('paperApproved')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-stone-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7a2e46]/20 dark:peer-focus:ring-[#f8d070]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-checked:after:border-stone-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-stone-200 after:border-gray-300 dark:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a2e46] dark:peer-checked:bg-[#f8d070]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <PremiumButton variant="primary" className="w-full sm:w-auto">
                      Save Preferences
                    </PremiumButton>
                  </div>
                </>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <>
                  {/* Info Alert */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
                    <span className="text-blue-600 text-xl flex-shrink-0">🔒</span>
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
                      Your password is <span className="font-semibold">private</span> – only you have access. The System Administrator and Dean cannot view or reset your password.
                    </p>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" 
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] text-gray-900 dark:text-stone-100" 
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 dark:bg-stone-800/60 border border-gray-200 dark:border-stone-700 rounded-xl p-3.5 sm:p-4">
                      <p className="text-xs font-semibold text-gray-700 dark:text-stone-300 mb-1">Password requirements:</p>
                      <p className="text-[11px] sm:text-xs text-gray-600 dark:text-stone-400 leading-relaxed">
                        At least 8 characters · One uppercase letter · One number · One special character
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <PremiumButton variant="primary" className="w-full sm:w-auto">
                      Update Password
                    </PremiumButton>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      {/* Add Organizational Membership Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in duration-150">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mb-1">Add Organizational Membership</h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mb-6">Enter details of your professional or academic membership.</p>
            
            <form onSubmit={handleAddMembership} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wider">ORGANIZATION NAME *</label>
                <input 
                  type="text" 
                  value={membershipForm.organizationName}
                  onChange={e => {
                    setMembershipForm({ ...membershipForm, organizationName: e.target.value });
                    if (membershipErrors.organizationName) setMembershipErrors({ ...membershipErrors, organizationName: null });
                  }}
                  className={`w-full bg-stone-50 dark:bg-stone-900/60 border ${membershipErrors.organizationName ? 'border-red-500' : 'border-stone-200 dark:border-stone-700'} rounded-lg p-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]`}
                  placeholder="e.g. Philippine Computer Society"
                />
                {membershipErrors.organizationName && (
                  <p className="text-xs text-red-500 mt-1">{membershipErrors.organizationName}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wider">ROLE / POSITION</label>
                <input 
                  type="text" 
                  value={membershipForm.role}
                  onChange={e => setMembershipForm({ ...membershipForm, role: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-lg p-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]"
                  placeholder="e.g. Member, Chairperson"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wider">YEAR JOINED</label>
                <input 
                  type="text" 
                  value={membershipForm.yearJoined}
                  onChange={e => setMembershipForm({ ...membershipForm, yearJoined: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700 rounded-lg p-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]"
                  placeholder="e.g. 2021"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-stone-100 dark:border-stone-700/50">
                <button 
                  type="button" 
                  onClick={() => setShowMembershipModal(false)} 
                  className="px-5 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-700 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-lg bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 text-sm font-bold hover:bg-[#5f2135] dark:hover:bg-[#ffe090] transition shadow-sm"
                >
                  Add Membership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default MyProfile;
