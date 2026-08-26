import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useUser } from '../context/UserContext';
import { auth, db } from '../firebase/config';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail
} from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Card, SectionTitle } from '../../components/ui/Card';

export default function SuperAdminSettings() {
  const { currentUser, setCurrentUser } = useUser();

  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [firstName, setFirstName] = useState(currentUser?.displayName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(currentUser?.displayName?.split(' ').slice(1).join(' ') || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password strength
  const hasMin = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strength = [hasMin, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];

  const moduleAccess = currentUser?.moduleAccess || {};
  const allModules = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'reports', label: 'Reports', icon: '📈' },
    { key: 'allUsers', label: 'All Users', icon: '👥' },
    { key: 'activityLogs', label: 'Activity Logs', icon: '📋' },
  ];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('Please fill in both first and last name.');
      return;
    }
    setProfileLoading(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');

      // Update in Firestore users collection
      await updateDoc(doc(db, 'users', user.uid), { displayName });

      // Update in super_admins collection
      const saQuery = query(collection(db, 'super_admins'), where('uid', '==', user.uid));
      const saSnap = await getDocs(saQuery);
      if (!saSnap.empty) {
        await updateDoc(saSnap.docs[0].ref, {
          displayName,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        });
      }

      // Update context
      setCurrentUser(prev => ({ ...prev, displayName }));
      setProfileSuccess('✅ Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordSuccess('✅ Password changed successfully! Please use your new password next time you log in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Incorrect current password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Password is too weak. Choose a stronger password.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = currentUser?.displayName
    ? currentUser.displayName.substring(0, 2).toUpperCase()
    : 'SA';

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title="My Account" breadcrumbs={['Account', 'Settings']} />

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto">

            <SectionTitle sub="Manage your personal information, password, and view your access permissions.">
              My Account
            </SectionTitle>

            {/* Profile Card */}
            <Card className="p-6 mb-6 flex flex-col md:flex-row items-center md:items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-amber-700 flex items-center justify-center font-bold text-2xl text-amber-100 shrink-0 shadow-md">
                {initials}
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-stone-900">{currentUser?.displayName || 'Super Admin'}</h4>
                <p className="text-sm text-stone-500">{currentUser?.email}</p>
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mt-2 md:mt-0">⭐ Super Admin</span>
            </Card>

            {/* Tabs */}
            <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 w-fit">
              {[
                { key: 'profile', label: '👤 Profile Info' },
                { key: 'password', label: '🔐 Change Password' },
                { key: 'access', label: '🛡️ My Access' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-white text-[#801e38] shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== PROFILE TAB ===== */}
            {activeTab === 'profile' && (
              <Card className="flex flex-col overflow-hidden">
                <div className="p-5 border-b border-stone-100 bg-stone-50">
                  <h4 className="font-bold text-stone-900">Personal Information</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Update your display name shown across the portal.</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Email address cannot be changed here. Contact the System Administrator.</p>
                  </div>

                  {profileError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
                      {profileSuccess}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-6 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {profileLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* ===== PASSWORD TAB ===== */}
            {activeTab === 'password' && (
              <Card className="flex flex-col overflow-hidden">
                <div className="p-5 border-b border-stone-100 bg-stone-50">
                  <h4 className="font-bold text-stone-900">Change Password</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Set a new password for your account. You'll need your current password to confirm.</p>
                </div>
                <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full pl-4 pr-12 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          {showCurrent
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-4 pr-12 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          {showNew
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                      </button>
                    </div>

                    {/* Strength Meter */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-stone-200'}`} />
                          ))}
                        </div>
                        <p className={`text-[11px] font-semibold ${['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-emerald-500'][strength]}`}>
                          {strengthLabel}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {[
                            { ok: hasMin, label: '8+ chars' },
                            { ok: hasUpper, label: 'Uppercase' },
                            { ok: hasNumber, label: 'Number' },
                            { ok: hasSpecial, label: 'Special char' },
                          ].map(r => (
                            <span key={r.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                              {r.ok ? '✓' : '○'} {r.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={`w-full pl-4 pr-12 py-2.5 bg-white border rounded-lg text-sm text-stone-800 outline-none focus:ring-1 transition-all ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                            : 'border-stone-200 focus:border-[#801e38] focus:ring-[#801e38]'
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          {showConfirm
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {passwordLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
                      ) : 'Update Password'}
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* ===== ACCESS TAB ===== */}
            {activeTab === 'access' && (
              <Card className="flex flex-col overflow-hidden">
                <div className="p-5 border-b border-stone-100 bg-stone-50">
                  <h4 className="font-bold text-stone-900">My Module Access</h4>
                  <p className="text-xs text-stone-500 mt-0.5">These are the modules granted to you by the System Administrator. To request additional access, contact the administrator.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allModules.map(mod => {
                    const granted = !!moduleAccess[mod.key];
                    return (
                      <div
                        key={mod.key}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          granted
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-stone-100 bg-stone-50 opacity-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${granted ? 'bg-emerald-100' : 'bg-stone-200'}`}>
                          {mod.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-800">{mod.label}</p>
                          <p className={`text-xs font-semibold ${granted ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {granted ? '✅ Access Granted' : '🔒 Not Granted'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-6 pb-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 mb-1">⭐ Super Admin Account</p>
                    <p className="text-xs text-amber-600">Your access is configured by the System Administrator. Modules marked as "Not Granted" are not accessible to your account. To request changes, please contact the System Administrator directly.</p>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
