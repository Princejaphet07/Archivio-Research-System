import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

import logo from '../assets/logo.png';
import loginBg from '../assets/parchment.png';
import tornEdge from '../assets/torn-edge.png';
import maroonBg from '../assets/maroon-bg.png'; 

function UnifiedLogin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 24, pending: 8, published: 156 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const subRef = collection(db, 'submissions');
        
        const publishedQuery = query(subRef, where('status', '==', 'published'));
        const publishedSnap = await getCountFromServer(publishedQuery);
        const publishedCount = publishedSnap.data().count;

        setStats(prev => ({ ...prev, published: publishedCount }));
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('archivio_remembered_email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('archivio_remembered_email'));

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedEmail = loginEmail.trim().toLowerCase();
      const trimmedPassword = loginPassword.trim();
      
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      if (rememberMe) {
        localStorage.setItem('archivio_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('archivio_remembered_email');
      }

      // Check all collections simultaneously to find the user's role
      const [usersSnap, studentsSnap, advisersSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('uid', '==', user.uid))),
        getDocs(query(collection(db, 'students'), where('uid', '==', user.uid))),
        getDocs(query(collection(db, 'advisers'), where('userId', '==', user.uid)))
      ]);

      let role = null;

      if (!usersSnap.empty) {
        role = usersSnap.docs[0].data().role; // 'admin', 'super-admin', 'dean'
      } else if (!studentsSnap.empty) {
        role = 'student';
      } else if (!advisersSnap.empty) {
        role = 'adviser';
      }

      if (!role) {
        setError('Your account was not found in any portal. Please contact the administrator.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (role === 'admin' || role === 'super-admin') {
        window.location.href = '/admin/';
      } else if (role === 'dean') {
        // Check if this is the first login
        const deansQuery = query(collection(db, 'deans'), where('uid', '==', user.uid));
        const deansSnap = await getDocs(deansQuery);
        if (!deansSnap.empty && deansSnap.docs[0].data().accountStatus === 'pending_activation') {
          window.location.href = '/dean-activate';
        } else {
          window.location.href = '/dean/';
        }
      } else if (role === 'adviser') {
        window.location.href = '/adviser/';
      } else if (role === 'student' || role === 'member') {
        window.location.href = '/student/';
      }

    } catch (error) {
      console.error('Login error:', error);
      let errorMsg = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMsg = 'Incorrect email or password.';
      }
      setError(errorMsg);
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
          alt="Torn Edge" 
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
            Unified Research Portal
          </p>
          
          <p className="mt-6 text-white/70 text-[13px] leading-relaxed max-w-sm font-light tracking-wide px-4">
            A centralized, secure, and intuitive platform designed to streamline the management, tracking, and publishing of academic research manuscripts for the university community.
          </p>

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

      {/* RIGHT PANEL - LOGIN FORM */}
      <div 
        className="w-full md:w-[55%] flex flex-col justify-center items-center p-8 lg:p-24 relative"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        
        <div className="w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Logo" className="w-20 h-20 mb-3 drop-shadow-md" />
            <h1 className="text-3xl font-serif font-bold text-[#7a1f3d]">ARCHIVIO</h1>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-[#666] text-sm font-medium">Log in to your respective portal.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3 shadow-sm animate-shake">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="text-sm text-red-800 font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4a4a4a] uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#7a1f3d] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                </div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-[#d2c9b6] rounded-xl text-gray-800 focus:ring-2 focus:ring-[#7a1f3d]/20 focus:border-[#7a1f3d] transition-all duration-200 outline-none shadow-sm placeholder-gray-400 font-medium"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4a4a4a] uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#7a1f3d] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#d2c9b6] rounded-xl text-gray-800 focus:ring-2 focus:ring-[#7a1f3d]/20 focus:border-[#7a1f3d] transition-all duration-200 outline-none shadow-sm placeholder-gray-400 font-medium"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border-2 border-gray-300 rounded focus:ring-0 checked:bg-[#7a1f3d] checked:border-[#7a1f3d] transition-all cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[13px] text-gray-600 font-medium group-hover:text-gray-800 transition-colors">Remember me</span>
              </label>
              
              <Link to="/dean/forgot-password" className="text-[13px] font-bold text-[#7a1f3d] hover:text-[#5c172e] transition-colors">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 bg-[#7a1f3d] hover:bg-[#681933] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border border-[#7a1f3d]/50 ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          {/* SIGN UP LINKS */}
          <div className="mt-8 pt-6 border-t border-gray-300/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[13px] text-gray-500 font-medium">Don't have an account?</span>
            <div className="flex items-center gap-3">
              <a href="/student/signup" className="text-[13px] font-bold text-[#d6ad60] hover:text-[#c49a50] bg-white px-4 py-2 rounded-lg border border-[#d6ad60]/30 shadow-sm transition-all hover:shadow-md">
                Register as Student
              </a>
              <a href="/adviser/signup" className="text-[13px] font-bold text-gray-700 hover:text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-all hover:shadow-md">
                Register as Adviser
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10 hidden md:block">
          <p className="text-[#888] text-xs font-medium tracking-wide">
            &copy; {new Date().getFullYear()} SWU PHINMA. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default UnifiedLogin;
