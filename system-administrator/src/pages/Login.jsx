import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
  const [showPassword, setShowPassword] = useState(false);
  
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
                    <Link to="/forgot-password" className="text-xs text-[#801e38] font-semibold hover:underline">Forgot password?</Link>
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
        </div>
      </div>

    </div>
  );
}

export default Login;