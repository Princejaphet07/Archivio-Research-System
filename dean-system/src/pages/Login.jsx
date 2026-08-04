import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Import assets
import leftBg from '../assets/Frame (1).png';
import rightBg from '../assets/Rectangle 9 (1).png';
import tornEdge from '../assets/Vector 3.png';
import logo from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();

  const [view, setView] = useState('login'); // 'login' | 'activate' | 'change-password'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('dean_remembered_email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('dean_remembered_email'));

  const [activationData, setActivationData] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password strength check
  const hasEightChars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedEmail = loginEmail.toLowerCase().trim();
      const trimmedPassword = loginPassword.trim();

      console.log('🔍 Login attempt for:', trimmedEmail);

      // Validate @phinmaed.com domain
      if (!trimmedEmail.endsWith('@phinmaed.com')) {
        setError('Please use your @phinmaed.com email address');
        setLoading(false);
        return;
      }

      // Sign in with Firebase
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        console.log('✅ Firebase auth successful for:', userCredential.user.email);
      } catch (authError) {
        console.error('❌ Firebase auth failed:', authError.code, authError.message);
        throw authError;
      }

      const user = userCredential.user;

      // Check Firestore dean record
      console.log('🔍 Checking Firestore for dean record...');
      const deansQuery = query(collection(db, 'deans'), where('email', '==', trimmedEmail));
      const deansSnapshot = await getDocs(deansQuery);

      if (deansSnapshot.empty) {
        console.warn('⚠️ Dean record not found for:', trimmedEmail);
        await auth.signOut();
        setError('Your account has been deactivated. Please contact your administrator.');
        setLoading(false);
        return;
      }

      const deanDoc = deansSnapshot.docs[0];
      const deanData = deanDoc.data();
      console.log('✅ Dean data retrieved:', { email: deanData.email, status: deanData.status, accountStatus: deanData.accountStatus });

      // Check if dean account is active
      if (deanData.status !== 'active') {
        console.warn('⚠️ Dean status is not active:', deanData.status);
        setError('Your account is pending. Please contact your administrator.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // ✅ KEY CHECK: Is this the first login? (temp password, not yet changed)
      if (deanData.accountStatus === 'pending_activation') {
        console.log('🔑 First-time login detected — redirecting to password change...');
        // Pre-fill activation data so the change-password form knows who this is
        setActivationData({
          email: trimmedEmail,
          deanId: deanDoc.id,
          displayName: deanData.displayName
        });
        // Switch to change-password view (user stays signed in temporarily)
        setView('change-password');
        setLoading(false);
        return;
      }

      // Normal login — go to dashboard
      console.log('✅ Dean login successful! Redirecting to dashboard...');

      if (rememberMe) {
        localStorage.setItem('dean_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('dean_remembered_email');
      }

      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Login error:', error.code, error.message);

      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please check the email address.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please check and try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please check and try again.');
      } else {
        setError(`Login failed: ${error.code}. Please check your credentials.`);
      }

      setLoading(false);
    }
  };

  // NOTE: handleActivation removed — Admin pre-creates the Firebase Auth account.
  // First-time login is handled via handleChangePassword after handleLogin detects
  // accountStatus === 'pending_activation'.

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (strengthCount < 4) {
      setError('Password must meet all requirements');
      return;
    }

    if (!activationData?.email || !activationData?.deanId) {
      setError('Session data missing. Please go back and sign in again.');
      return;
    }

    setLoading(true);

    try {
      // The user is already signed in (from handleLogin), so we just need to update the password.
      // updatePassword requires a recently authenticated user — which we have from the login step.
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
        const deansQuery = query(collection(db, 'deans'), where('email', '==', activationData.email.toLowerCase()));
        const deansSnapshot = await getDocs(deansQuery);
        const deanData = deansSnapshot.docs[0].data();

        await setDoc(userDocRef, {
          uid: user.uid,
          email: activationData.email,
          displayName: deanData.displayName,
          role: deanData.role,
          department: deanData.department,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }

      // Reset form state
      setNewPassword('');
      setConfirmPassword('');
      setActivationData(null);
      setLoading(false);

      console.log('✅ Account fully activated — navigating to dashboard...');
      // Navigate directly to dashboard (user is already authenticated)
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Password change error:', error);

      if (error.code === 'auth/requires-recent-login') {
        // Token too old — sign out and ask to re-login
        await auth.signOut();
        setView('login');
        setError('Session expired. Please sign in again with your temporary password.');
      } else if (error.message && error.message.includes('password')) {
        setError('Password update failed. Please ensure your password meets all requirements.');
      } else {
        setError('Failed to set new password. Please try again.');
      }

      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">

      {/* ================== LEFT COLUMN (Maroon Section) - Hidden on Mobile/Tablet ================== */}
      <div
        className="relative hidden w-[45%] flex-col items-center justify-center lg:flex"
        style={{
          backgroundImage: `url('${leftBg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#3b1220'
        }}
      >
        {/* Torn Edge Overlay */}
        <div className="absolute inset-y-0 right-0 z-10 translate-x-[45%] h-full">
          <img src={tornEdge} alt="Torn Edge" className="h-full w-auto object-cover" />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-12">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 p-2 shadow-inner border border-white/20">
            <img src={logo} alt="SWU Logo" className="h-full w-full object-contain" />
          </div>

          <p className="mb-2 text-xs font-bold tracking-widest text-[#d4af37]">SWU PHINMA</p>
          <h1 className="mb-2 font-serif text-5xl font-bold tracking-widest text-[#fae1a0]">ARCHIVIO</h1>

          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="h-1 w-1 rotate-45 bg-[#d4af37]"></div>
          </div>

          <p className="mb-12 font-serif text-sm text-[#d4af37]">
            Research Archive Management System
          </p>

          {/* Stats Box */}
          <div className="flex w-full max-w-sm divide-x divide-[#d4af37]/20 rounded-xl border border-[#d4af37]/20 bg-[#2a0b16]/40 py-4 backdrop-blur-sm">
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">24</span>
              <span className="text-[10px] text-stone-300">Submissions</span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">8</span>
              <span className="text-[10px] text-stone-300">Pending</span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">156</span>
              <span className="text-[10px] text-stone-300">Published</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================== RIGHT COLUMN (Paper Section) - Full width on Mobile ================== */}
      <div
        className="relative flex w-full flex-col justify-center px-6 sm:px-16 lg:w-[55%] lg:px-24"
        style={{
          backgroundImage: `url('${rightBg}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#f5f0e6'
        }}
      >
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:pl-12">

          {/* ==================== LOGIN VIEW ==================== */}
          {view === 'login' && (
            <>
              {/* Welcome Text */}
              <div className="mb-8">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Welcome Back!</h2>
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-sm text-stone-600">Sign in to your ARCHIVIO account</p>
                  <div className="h-0.5 w-12 bg-[#d4af37]"></div>
                </div>
              </div>

              {/* Login Form Card */}
              <div className="rounded-2xl border border-white/50 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-stone-900">Dean Portal Sign In</h3>
                  <p className="text-xs text-stone-500 mt-1">Enter your institutional email and password</p>
                  <div className="mt-4 border-b border-stone-200"></div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleLogin}>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your.name@phinmaed.com"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 pl-10 pr-4 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Use your @phinmaed.com email</p>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 pl-10 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Options Row */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-[#7a1f3d] focus:ring-[#7a1f3d]"
                      />
                      <span className="text-xs font-medium text-stone-600">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-[#7a1f3d] hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full rounded-lg bg-[#7a1f3d] py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-[#5a162d] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ==================== ACTIVATION VIEW ==================== */}
          {view === 'activate' && (
            <>
              {/* Welcome Text */}
              <div className="mb-8">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Activate Account</h2>
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-sm text-stone-600">Set up your Dean portal password</p>
                  <div className="h-0.5 w-12 bg-[#d4af37]"></div>
                </div>
              </div>

              {/* Activation Form Card */}
              <div className="rounded-2xl border border-white/50 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-stone-900">Create Your Password</h3>
                  <p className="text-xs text-stone-500 mt-1">You can login after setting your password</p>
                  <div className="mt-4 border-b border-stone-200"></div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleActivation}>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={activationData?.email || ''}
                      onChange={(e) => setActivationData({ email: e.target.value })}
                      placeholder="your.name@phinmaed.com"
                      required
                      disabled={loading}
                      className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 px-4 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 px-4 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 px-4 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="bg-stone-50 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-bold text-stone-700 mb-2">Password Requirements:</p>
                      <div className="flex items-center gap-2">
                        <span className={hasEightChars ? 'text-green-600' : 'text-stone-400'}>
                          {hasEightChars ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasNumber ? 'text-green-600' : 'text-stone-400'}>
                          {hasNumber ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains a number</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasUpper ? 'text-green-600' : 'text-stone-400'}>
                          {hasUpper ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasSpecial ? 'text-green-600' : 'text-stone-400'}>
                          {hasSpecial ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains special character</span>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-stone-300 bg-white py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
                    >
                      Back to Login
                    </button>
                    <button
                      type="submit"
                      disabled={loading || strengthCount < 4}
                      className="flex-1 rounded-lg bg-[#7a1f3d] py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-[#5a162d] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Activating...' : 'Activate Account'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ==================== CHANGE PASSWORD VIEW ==================== */}
          {view === 'change-password' && (
            <>
              {/* Welcome Text */}
              <div className="mb-8">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Set Your Password</h2>
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-sm text-stone-600">Create a permanent password to secure your account</p>
                  <div className="h-0.5 w-12 bg-[#d4af37]"></div>
                </div>
              </div>

              {/* Change Password Form Card */}
              <div className="rounded-2xl border border-white/50 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-stone-900">Create Your Permanent Password</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Welcome, {activationData?.displayName || 'Dean'}! Please set a new password to secure your account.
                  </p>
                  <div className="mt-4 border-b border-stone-200"></div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleChangePassword}>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 px-4 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        disabled={loading}
                        className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 px-4 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="bg-stone-50 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-bold text-stone-700 mb-2">Password Requirements:</p>
                      <div className="flex items-center gap-2">
                        <span className={hasEightChars ? 'text-green-600' : 'text-stone-400'}>
                          {hasEightChars ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasNumber ? 'text-green-600' : 'text-stone-400'}>
                          {hasNumber ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains a number</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasUpper ? 'text-green-600' : 'text-stone-400'}>
                          {hasUpper ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={hasSpecial ? 'text-green-600' : 'text-stone-400'}>
                          {hasSpecial ? '✓' : '○'}
                        </span>
                        <span className="text-xs text-stone-600">Contains special character</span>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setView('login');
                        setError('');
                      }}
                      disabled={loading}
                      className="flex-1 rounded-lg border border-stone-300 bg-white py-3 text-sm font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || strengthCount < 4}
                      className="flex-1 rounded-lg bg-[#7a1f3d] py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-[#5a162d] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Set Permanent Password'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}


        </div>
      </div>

    </div>
  );
}
