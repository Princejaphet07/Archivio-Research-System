import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, getCountFromServer, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Mail, LockKeyhole, X } from 'lucide-react';

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
      let totalCount = 0;
      let pendingCount = 0;
      let publishedCount = 0;
      const subRef = collection(db, 'submissions');

      try {
        // Fetch Total Submissions (Might be blocked by rules for unauthenticated users)
        const totalSnap = await getCountFromServer(subRef);
        totalCount = totalSnap.data().count;
      } catch (err) {
        console.warn('Could not fetch total count (requires auth rules update)');
      }

      try {
        // Fetch Pending Submissions (Might be blocked by rules)
        const pendingQuery = query(subRef, where('reviewStatus', '==', 'pending'));
        const pendingSnap = await getCountFromServer(pendingQuery);
        pendingCount = pendingSnap.data().count;
      } catch (err) {
        console.warn('Could not fetch pending count (requires auth rules update)');
      }

      try {
        // Fetch Published Submissions (Usually allowed for public)
        const publishedQuery = query(subRef, where('reviewStatus', '==', 'published'));
        const publishedSnap = await getCountFromServer(publishedQuery);
        publishedCount = publishedSnap.data().count;
      } catch (err) {
        console.warn('Could not fetch published count');
      }

      setStats({ total: totalCount, pending: pendingCount, published: publishedCount });
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('archivio_remembered_email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('archivio_remembered_email'));
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists()) {
        setMaintenanceMode(snap.data().maintenance === true);
      }
    });
    return () => unsub();
  }, []);

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
        await updateDoc(usersSnap.docs[0].ref, { lastLogin: serverTimestamp(), status: 'active' });
      }
      if (!studentsSnap.empty) {
        if (!role) role = 'student';
        await updateDoc(studentsSnap.docs[0].ref, { lastLogin: serverTimestamp(), status: 'active' });
      }
      if (!advisersSnap.empty) {
        if (!role) role = 'adviser';
        await updateDoc(advisersSnap.docs[0].ref, { lastLogin: serverTimestamp(), status: 'active' });
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
        if (!deansSnap.empty) {
          await updateDoc(deansSnap.docs[0].ref, { lastLogin: serverTimestamp(), status: 'active' });
          if (deansSnap.docs[0].data().accountStatus === 'pending_activation') {
            window.location.href = '/dean-activate';
            return;
          }
        }
        window.location.href = '/dean/';
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
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = 'Your account is deactivated. Please contact your administrator to activate.';
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
        {/* SYSTEM STATUS BANNER */}
        <div className={`absolute top-6 right-8 hidden md:flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm animate-fade-in-down z-20 transition-colors duration-500 ${maintenanceMode ? 'border-amber-500/50' : 'border-green-500/20'}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${maintenanceMode ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${maintenanceMode ? 'text-amber-700' : 'text-green-800'}`}>
            {maintenanceMode ? 'System Under Maintenance' : 'All systems operational'}
          </span>
        </div>

        <div className="w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Logo" className="w-20 h-20 mb-3 drop-shadow-md" />
            <h1 className="text-3xl font-serif font-bold text-[#7a1f3d]">ARCHIVIO</h1>
          </div>

          <div className="mb-12 text-center md:text-left animate-fade-in-up">
            <h2 className="text-4xl font-serif font-bold text-[#2d1b11] mb-2 tracking-tight drop-shadow-sm">Welcome Back</h2>
            <p className="text-[#7d6f65] text-sm font-medium">Log in to your respective portal.</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50/90 backdrop-blur-sm border-l-4 border-red-600 rounded-r-xl flex items-center gap-3 shadow-md animate-shake">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="text-sm text-red-900 font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#5c4a40] uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-[#a69b8b] group-focus-within:text-[#7a1f3d] transition-colors duration-300">
                  <Mail className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="login-input w-full pl-11 pr-4 py-4 bg-[#f4ebd8]/40 backdrop-blur-sm border border-[#c1b49a] rounded-xl text-[#2d1b11] focus:ring-4 focus:ring-[#7a1f3d]/15 focus:border-[#7a1f3d] transition-all duration-300 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:border-[#a8997a] hover:bg-[#f4ebd8]/60 placeholder-[#8c7a6b] font-medium relative z-0"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#5c4a40] uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10 text-[#a69b8b] group-focus-within:text-[#7a1f3d] transition-colors duration-300">
                  <LockKeyhole className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="login-input w-full pl-11 pr-12 py-4 bg-[#f4ebd8]/40 backdrop-blur-sm border border-[#c1b49a] rounded-xl text-[#2d1b11] focus:ring-4 focus:ring-[#7a1f3d]/15 focus:border-[#7a1f3d] transition-all duration-300 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:border-[#a8997a] hover:bg-[#f4ebd8]/60 placeholder-[#8c7a6b] font-medium relative z-0"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-gray-400 hover:text-[#7a1f3d] transition-colors duration-300 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border-2 border-[#b8ad9a] rounded focus:ring-0 checked:bg-[#7a1f3d] checked:border-[#7a1f3d] transition-all cursor-pointer group-hover:border-[#7a1f3d]"
                  />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[13px] text-[#5c4a40] font-semibold group-hover:text-[#2d1b11] transition-colors">Remember me</span>
              </label>

              <Link to="/dean/forgot-password" className="text-[13px] font-bold text-[#7a1f3d] hover:text-[#5c172e] transition-colors hover:underline underline-offset-4">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-6 bg-gradient-to-r from-[#7a1f3d] to-[#5c172e] hover:from-[#681933] hover:to-[#4a1024] text-white font-bold py-4 px-4 rounded-xl shadow-[0_8px_20px_-6px_rgba(122,31,61,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(122,31,61,0.6)] transition-all duration-300 flex items-center justify-center gap-2 border border-[#7a1f3d]/30 ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-1'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Logging in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          {/* INVITATION INFO */}
          <div className="mt-10 pt-6 border-t border-[#d2c9b6]/60 text-center">
            <span className="text-[13px] text-[#5c4a40] font-bold block mb-1">Don't have an account?</span>
            <span className="text-[12px] text-[#7d6f65] italic leading-relaxed">
              Access to ARCHIVIO is strictly by invitation only. <br /> Please contact your Dean or Research Adviser.
            </span>
            <div className="mt-5">
              <a href="mailto:archivio.noreply@gmail.com" className="text-[12px] font-bold text-[#7a1f3d] hover:text-[#5c172e] flex items-center justify-center gap-1.5 hover:underline underline-offset-4 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Having trouble logging in? Contact IT Support
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10 hidden md:block">
          <div className="flex items-center justify-center gap-3 text-[#8c7a6b] text-xs font-medium tracking-wide">
            <span>&copy; {new Date().getFullYear()} SWU PHINMA. All rights reserved.</span>
            <span className="w-1 h-1 rounded-full bg-[#d2c9b6]"></span>
            <button type="button" onClick={() => setShowTerms(true)} className="hover:text-[#7a1f3d] transition-colors focus:outline-none">Terms of Use</button>
            <span className="w-1 h-1 rounded-full bg-[#d2c9b6]"></span>
            <button type="button" onClick={() => setShowPrivacy(true)} className="hover:text-[#7a1f3d] transition-colors focus:outline-none">Privacy Policy</button>
          </div>
        </div>
      </div>

      {/* TERMS MODAL */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-[#fcfaf5] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#c1b49a]">
            <div className="flex justify-between items-center p-6 border-b border-[#d2c9b6] bg-white/50">
              <h2 className="text-2xl font-serif font-bold text-[#7a1f3d]">Terms of Use</h2>
              <button onClick={() => setShowTerms(false)} className="text-[#8c7a6b] hover:text-[#7a1f3d] transition-colors focus:outline-none">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] prose prose-stone max-w-none text-sm text-[#5c4a40]">
              <p className="font-semibold text-[#8c7a6b] uppercase tracking-widest mb-6 text-xs">Last Updated: {new Date().toLocaleDateString()}</p>
              
              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mt-0 mb-2">1. Acceptance of Terms</h3>
              <p className="mb-6">By accessing and using ARCHIVIO, the Unified Research Portal of SWU PHINMA, you accept and agree to be bound by the terms and provision of this agreement. Furthermore, when using this system's particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">2. Access and Security</h3>
              <p className="mb-2">Access to ARCHIVIO is strictly by invitation only and is restricted to actively enrolled students, faculty, and administrative staff of SWU PHINMA.</p>
              <ul className="list-disc pl-4 mb-6 space-y-1">
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree to notify the IT Support team immediately of any unauthorized use of your account.</li>
                <li>The University reserves the right to terminate or suspend access to the portal for any violations of these terms or university policies.</li>
              </ul>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">3. Intellectual Property and Plagiarism</h3>
              <p className="mb-2">All research manuscripts, abstracts, and related documents uploaded to ARCHIVIO remain the intellectual property of their respective authors. However, by uploading to this platform, you grant SWU PHINMA a non-exclusive right to archive, index, and display your work within the university network for academic purposes.</p>
              <p className="mb-6">Strict adherence to academic integrity is required. Plagiarism or the submission of fraudulent research is strictly prohibited and will result in disciplinary action in accordance with the SWU PHINMA Student/Faculty Manual.</p>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">4. Limitation of Liability</h3>
              <p>The University shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the system, or from unauthorized access to or alteration of your transmissions or data.</p>
            </div>
            <div className="p-4 border-t border-[#d2c9b6] bg-white/80 flex justify-end">
              <button onClick={() => setShowTerms(false)} className="bg-[#7a1f3d] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5c172e] transition-colors shadow-md">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY MODAL */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-[#fcfaf5] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#c1b49a]">
            <div className="flex justify-between items-center p-6 border-b border-[#d2c9b6] bg-white/50">
              <h2 className="text-2xl font-serif font-bold text-[#7a1f3d]">Privacy Policy</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-[#8c7a6b] hover:text-[#7a1f3d] transition-colors focus:outline-none">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] prose prose-stone max-w-none text-sm text-[#5c4a40]">
              <p className="font-semibold text-[#8c7a6b] uppercase tracking-widest mb-6 text-xs">Last Updated: {new Date().toLocaleDateString()}</p>
              
              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mt-0 mb-2">1. Information We Collect</h3>
              <p className="mb-2">ARCHIVIO collects information to provide better services to all our users. We collect information in the following ways:</p>
              <ul className="list-disc pl-4 mb-6 space-y-1">
                <li><strong>Information you give us:</strong> This includes your university email address, name, department, and role (student, adviser, dean) when your account is provisioned.</li>
                <li><strong>Information we get from your use of the system:</strong> This includes research manuscripts, abstracts, comments, annotations, and system logs such as access times and IP addresses for security auditing.</li>
              </ul>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">2. How We Use Information</h3>
              <p className="mb-2">The information we collect from the portal is used to:</p>
              <ul className="list-disc pl-4 mb-6 space-y-1">
                <li>Provide, maintain, and improve the ARCHIVIO platform.</li>
                <li>Authenticate users and ensure secure access to academic research.</li>
                <li>Index and archive university research for access by authorized university personnel.</li>
                <li>Communicate with you regarding system updates, research statuses, or administrative notices.</li>
              </ul>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">3. Data Security</h3>
              <p className="mb-2">We work hard to protect SWU PHINMA and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. In particular:</p>
              <ul className="list-disc pl-4 mb-6 space-y-1">
                <li>We encrypt many of our services using SSL.</li>
                <li>We restrict access to personal information to SWU PHINMA employees, contractors, and agents who need to know that information in order to process it for us.</li>
              </ul>

              <h3 className="text-lg font-serif font-bold text-[#2d1b11] mb-2">4. Sharing of Information</h3>
              <p>We do not share personal information with companies, organizations, and individuals outside of SWU PHINMA unless one of the following circumstances applies: with your consent, for external academic processing (if applicable), or for legal reasons. Research abstracts may be made available to other enrolled students or faculty within the platform.</p>
            </div>
            <div className="p-4 border-t border-[#d2c9b6] bg-white/80 flex justify-end">
              <button onClick={() => setShowPrivacy(false)} className="bg-[#7a1f3d] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5c172e] transition-colors shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default UnifiedLogin;
