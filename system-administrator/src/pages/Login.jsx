import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { logActivity } from '../firebase/logActivity';
import { useUser } from '../context/UserContext';
// I-import ang tanan nimo nga mga assets
import logo from '../assets/logo.png';
import loginBg from '../assets/parchment.png';
import tornEdge from '../assets/torn-edge.png';
import maroonBg from '../assets/maroon-bg.png'; 

function Login() {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();

  // Navigation state sulod sa login: 'login' | 'recovery' | 'reset'
  const [view, setView] = useState('login');
  
  // Dynamic Stats
  const [stats, setStats] = useState({ total: 24, pending: 8, published: 156 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const subRef = collection(db, 'submissions');
        
        // 1. Total Submissions
        const totalSnap = await getCountFromServer(subRef);
        const totalCount = totalSnap.data().count;

        // 2. Pending Submissions
        const pendingQuery = query(subRef, where('status', '==', 'pending'));
        const pendingSnap = await getCountFromServer(pendingQuery);
        const pendingCount = pendingSnap.data().count;

        // 3. Published Submissions
        const publishedQuery = query(subRef, where('status', '==', 'published'));
        const publishedSnap = await getCountFromServer(publishedQuery);
        const publishedCount = publishedSnap.data().count;

        setStats({ total: totalCount, pending: pendingCount, published: publishedCount });
      } catch (err) {
        console.error('Failed to load real stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);
  
  // Input states
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Recovery/Verification
  const [email, setEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Password Reset Validation
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasEightChars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  
  let strengthText = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthTextColor = 'text-red-500';
  
  if (strengthCount === 2 || strengthCount === 3) {
    strengthText = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthTextColor = 'text-amber-500';
  } else if (strengthCount === 4) {
    strengthText = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthTextColor = 'text-emerald-500';
  }

  const resetToLogin = () => {
    setView('login');
    setEmail('');
    setResetSent(false);
    setResetError('');
  };

  const handleForgotPassword = async () => {
    setResetError('');
    if (!email || !email.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError('No account found with this email.');
      } else {
        setResetError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // FIREBASE LOGIN LOGIC
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedEmail = loginEmail.trim().toLowerCase();
      const trimmedPassword = loginPassword.trim();

      // Removed @phinmaed.com restriction for System Administrators
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setError('User profile not found. Please contact administrator.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();

      // Allow both 'admin' and 'super-admin' roles
      if (userData.role !== 'admin' && userData.role !== 'super-admin') {
        setError('Access denied. This portal is for System Administrators only.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Save user info + permissions to context
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || userData.email,
        role: userData.role,
        moduleAccess: userData.moduleAccess || {
          dashboard: true,
          reports: true,
          allUsers: true,
          activityLogs: true
        }
      });

      // ✅ Log successful login
      await logActivity({
        user:   user.email,
        role:   userData.role === 'super-admin' ? 'Super Admin' : 'System Admin',
        action: 'Logged in to System Administrator portal',
        status: 'Success',
        details: `Role: ${userData.role}`,
      });

      // Success! Navigate to dashboard
      console.log('✅ Login successful! User:', userData);
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Handle specific errors
      let errorMsg = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect email or password. Please try again.';
      }
      setError(errorMsg);

      // ❌ Log failed login attempt
      await logActivity({
        user:   loginEmail.trim().toLowerCase() || 'unknown',
        role:   '—',
        action: 'Failed login attempt',
        status: 'Failed',
        details: error.code || 'Invalid credentials',
      });
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans overflow-hidden bg-[#e8e3d6]">
      
      {/* LEFT PANEL */}
      <div 
        className="relative hidden md:flex w-[45%] text-white flex-col justify-center items-center p-12 z-10 shadow-2xl bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${maroonBg})` }}
      >
        <img 
          src={tornEdge} 
          alt="Torn Edge Divider" 
          className="absolute right-0 translate-x-[45%] top-0 h-full w-16 object-fill pointer-events-none drop-shadow-[5px_0_5px_rgba(0,0,0,0.3)] z-20"
        />

        <div className="flex flex-col items-center text-center space-y-4 max-w-md relative z-30">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/20">
            <img src={logo} alt="ARCHIVIO Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <p className="text-[#d6ad60] text-xs font-bold tracking-[0.25em] uppercase mt-2">SWU PHINMA</p>
          <h1 className="text-5xl font-serif font-bold tracking-[0.15em] text-[#f5ebd9] my-2">ARCHIVIO</h1>
          <div className="w-16 h-[2px] bg-[#d6ad60] rounded-full"></div>
          <p className="text-[#d6ad60]/90 text-sm font-serif italic tracking-wide">
            Research Archive Management System
          </p>

          {/* DYNAMIC STATS SECTION ADDED BACK */}
          <div className="mt-12 flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-8 py-5 w-full max-w-sm backdrop-blur-md shadow-inner">
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-2xl font-serif">
                {loadingStats ? <div className="h-6 w-8 bg-white/20 animate-pulse rounded" /> : stats.total}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-1">Submissions</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-2xl font-serif font-semibold">
                {loadingStats ? <div className="h-6 w-8 bg-white/20 animate-pulse rounded" /> : stats.pending}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-1">Pending</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-2xl font-serif">
                {loadingStats ? <div className="h-6 w-8 bg-white/20 animate-pulse rounded" /> : stats.published}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-1">Published</span>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL - DYNAMIC CARDS */}
      <div 
        className="w-full md:w-[55%] flex flex-col justify-center px-6 sm:px-16 lg:px-28 relative z-0 bg-cover bg-right bg-no-repeat overflow-y-auto py-8 md:py-0"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="max-w-md w-full mx-auto relative z-10">
          
          {/* VIEW: LOGIN CARD */}
          {view === 'login' && (
            <>
              <div className="mb-8">
                <h2 className="text-4xl font-serif font-bold text-stone-900 tracking-tight mb-2">Welcome!</h2>
                <p className="text-stone-600 text-sm">Sign in to your ARCHIVIO account</p>
                <div className="w-12 h-[3px] bg-[#d6ad60] mt-3 rounded-full"></div>
              </div>

              <div className="bg-white/95 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-8 sm:p-10 border-t-[4px] border-[#3b1220] backdrop-blur-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-stone-900">Sign In</h3>
                  <p className="text-xs text-stone-400 mt-1">Enter your institutional email and password</p>
                </div>

                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <span className="text-red-500 text-sm">⚠️</span>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your admin email" 
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white transition-all placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password" 
                        required
                        disabled={loading}
                        className="w-full pl-10 pr-16 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white transition-all placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-[#801e38] hover:text-[#5a1224]"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="w-4 h-4 rounded border-stone-300 text-[#3b1220] focus:ring-[#3b1220] accent-[#3b1220]" />
                      <span className="text-xs text-stone-500 font-medium">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setView('recovery')} className="text-xs text-[#801e38] font-semibold hover:underline">Forgot password?</button>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#801e38] hover:bg-[#601328] text-white font-bold text-sm py-3.5 rounded-xl mt-4 shadow-md shadow-[#801e38]/10 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In to ARCHIVIO'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* VIEW: RECOVERY CARD */}
          {view === 'recovery' && (
            <div className="bg-white/95 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-8 sm:p-10 border-t-[4px] border-[#3b1220] backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#3b1220] rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <svg className="w-5 h-5 text-[#d6ad60]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Account Recovery</h3>
                <p className="text-xs text-stone-500 mt-1">Regain access to your ARCHIVIO account</p>
              </div>

              {resetError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-sm text-red-700">{resetError}</p>
                </div>
              )}

              {!resetSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#801e38] tracking-wider uppercase mb-2">Enter Your Email</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your institutional email" 
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf8] border-stone-200 border rounded-xl text-sm outline-none transition-all focus:border-[#3b1220]"
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    disabled={loading || !email.trim()}
                    onClick={handleForgotPassword}
                    className="w-full bg-[#801e38] hover:bg-[#601328] text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  
                  <div className="text-center mt-4">
                    <button type="button" onClick={resetToLogin} className="text-xs text-stone-500 font-bold hover:text-stone-800">← Back to Login</button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
                    <p className="text-sm text-emerald-800 font-medium">
                      ✅ A password reset link has been sent to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-emerald-600 mt-2">
                      Please check your inbox and spam folder, and click the link to create a new password.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={resetToLogin}
                    className="w-full bg-[#3b1220] hover:bg-[#2a0d16] text-[#d6ad60] font-bold text-xs py-3 rounded-xl shadow-md transition-all uppercase tracking-wider"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default Login;