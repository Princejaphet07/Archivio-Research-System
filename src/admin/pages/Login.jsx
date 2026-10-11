import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { logActivity } from '../../firebase/logActivity';
import { useUser } from '../context/UserContext';
// I-import ang tanan nimo nga mga assets
import logo from '../../assets/logo.png';
import loginBg from '../../assets/parchment.png';
import tornEdge from '../../assets/torn-edge.png';
import maroonBg from '../../assets/maroon-bg.png'; 

function Login() {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();
  // Static Repository Stats
  const stats = { total: 24, pending: 8, published: 156 };
  
  // Input states
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('admin_remembered_email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('admin_remembered_email'));
  const view = 'login';

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
      
      if (rememberMe) {
        localStorage.setItem('admin_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('admin_remembered_email');
      }

      navigate('/admin/dashboard');

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
    <div className="h-screen max-h-screen w-full flex font-sans overflow-hidden bg-[#e8e3d6]">
      
      {/* LEFT PANEL */}
      <div className="relative hidden md:flex w-[45%] h-full text-white flex-col justify-center items-center py-6 px-8 lg:px-12 z-20">
        {/* Maroon Background Layer at back of torn-edge */}
        <div 
          className="absolute inset-0 bg-cover bg-top bg-no-repeat pointer-events-none z-10"
          style={{ backgroundImage: `url(${maroonBg})`, backgroundColor: '#650318' }}
        />

        {/* Torn Edge Overlay */}
        <img 
          src={tornEdge} 
          alt="Torn Edge Divider" 
          className="absolute right-0 translate-x-[20%] top-0 h-full w-12 sm:w-14 lg:w-16 object-fill pointer-events-none z-20"
        />

        <div className="flex flex-col items-center text-center space-y-3 lg:space-y-4 max-w-md relative z-30">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white dark:bg-[#1e1e1e] rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/20">
            <img src={logo} alt="ARCHIVIO Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <p className="text-[#d6ad60] text-[11px] lg:text-xs font-bold tracking-[0.25em] uppercase mt-1">SWU PHINMA</p>
          <h1 className="text-3xl lg:text-5xl font-serif font-bold tracking-[0.15em] text-[#f5ebd9] my-1">ARCHIVIO</h1>
          <div className="w-14 h-[2px] bg-[#d6ad60] rounded-full"></div>
          <p className="text-[#d6ad60]/90 text-xs lg:text-sm font-serif italic tracking-wide">
            Research Archive Management System
          </p>

          {/* REPOSITORY STATS SECTION */}
          <div className="mt-6 lg:mt-8 flex items-center justify-between bg-white dark:bg-[#1e1e1e]/[0.04] border border-white/10 rounded-2xl px-6 lg:px-8 py-3.5 lg:py-4 w-full max-w-sm backdrop-blur-md shadow-inner">
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif">
                {stats.total}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Submissions</span>
            </div>
            <div className="h-7 w-[1px] bg-white dark:bg-[#1e1e1e]/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif font-semibold">
                {stats.pending}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Pending</span>
            </div>
            <div className="h-7 w-[1px] bg-white dark:bg-[#1e1e1e]/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif">
                {stats.published}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Published</span>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL - DYNAMIC CARDS */}
      <div 
        className="w-full md:w-[55%] h-full flex flex-col justify-center items-center px-6 sm:px-14 lg:px-24 relative z-0 bg-cover bg-right bg-no-repeat overflow-hidden py-4"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="max-w-md w-full mx-auto relative z-10">
          
          {/* VIEW: LOGIN CARD */}
          {view === 'login' && (
            <>
              <div className="mb-4 lg:mb-5">
                <h2 className="text-3xl lg:text-4xl font-serif font-bold text-stone-900 dark:text-stone-50 tracking-tight mb-1">Welcome!</h2>
                <p className="text-stone-600 dark:text-stone-300 text-xs lg:text-sm">Sign in to your ARCHIVIO account</p>
                <div className="w-12 h-[2.5px] bg-[#d6ad60] mt-2 rounded-full"></div>
              </div>

              <div className="bg-white dark:bg-[#1e1e1e]/95 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-6 sm:p-7 border-t-[4px] border-[#3b1220] backdrop-blur-sm">
                <div className="mb-4">
                  <h3 className="text-lg lg:text-xl font-bold text-stone-900 dark:text-stone-50">Sign In</h3>
                  <p className="text-[11px] lg:text-xs text-stone-400 mt-0.5">Enter your institutional email and password</p>
                </div>

                <form className="space-y-3.5" onSubmit={handleLoginSubmit}>
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                      <span className="text-red-500 text-xs">⚠️</span>
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-xs">✉️</span>
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your admin email" 
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#fbfaf8] border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white dark:bg-[#1e1e1e] transition-all placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-xs">🔒</span>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password" 
                        required
                        disabled={loading}
                        className="w-full pl-9 pr-14 py-2.5 bg-[#fbfaf8] border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white dark:bg-[#1e1e1e] transition-all placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[11px] font-semibold text-[#801e38] hover:text-[#5a1224]"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-stone-300 text-[#3b1220] focus:ring-[#3b1220] accent-[#3b1220]" 
                      />
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Remember me</span>
                    </label>
                    <Link to="/admin/forgot-password" className="text-[11px] text-[#670319] font-semibold hover:underline">Forgot password?</Link>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#670319] hover:bg-[#520214] text-white font-bold text-xs sm:text-sm py-3 rounded-xl mt-3 shadow-md shadow-[#670319]/20 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In to ARCHIVIO'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

export default Login;
