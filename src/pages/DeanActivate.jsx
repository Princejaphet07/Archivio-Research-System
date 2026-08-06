import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import loginBg from '../assets/parchment.png';

function DeanActivate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [activationData, setActivationData] = useState(null);

  // Password strength requirements
  const hasEightChars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;

  useEffect(() => {
    const fetchDeanData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/');
        return;
      }
      
      try {
        const deansQuery = query(collection(db, 'deans'), where('uid', '==', user.uid));
        const deansSnapshot = await getDocs(deansQuery);
        
        if (deansSnapshot.empty) {
          setError('Dean account not found.');
          return;
        }
        
        const deanDoc = deansSnapshot.docs[0];
        const data = deanDoc.data();
        
        if (data.accountStatus !== 'pending_activation') {
          // Already activated
          window.location.href = '/dean/';
          return;
        }
        
        setActivationData({
          email: data.email,
          deanId: deanDoc.id,
          displayName: data.displayName,
          department: data.department,
          role: data.role
        });
      } catch (err) {
        console.error('Failed to fetch dean data:', err);
        setError('Error loading account data.');
      }
    };
    
    // Use onAuthStateChanged to ensure auth is loaded before checking
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchDeanData();
      } else {
        navigate('/');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (strengthCount < 4) {
      setError('Password must meet all requirements');
      return;
    }

    if (!activationData) {
      setError('Session data missing. Please sign in again.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Session expired. Please go back and sign in again.');
        setLoading(false);
        return;
      }

      // Update password for the currently signed-in user
      await updatePassword(user, newPassword);
      console.log('✅ Password updated successfully');

      // Update dean Firestore record: mark as fully activated
      await updateDoc(doc(db, 'deans', activationData.deanId), {
        accountStatus: 'activated',
        temporaryPassword: null,   // Clear temp password from DB
        activatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Dean accountStatus set to activated');

      // Ensure users collection profile exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: activationData.email,
          displayName: activationData.displayName,
          role: activationData.role,
          department: activationData.department,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }

      setLoading(false);
      console.log('✅ Account fully activated — navigating to dashboard...');
      window.location.href = '/dean/';

    } catch (error) {
      console.error('❌ Password change error:', error);

      if (error.code === 'auth/requires-recent-login') {
        await signOut(auth);
        navigate('/');
        setError('Session expired. Please sign in again with your temporary password.');
      } else if (error.message && error.message.includes('password')) {
        setError('Password update failed. Please ensure your password meets all requirements.');
      } else {
        setError(`Failed to update password: ${error.message}`);
      }
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (!activationData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#e8e3d6]">
        <div className="animate-spin h-8 w-8 border-4 border-[#7a1f3d] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center font-sans p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="max-w-md w-full rounded-2xl border border-white/50 bg-white/95 p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#7a1f3d]"></div>

        <div className="mb-6">
          <h2 className="font-serif text-3xl font-bold text-stone-900">Set Your Password</h2>
          <div className="mt-2 flex flex-col items-start gap-2">
            <p className="text-sm text-stone-600">Create a permanent password to secure your Dean account</p>
            <div className="h-0.5 w-12 bg-[#d4af37]"></div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleChangePassword}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider ml-1">New Password</label>
            <div className="relative group">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white py-3.5 pl-4 pr-12 text-stone-800 outline-none transition-all focus:border-[#7a1f3d] focus:ring-2 focus:ring-[#7a1f3d]/20 shadow-sm"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-[#7a1f3d] transition-colors"
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider ml-1">Confirm Password</label>
            <div className="relative group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white py-3.5 pl-4 pr-12 text-stone-800 outline-none transition-all focus:border-[#7a1f3d] focus:ring-2 focus:ring-[#7a1f3d]/20 shadow-sm"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-[#7a1f3d] transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>
          </div>

          {newPassword && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 mt-4 shadow-sm">
              <p className="text-xs font-bold text-stone-800 mb-2 uppercase tracking-wide">Requirements</p>
              <div className="flex items-center gap-2">
                <span className={hasEightChars ? 'text-green-600' : 'text-stone-400'}>
                  {hasEightChars ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> : '○'}
                </span>
                <span className="text-xs text-stone-600 font-medium">At least 8 characters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasNumber ? 'text-green-600' : 'text-stone-400'}>
                  {hasNumber ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> : '○'}
                </span>
                <span className="text-xs text-stone-600 font-medium">Contains a number</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasUpper ? 'text-green-600' : 'text-stone-400'}>
                  {hasUpper ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> : '○'}
                </span>
                <span className="text-xs text-stone-600 font-medium">Contains uppercase letter</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasSpecial ? 'text-green-600' : 'text-stone-400'}>
                  {hasSpecial ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> : '○'}
                </span>
                <span className="text-xs text-stone-600 font-medium">Contains special character</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 rounded-xl border-2 border-stone-200 bg-white py-3.5 text-sm font-bold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50 hover:text-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || strengthCount < 4}
              className="flex-1 rounded-xl bg-[#7a1f3d] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7a1f3d]/20 transition-all hover:-translate-y-0.5 hover:bg-[#5a162d] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            >
              {loading ? 'Activating...' : 'Activate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeanActivate;
