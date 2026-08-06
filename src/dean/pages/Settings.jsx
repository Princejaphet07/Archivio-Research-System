import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';

export default function Settings({ activePage, onNavigate }) {
  const { user, deanData, deanSettings } = useUser();
  const [activeTab, setActiveTab] = useState('completion');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', desc: '', type: 'file', icon: '📄' });
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' });

  // School Year State
  const [schoolYears, setSchoolYears] = useState([]);
  const [showSYModal, setShowSYModal] = useState(false);
  const [showEditSYModal, setShowEditSYModal] = useState(false);
  const [currentSY, setCurrentSY] = useState({ id: '', label: '', status: 'Upcoming' });

  // Notifications State
  const [notifications, setNotifications] = useState({
    researchUpdates: true,
    adviserAlerts: true,
    publicationNotifs: true,
    systemAnnouncements: false,
    emailNotifs: true
  });

  // Security state
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    newPass: false,
    confirm: false
  });

  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    title: 'Dr.',
    memberships: [],
    publications: []
  });

  useEffect(() => {
    if (deanData) {
      setProfile({
        firstName: deanData.firstName || deanData.displayName?.split(' ')[0] || '',
        lastName: deanData.lastName || deanData.displayName?.split(' ').slice(1).join(' ') || '',
        title: deanData.title || 'Dr.',
        memberships: deanData.memberships || [],
        publications: deanData.publications || []
      });
    }
  }, [deanData]);

  useEffect(() => {
    if (deanSettings?.emailTemplates?.adviserInvitation) {
      setEmailTemplate({
        subject: deanSettings.emailTemplates.adviserInvitation.subject || '',
        body: deanSettings.emailTemplates.adviserInvitation.body || ''
      });
    }

    if (deanSettings?.schoolYears) {
      setSchoolYears(deanSettings.schoolYears);
    } else if (deanSettings?.schoolYear) {
      // Migrate old string format to array format
      setSchoolYears([{ id: Date.now().toString(), label: deanSettings.schoolYear, status: 'Active' }]);
    }

    if (deanSettings?.notifications) {
      setNotifications(deanSettings.notifications);
    }
  }, [deanSettings]);

  const settingsTabs = [
    { id: 'completion', icon: '📋', label: 'Completion Requirements' },
    { id: 'email', icon: '✉️', label: 'Email Templates' },
    { id: 'profile', icon: '🏛️', label: 'My Profile' },
    { id: 'schoolyear', icon: '📅', label: 'School Year' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
    { id: 'security', icon: '🔒', label: 'Security' },
  ];

  useEffect(() => {
    const q = query(collection(db, 'requirements'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequirements(allReqs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      await updateDoc(doc(db, 'requirements', reqId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      Swal.fire({ icon: 'success', title: 'Updated', text: `Requirement has been ${newStatus}.`, confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update requirement.' });
    }
  };

  const handleAddGlobalRequirement = async (e) => {
    e.preventDefault();
    try {
      // Find the highest priority to append to the end
      const globalReqs = requirements.filter(r => r.scope === 'global');
      const maxPriority = globalReqs.reduce((max, r) => Math.max(max, r.priority || 0), 0);

      await addDoc(collection(db, 'requirements'), {
        title: newReq.title,
        desc: newReq.desc,
        type: newReq.type,
        icon: newReq.icon,
        scope: 'global',
        status: 'approved',
        priority: maxPriority + 1,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewReq({ title: '', desc: '', type: 'file', icon: '📄' });
      Swal.fire({ icon: 'success', title: 'Added', text: 'Global requirement has been added.', confirmButtonColor: '#7a1f3d' });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not add requirement.' });
    }
  };

  const handleDeleteGlobalRequirement = async (reqId) => {
    const res = await Swal.fire({
      title: 'Delete this global requirement?',
      text: "This will remove it from all students' requirements.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it'
    });
    
    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'requirements', reqId));
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'The requirement has been deleted.', confirmButtonColor: '#7a1f3d' });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete requirement.' });
      }
    }
  };

  const handleSaveEmailTemplate = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'dean_settings', user.uid), {
        emailTemplates: {
          adviserInvitation: {
            subject: emailTemplate.subject,
            body: emailTemplate.body
          }
        }
      }, { merge: true });
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Email template updated successfully.', confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save template.' });
    }
  };

  const handleResetEmailTemplate = () => {
    setEmailTemplate({
      subject: "You're Invited to Join ARCHIVIO — SWU PHINMA Research Management System",
      body: "Dear [Adviser Name],\n\nYou have been invited to join ARCHIVIO — the Web-Based Digital Research Archive Management System of Southwestern University PHINMA.\n\nAs a Research Adviser, you will be able to:\n• Manage your assigned student research groups\n• Review and evaluate submitted manuscripts\n• Track submission requirements and completion status\n• Approve and forward papers to the Dean for publication\n\nPlease click the button below to activate your account and set up your credentials."
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: `${profile.firstName} ${profile.lastName}`,
        title: profile.title,
        memberships: profile.memberships,
        publications: profile.publications
      });
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully.', confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update profile.' });
    }
  };

  const handleSaveSchoolYears = async (newYearsList) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'dean_settings', user.uid), {
        schoolYears: newYearsList
      }, { merge: true });
      Swal.fire({ icon: 'success', title: 'Saved', text: 'School Year updated successfully.', confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update school year.' });
    }
  };

  const handleAddSY = (e) => {
    e.preventDefault();
    if (!currentSY.label) return;
    const newSY = { ...currentSY, id: Date.now().toString() };
    const newList = [...schoolYears, newSY];
    setSchoolYears(newList);
    handleSaveSchoolYears(newList);
    setShowSYModal(false);
    setCurrentSY({ id: '', label: '', status: 'Upcoming' });
  };

  const handleEditSY = (e) => {
    e.preventDefault();
    const newList = schoolYears.map(sy => sy.id === currentSY.id ? currentSY : sy);
    setSchoolYears(newList);
    handleSaveSchoolYears(newList);
    setShowEditSYModal(false);
  };

  const handleDeleteSY = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = schoolYears.filter(sy => sy.id !== id);
        setSchoolYears(newList);
        handleSaveSchoolYears(newList);
      }
    });
  };

  const handleSetActiveSY = (id) => {
    Swal.fire({
      title: 'Set Active School Year?',
      text: "Setting a new Active SY will archive the current one. This affects the dashboard and all submissions.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7a1f3d',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, set as active'
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = schoolYears.map(sy => {
          if (sy.id === id) return { ...sy, status: 'Active' };
          if (sy.status === 'Active') return { ...sy, status: 'Archive' };
          return sy;
        });
        setSchoolYears(newList);
        handleSaveSchoolYears(newList);
      }
    });
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'dean_settings', user.uid), {
        notifications: notifications
      }, { merge: true });
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Notification preferences updated.', confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update notifications.' });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      Swal.fire({ icon: 'error', title: 'Passwords do not match', text: 'New password and confirm password must be identical.' });
      return;
    }
    
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.newPass);
      
      setPasswords({ current: '', newPass: '', confirm: '' });
      Swal.fire({ icon: 'success', title: 'Success', text: 'Password updated successfully.', confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      let msg = 'Failed to update password. Please try again.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = 'Incorrect current password.';
      }
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const globalRequirements = requirements.filter(r => r.scope === 'global').sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const pendingProposals = requirements.filter(r => r.scope === 'adviser' && r.status === 'pending');
  const approvedProposals = requirements.filter(r => r.scope === 'adviser' && r.status === 'approved');

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} onMenuClick={() => {}} />
        
        <main className="p-6 lg:p-8 w-full max-w-[1400px] mx-auto flex-1">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Settings</h1>
            <p className="text-sm text-stone-500 mt-1">Configure system preferences and completion requirements</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Column: Navigation Tabs */}
            <div className="w-full lg:w-[300px] shrink-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden py-2">
              <div className="space-y-0.5 px-2">
                {settingsTabs.map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 text-left font-medium text-sm px-4 py-3 rounded-lg transition-all 
                    ${activeTab === tab.id
                      ? 'bg-[#f8ebef] text-[#7a1f3d] font-bold' 
                      : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <span className={`text-base ${activeTab === tab.id ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Tab Content */}
            <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-stone-200 p-6 lg:p-8">
              
              {/* Completion Requirements Tab */}
              {activeTab === 'completion' && (
                <div className="space-y-10">
                  
                  {/* Department-wide Requirements */}
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Global Completion Requirements</h3>
                        <p className="text-xs text-stone-500 mt-1">These apply to ALL research groups department-wide.</p>
                      </div>
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#7a1f3d] hover:bg-[#631932] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm shrink-0"
                      >
                        + Add Global Requirement
                      </button>
                    </div>

                    <div className="space-y-3">
                      {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                          <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Requirements...</p>
                        </div>
                      ) : (
                        globalRequirements.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-xl bg-stone-50 opacity-90">
                            <div className="flex items-center gap-4">
                              <span className="text-xl">{item.icon}</span>
                              <div>
                                <span className="text-sm text-stone-900 font-bold">{item.title}</span>
                                <p className="text-xs text-stone-500">{item.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-blue-200">Global</span>
                              <button 
                                onClick={() => handleDeleteGlobalRequirement(item.id)}
                                className="border border-stone-200 rounded px-2.5 py-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex items-center justify-center"
                                title="Delete Requirement"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <hr className="border-stone-200" />

                  {/* Pending Adviser Proposals */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Pending Adviser Proposals</h3>
                        <p className="text-xs text-stone-500 mt-1">Review requirements proposed by Research Advisers for their respective groups.</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">{pendingProposals.length} Pending</span>
                    </div>

                    <div className="space-y-3">
                      {pendingProposals.length === 0 ? (
                        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-8 text-center">
                          <p className="text-stone-500 text-sm font-medium">No pending proposals at this time.</p>
                        </div>
                      ) : (
                        pendingProposals.map((item) => (
                          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-l-4 border-l-yellow-400 border-t border-b border-r border-stone-200 rounded-r-xl bg-white shadow-sm gap-4">
                            <div className="flex items-start gap-4">
                              <span className="text-2xl mt-1">{item.icon}</span>
                              <div>
                                <span className="text-sm text-stone-900 font-bold">{item.title}</span>
                                <p className="text-xs text-stone-500 mb-1">{item.desc}</p>
                                <p className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded inline-block font-medium">
                                  Proposed by: {item.adviserUid}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
                                ✓ Approve
                              </button>
                              <button onClick={() => handleUpdateStatus(item.id, 'declined')} className="border border-stone-300 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-4 py-2 rounded-lg text-xs font-bold transition">
                                ✕ Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Approved Adviser Proposals */}
                  {approvedProposals.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-stone-100">
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Approved Adviser Requirements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {approvedProposals.map(item => (
                          <div key={item.id} className="border border-stone-200 rounded-lg p-3 bg-white flex items-center gap-3">
                            <span className="text-xl">{item.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-800 truncate">{item.title}</p>
                              <p className="text-[10px] text-stone-400 truncate">For: {item.adviserUid}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded">APPROVED</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Email Templates Tab */}
              {activeTab === 'email' && (
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-6 font-serif">Email Template — Adviser Invitation</h3>
                  <div className="mb-6">
                    <p className="text-sm text-stone-600 mb-1">This is the default message sent to Research Advisers when you invite them.</p>
                    <p className="text-sm text-stone-600">You can edit it here — changes will apply to all future invitations.</p>
                  </div>
                  <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-lg mb-8 flex items-center gap-2 border border-blue-100">
                    💡 Changes made here are automatically applied to the message box in Send Invitations.
                  </div>

                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">TEMPLATE MESSAGE</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">SUBJECT LINE</label>
                      <input 
                        type="text" 
                        value={emailTemplate.subject}
                        onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">MESSAGE BODY</label>
                      <textarea 
                        rows={12}
                        value={emailTemplate.body}
                        onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d] resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-stone-100">
                    <button 
                      onClick={handleResetEmailTemplate}
                      className="px-6 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-50 transition"
                    >
                      Reset to Default
                    </button>
                    <button 
                      onClick={handleSaveEmailTemplate}
                      className="px-6 py-2.5 rounded-lg bg-[#7a1f3d] text-white text-sm font-bold hover:bg-[#631932] transition shadow-sm"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              )}

              {/* My Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-xl font-bold text-stone-900 mb-6 font-serif">My Profile</h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">FIRST NAME</label>
                        <input 
                          type="text" 
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">LAST NAME</label>
                        <input 
                          type="text" 
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">INSTITUTIONAL EMAIL</label>
                      <input 
                        type="text" 
                        value={deanData?.email || ''}
                        disabled
                        className="w-full bg-stone-100 border border-stone-200 rounded-lg p-3 text-sm text-stone-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">DEPARTMENT</label>
                      <input 
                        type="text" 
                        value={deanData?.department || ''}
                        disabled
                        className="w-full bg-stone-100 border border-stone-200 rounded-lg p-3 text-sm text-stone-500 cursor-not-allowed mb-1"
                      />
                      <p className="text-[10px] text-stone-400">Read-only · Managed by System Administrator</p>
                    </div>

                    <div className="w-48">
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">TITLE / HONORIFIC</label>
                      <select 
                        value={profile.title}
                        onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                      >
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                      </select>
                    </div>

                    {/* Organizational Memberships */}
                    <div className="pt-6 border-t border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">ORGANIZATIONAL MEMBERSHIP</h4>
                          <p className="text-[10px] text-stone-500 mt-0.5">Add your professional or academic organizational memberships.</p>
                        </div>
                        <button className="w-8 h-8 rounded-lg bg-[#7a1f3d] text-white flex items-center justify-center font-bold hover:bg-[#631932] transition">
                          +
                        </button>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <p className="text-sm font-medium text-stone-600">No organizational memberships added yet</p>
                        <p className="text-xs text-stone-400 mt-1">Click the + button above to add your first membership</p>
                      </div>
                    </div>

                    {/* Research Publications */}
                    <div className="pt-6 border-t border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">RESEARCH PUBLICATIONS</h4>
                          <p className="text-[10px] text-stone-500 mt-0.5">Add your published research papers with their publication links.</p>
                        </div>
                        <button className="w-8 h-8 rounded-lg bg-[#7a1f3d] text-white flex items-center justify-center font-bold hover:bg-[#631932] transition">
                          +
                        </button>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <p className="text-sm font-medium text-stone-600">No research publications added yet</p>
                        <p className="text-xs text-stone-400 mt-1">Click the + button above to add your first publication</p>
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-stone-100">
                    <button 
                      onClick={handleSaveProfile}
                      className="px-6 py-2.5 rounded-lg bg-[#7a1f3d] text-white text-sm font-bold hover:bg-[#631932] transition shadow-sm"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              )}

              {/* School Year Tab */}
              {activeTab === 'schoolyear' && (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 font-serif">School Year (SY) Management</h3>
                      <p className="text-sm text-stone-500 mt-1">Manage and set the active school year for the department. Only one SY can be active at a time.</p>
                    </div>
                    <button 
                      onClick={() => setShowSYModal(true)}
                      className="px-4 py-2 border border-[#7a1f3d] text-[#7a1f3d] rounded-lg text-sm font-bold hover:bg-[#7a1f3d] hover:text-white transition"
                    >
                      + Add School Year
                    </button>
                  </div>

                  <div className="bg-amber-50 text-amber-800 text-xs px-4 py-3 rounded-lg mb-6 flex items-center gap-2 border border-amber-200">
                    ⚠️ Setting a new Active SY will archive the current one. This affects the dashboard and all submissions.
                  </div>

                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#7a1f3d] text-white">
                        <tr>
                          <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">SCHOOL YEAR</th>
                          <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">STATUS</th>
                          <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">RESEARCH GROUPS</th>
                          <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">PUBLISHED</th>
                          <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {schoolYears.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-stone-500">No school years added yet.</td>
                          </tr>
                        ) : (
                          schoolYears.map(sy => (
                            <tr key={sy.id} className="hover:bg-stone-50 transition group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full border-2 ${sy.status === 'Active' ? 'bg-green-500 border-green-200' : 'bg-transparent border-stone-300'}`}></div>
                                  <span className={`font-bold ${sy.status === 'Active' ? 'text-stone-900' : 'text-stone-500'}`}>{sy.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  sy.status === 'Active' ? 'bg-green-100 text-green-700' : 
                                  sy.status === 'Archive' ? 'bg-stone-200 text-stone-600' : 
                                  'bg-stone-100 text-stone-500'
                                }`}>
                                  {sy.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-stone-500">—</td>
                              <td className="px-6 py-4 text-center text-stone-500">—</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {sy.status !== 'Active' && (
                                    <button 
                                      onClick={() => handleSetActiveSY(sy.id)}
                                      className="px-3 py-1.5 text-xs font-bold text-green-700 border border-green-200 rounded hover:bg-green-50 transition"
                                    >
                                      Set Active
                                    </button>
                                  )}
                                  {sy.status === 'Active' && (
                                    <button 
                                      onClick={() => {
                                        setCurrentSY(sy);
                                        setShowEditSYModal(true);
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold text-stone-600 border border-stone-200 rounded hover:bg-stone-50 transition flex items-center gap-1"
                                    >
                                      ✏️ Edit
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDeleteSY(sy.id)}
                                    className="px-2 py-1.5 text-stone-400 border border-stone-200 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-xs text-stone-400 font-bold">
                    Showing {schoolYears.length} out of {schoolYears.length} school year
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-xl font-bold text-stone-900 font-serif mb-1">Notifications</h3>
                  <p className="text-sm text-stone-500 mb-6 border-b border-stone-200 pb-4">Manage how and when you receive notifications from ARCHIVIO.</p>
                  
                  <div className="space-y-6">
                    {/* Toggle Item */}
                    <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">Research Submission Updates</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Get notified when a group submits or updates their requirements.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notifications.researchUpdates} onChange={() => setNotifications({...notifications, researchUpdates: !notifications.researchUpdates})} />
                        <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1f3d]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">Adviser Activity Alerts</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Receive alerts when an adviser marks a submission as reviewed.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notifications.adviserAlerts} onChange={() => setNotifications({...notifications, adviserAlerts: !notifications.adviserAlerts})} />
                        <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1f3d]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">Publication Notifications</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Notify when a paper is published to the public archive.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notifications.publicationNotifs} onChange={() => setNotifications({...notifications, publicationNotifs: !notifications.publicationNotifs})} />
                        <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1f3d]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">System Announcements</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Receive general announcements from the System Administrator.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notifications.systemAnnouncements} onChange={() => setNotifications({...notifications, systemAnnouncements: !notifications.systemAnnouncements})} />
                        <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1f3d]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">Email Notifications</h4>
                        <p className="text-xs text-stone-500 mt-0.5">Send notification emails to your registered email address.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notifications.emailNotifs} onChange={() => setNotifications({...notifications, emailNotifs: !notifications.emailNotifs})} />
                        <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1f3d]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8">
                    <button 
                      onClick={handleSaveNotifications}
                      className="px-6 py-2.5 rounded-lg bg-[#7a1f3d] text-white text-sm font-bold hover:bg-[#631932] transition shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h3 className="text-xl font-bold text-stone-900 font-serif mb-1">Security & Password</h3>
                  <p className="text-sm text-stone-500 mb-8 border-b border-stone-200 pb-4">Update your password to keep your account secure.</p>
                  
                  <form onSubmit={handleUpdatePassword} className="max-w-md space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">CURRENT PASSWORD</label>
                      <div className="relative">
                        <input 
                          type={showPasswords.current ? "text" : "password"} 
                          required
                          value={passwords.current}
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 pr-12 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-stone-600 focus:outline-none"
                        >
                          {showPasswords.current ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">NEW PASSWORD</label>
                      <div className="relative">
                        <input 
                          type={showPasswords.newPass ? "text" : "password"} 
                          required
                          minLength={6}
                          value={passwords.newPass}
                          onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 pr-12 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, newPass: !showPasswords.newPass})}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-stone-600 focus:outline-none"
                        >
                          {showPasswords.newPass ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">CONFIRM NEW PASSWORD</label>
                      <div className="relative">
                        <input 
                          type={showPasswords.confirm ? "text" : "password"} 
                          required
                          minLength={6}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 pr-12 text-sm text-stone-900 focus:outline-none focus:border-[#7a1f3d]"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-stone-600 focus:outline-none"
                        >
                          {showPasswords.confirm ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-[#7a1f3d] text-white text-sm font-bold hover:bg-[#631932] transition shadow-sm disabled:opacity-50"
                      >
                        {loading ? 'Updating Password...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Fallback for unhandled tabs */}
              {activeTab !== 'completion' && activeTab !== 'email' && activeTab !== 'profile' && activeTab !== 'schoolyear' && activeTab !== 'notifications' && activeTab !== 'security' && (
                <div className="flex items-center justify-center h-64 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <p className="text-stone-500 font-medium">Select Completion Requirements tab to see the updates.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Global Requirement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#7a1f3d] p-4 text-white">
              <h2 className="font-bold text-lg">Add Global Requirement</h2>
            </div>
            <form onSubmit={handleAddGlobalRequirement} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Requirement Title</label>
                <input 
                  required
                  type="text" 
                  value={newReq.title}
                  onChange={e => setNewReq({...newReq, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  placeholder="e.g. Clearance Form"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  value={newReq.desc}
                  onChange={e => setNewReq({...newReq, desc: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  placeholder="e.g. Required clearance from accounting"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Input Type</label>
                  <select 
                    value={newReq.type}
                    onChange={e => setNewReq({...newReq, type: e.target.value, icon: e.target.value === 'url' ? '🔗' : '📄'})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]"
                  >
                    <option value="file">File Upload</option>
                    <option value="url">URL / Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Icon (Emoji)</label>
                  <input 
                    type="text" 
                    value={newReq.icon}
                    onChange={e => setNewReq({...newReq, icon: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-[#7a1f3d] text-white rounded-lg py-2 text-sm font-bold hover:bg-[#631932]">Add Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add School Year Modal */}
      {(showSYModal || showEditSYModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-stone-100">
              <h2 className="font-bold text-xl font-serif text-stone-900">{showEditSYModal ? 'Edit School Year' : 'Add School Year'}</h2>
              <button onClick={() => { setShowSYModal(false); setShowEditSYModal(false); }} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <form onSubmit={showEditSYModal ? handleEditSY : handleAddSY} className="p-6 space-y-5">
              <p className="text-xs text-stone-500 mb-4">{showEditSYModal ? 'Edit the school year label. Status can only be changed from the SY table.' : 'Add a new school year to track research submissions.'}</p>
              
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">SCHOOL YEAR</label>
                <input 
                  required
                  type="text" 
                  value={currentSY.label}
                  onChange={e => setCurrentSY({...currentSY, label: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  placeholder="e.g. 2026-2027"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wider">CURRENT STATUS</label>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentSY.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    currentSY.status === 'Archive' ? 'bg-stone-200 text-stone-600' : 
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {currentSY.status === 'Active' ? '● ' : ''}{currentSY.status}
                  </span>
                  {showEditSYModal && (
                    <span className="text-[10px] text-stone-400">(Status is managed from the SY table)</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => { setShowSYModal(false); setShowEditSYModal(false); }} className="flex-1 border border-stone-200 text-stone-600 rounded-lg py-2.5 text-sm font-bold hover:bg-stone-50 transition">Cancel</button>
                <button type="submit" className="flex-1 bg-[#7a1f3d] text-white rounded-lg py-2.5 text-sm font-bold hover:bg-[#631932] transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
