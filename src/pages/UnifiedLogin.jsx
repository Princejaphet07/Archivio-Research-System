import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Mail, LockKeyhole } from 'lucide-react';
import ReCaptcha from '../components/ReCaptcha';

import logo from '../assets/logo.png';
import loginBg from '../assets/parchment.png';
import tornEdge from '../assets/torn-edge.png';
import maroonBg from '../assets/maroon-bg.png';
import { getBackendUrl } from '../utils/backendUrl';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

function UnifiedLogin() {
  const navigate = useNavigate();
  // Static Repository Stats
  const stats = { total: 24, pending: 8, published: 156 };

  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState(localStorage.getItem('archivio_remembered_email') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('archivio_remembered_email'));
  const [privacyModalTab, setPrivacyModalTab] = useState('terms');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [inviteNotice, setInviteNotice] = useState(null);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loginEmailParam = params.get('loginEmail') || params.get('email');
    if (loginEmailParam && params.get('acceptInvite') !== 'true') {
      setLoginEmail(loginEmailParam.trim().toLowerCase());
    }

    if (params.get('acceptInvite') === 'true') {
      const leaderParam = params.get('leader');
      const groupParam = params.get('group');
      const emailParam = params.get('email');
      if (leaderParam) {
        setLoginEmail(leaderParam.trim().toLowerCase());
      }
      setInviteNotice({
        leader: leaderParam,
        group: groupParam || 'Research Group',
        email: emailParam
      });
    }
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    setError('');

    if (!captchaToken) {
      setError('Please verify that you are not a robot before signing in.');
      return;
    }

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

      // Safe lookup helper: prevents any single collection permission denial from breaking login
      const safeFetch = async (fn) => {
        try {
          return await fn();
        } catch (err) {
          console.warn('Safe lookup notice (non-fatal):', err.message);
          return null;
        }
      };

      // 1. Check users collection (allowed for all authenticated users)
      const [userDirectDoc, userQuerySnap, userEmailSnap] = await Promise.all([
        safeFetch(() => getDoc(doc(db, 'users', user.uid))),
        safeFetch(() => getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)))),
        safeFetch(() => getDocs(query(collection(db, 'users'), where('email', '==', trimmedEmail))))
      ]);

      let role = null;
      let userDocRef = null;

      if (userDirectDoc && userDirectDoc.exists()) {
        role = userDirectDoc.data().role;
        userDocRef = userDirectDoc.ref;
      } else if (userQuerySnap && !userQuerySnap.empty) {
        role = userQuerySnap.docs[0].data().role;
        userDocRef = userQuerySnap.docs[0].ref;
      } else if (userEmailSnap && !userEmailSnap.empty) {
        role = userEmailSnap.docs[0].data().role;
        userDocRef = userEmailSnap.docs[0].ref;
      }

      if (userDocRef) {
        try {
          await updateDoc(userDocRef, { lastLogin: serverTimestamp(), status: 'active' });
        } catch (e) {
          console.warn('Non-fatal: could not update users lastLogin:', e.message);
        }
      }

      // 2. Check students collection by doc ID, uid query, and email query
      const [stdDirectDoc, stdUidSnap, stdEmailSnap] = await Promise.all([
        safeFetch(() => getDoc(doc(db, 'students', user.uid))),
        safeFetch(() => getDocs(query(collection(db, 'students'), where('uid', '==', user.uid)))),
        safeFetch(() => getDocs(query(collection(db, 'students'), where('email', '==', trimmedEmail))))
      ]);

      const foundStudentDoc = (stdDirectDoc && stdDirectDoc.exists())
        ? stdDirectDoc
        : (stdUidSnap && !stdUidSnap.empty)
          ? stdUidSnap.docs[0]
          : (stdEmailSnap && !stdEmailSnap.empty)
            ? stdEmailSnap.docs[0]
            : null;

      if (foundStudentDoc) {
        if (!role) role = 'student';
        try {
          await updateDoc(foundStudentDoc.ref, {
            lastLogin: serverTimestamp(),
            status: 'active',
            uid: user.uid
          });
        } catch (e) {
          console.warn('Non-fatal: could not update student doc:', e.message);
        }
      }

      // 3. Check deans collection by doc ID, uid query, and email query
      let deansDocToUse = null;
      const [deanDirectDoc, deanUidSnap, deanEmailSnap] = await Promise.all([
        safeFetch(() => getDoc(doc(db, 'deans', user.uid))),
        safeFetch(() => getDocs(query(collection(db, 'deans'), where('uid', '==', user.uid)))),
        safeFetch(() => getDocs(query(collection(db, 'deans'), where('email', '==', trimmedEmail))))
      ]);

      deansDocToUse = (deanDirectDoc && deanDirectDoc.exists())
        ? deanDirectDoc
        : (deanUidSnap && !deanUidSnap.empty)
          ? deanUidSnap.docs[0]
          : (deanEmailSnap && !deanEmailSnap.empty)
            ? deanEmailSnap.docs[0]
            : null;

      if (deansDocToUse) {
        const dData = deansDocToUse.data();
        if (!role || dData.role === 'dean+adviser') {
          role = dData.role || 'dean';
        }
        try {
          await updateDoc(deansDocToUse.ref, { lastLogin: serverTimestamp(), status: 'active', uid: user.uid });
        } catch (e) {
          console.warn('Non-fatal: could not update dean doc:', e.message);
        }
      }

      // 4. Check advisers collection by doc ID, userId, uid, and email query
      const [advDirectDoc, advUserIdSnap, advUidSnap, advEmailSnap] = await Promise.all([
        safeFetch(() => getDoc(doc(db, 'advisers', user.uid))),
        safeFetch(() => getDocs(query(collection(db, 'advisers'), where('userId', '==', user.uid)))),
        safeFetch(() => getDocs(query(collection(db, 'advisers'), where('uid', '==', user.uid)))),
        safeFetch(() => getDocs(query(collection(db, 'advisers'), where('email', '==', trimmedEmail))))
      ]);

      const foundAdvDoc = (advDirectDoc && advDirectDoc.exists())
        ? advDirectDoc
        : (advUserIdSnap && !advUserIdSnap.empty)
          ? advUserIdSnap.docs[0]
          : (advUidSnap && !advUidSnap.empty)
            ? advUidSnap.docs[0]
            : (advEmailSnap && !advEmailSnap.empty)
              ? advEmailSnap.docs[0]
              : null;

      if (foundAdvDoc) {
        if (!role) role = foundAdvDoc.data().role || 'adviser';
        try {
          await updateDoc(foundAdvDoc.ref, { lastLogin: serverTimestamp(), status: 'active', userId: user.uid, uid: user.uid });
        } catch (e) {
          console.warn('Non-fatal: could not update adviser doc:', e.message);
        }
      }

      // 5. Check super_admins safely if role is admin or not yet determined
      if (!role || role === 'super-admin' || role === 'admin') {
        const [saDirectDoc, saUidSnap, saEmailSnap] = await Promise.all([
          safeFetch(() => getDoc(doc(db, 'super_admins', user.uid))),
          safeFetch(() => getDocs(query(collection(db, 'super_admins'), where('uid', '==', user.uid)))),
          safeFetch(() => getDocs(query(collection(db, 'super_admins'), where('email', '==', trimmedEmail))))
        ]);

        const foundSaDoc = (saDirectDoc && saDirectDoc.exists())
          ? saDirectDoc
          : (saUidSnap && !saUidSnap.empty)
            ? saUidSnap.docs[0]
            : (saEmailSnap && !saEmailSnap.empty)
              ? saEmailSnap.docs[0]
              : null;

        if (foundSaDoc) {
          role = 'super-admin';
          try {
            await updateDoc(foundSaDoc.ref, { lastLogin: serverTimestamp(), status: 'active', uid: user.uid });
          } catch (e) {
            console.warn('Non-fatal: could not update super_admin doc:', e.message);
          }
        }
      }

      // Self-healing Auto-Bootstrap: If database was wiped or uninitialized, bootstrap it!
      if (!role) {
        try {
          const backendUrl = getBackendUrl();
          const bootRes = await fetch(`${backendUrl}/api/system/bootstrap`, { method: 'POST' });
          if (bootRes.ok) {
            const [retrySa, retryUser, retryStudent, retryDean, retryAdv] = await Promise.all([
              safeFetch(() => getDoc(doc(db, 'super_admins', user.uid))),
              safeFetch(() => getDoc(doc(db, 'users', user.uid))),
              safeFetch(() => getDoc(doc(db, 'students', user.uid))),
              safeFetch(() => getDoc(doc(db, 'deans', user.uid))),
              safeFetch(() => getDoc(doc(db, 'advisers', user.uid)))
            ]);

            if (retrySa && retrySa.exists()) role = 'super-admin';
            else if (retryUser && retryUser.exists()) role = retryUser.data().role;
            else if (retryStudent && retryStudent.exists()) role = 'student';
            else if (retryDean && retryDean.exists()) role = retryDean.data().role || 'dean';
            else if (retryAdv && retryAdv.exists()) role = retryAdv.data().role || 'adviser';
          }
        } catch (bootErr) {
          console.warn('Auto-bootstrap notice:', bootErr);
        }
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
      } else if (role === 'dean' || role === 'dean+adviser') {
        // Check if this is the first login
        if (deansDocToUse) {
          const dData = deansDocToUse.data();
          if (dData.accountStatus === 'pending_activation') {
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
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
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
          alt="Torn Edge"
          className="absolute right-0 translate-x-[20%] top-0 h-full w-12 sm:w-14 lg:w-16 object-fill pointer-events-none z-20"
        />

        <div className="flex flex-col items-center text-center space-y-3 lg:space-y-4 max-w-md relative z-30">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg border border-white/20">
              <img src={logo} alt="ARCHIVIO Logo" className="w-full h-full object-contain rounded-full" />
            </div>
          </div>
          <p className="text-[#d6ad60] text-[11px] lg:text-xs font-bold tracking-[0.25em] uppercase mt-1">SWU PHINMA</p>
          <h1 className="text-3xl lg:text-5xl font-serif font-bold tracking-[0.15em] text-[#f5ebd9] my-1">ARCHIVIO</h1>
          <div className="w-14 h-[2px] bg-[#d6ad60] rounded-full"></div>
          <p className="text-[#d6ad60]/90 text-xs lg:text-sm font-serif italic tracking-wide">
            Unified Research Portal
          </p>

          <p className="mt-3 lg:mt-4 text-white/70 text-xs lg:text-[13px] leading-relaxed max-w-sm font-light tracking-wide px-3">
            A centralized, secure, and intuitive platform designed to streamline the management, tracking, and publishing of academic research manuscripts for the university community.
          </p>

          <div className="mt-5 lg:mt-7 flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-6 lg:px-8 py-3.5 lg:py-4 w-full max-w-sm backdrop-blur-md shadow-inner">
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif">
                {stats.total}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Submissions</span>
            </div>
            <div className="h-7 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif font-semibold">
                {stats.pending}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Pending</span>
            </div>
            <div className="h-7 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-xl lg:text-2xl font-serif">
                {stats.published}
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-0.5">Published</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div
        className="w-full md:w-[55%] h-full flex flex-col justify-between items-center px-6 sm:px-12 lg:px-20 py-4 lg:py-6 relative overflow-hidden"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="w-full max-w-md my-auto relative z-10 animate-fade-in-up">
          <div className="md:hidden flex flex-col items-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <img src={logo} alt="ARCHIVIO Logo" className="w-16 h-16 drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#7a1f3d]">ARCHIVIO</h1>
          </div>

          <div className="mb-4 lg:mb-5 text-center md:text-left animate-fade-in-up">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-[#2d1b11] mb-1 tracking-tight drop-shadow-sm">Welcome Back</h2>
            <p className="text-[#7d6f65] text-xs lg:text-sm font-medium">Log in to your respective portal.</p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50/90 backdrop-blur-sm border-l-4 border-red-600 rounded-r-xl flex items-center gap-2.5 shadow-md animate-shake">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="text-xs text-red-900 font-medium">{error}</span>
            </div>
          )}

          {inviteNotice && (
            <div className="mb-3 p-3 bg-emerald-50/95 backdrop-blur-sm border border-emerald-300 rounded-xl shadow-sm text-left">
              <div className="flex items-start gap-2">
                <span className="text-base">🎉</span>
                <div className="text-xs leading-relaxed text-emerald-950">
                  <p className="font-bold text-xs text-emerald-900 mb-0.5">
                    Invitation Accepted for {inviteNotice.group}!
                  </p>
                  <p className="text-emerald-800 text-[11px]">
                    Your member status is active. Please log in using your group leader's credentials{inviteNotice.leader ? <> (<strong>{inviteNotice.leader}</strong>)</> : ''} below to enter the portal.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3 lg:space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] lg:text-[11px] font-bold text-[#5c4a40] uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-[#a69b8b] group-focus-within:text-[#7a1f3d] transition-colors duration-300">
                  <Mail className="w-4 h-4 lg:w-4.5 lg:h-4.5" strokeWidth={2.5} />
                </div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="login-input w-full pl-10 pr-4 py-2.5 lg:py-3 text-xs lg:text-sm bg-[#f4ebd8]/40 backdrop-blur-sm border border-[#c1b49a] rounded-xl text-[#2d1b11] focus:ring-4 focus:ring-[#7a1f3d]/15 focus:border-[#7a1f3d] transition-all duration-300 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:border-[#a8997a] hover:bg-[#f4ebd8]/60 placeholder-[#8c7a6b] font-medium relative z-0"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] lg:text-[11px] font-bold text-[#5c4a40] uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-[#a69b8b] group-focus-within:text-[#7a1f3d] transition-colors duration-300">
                  <LockKeyhole className="w-4 h-4 lg:w-4.5 lg:h-4.5" strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="login-input w-full pl-10 pr-11 py-2.5 lg:py-3 text-xs lg:text-sm bg-[#f4ebd8]/40 backdrop-blur-sm border border-[#c1b49a] rounded-xl text-[#2d1b11] focus:ring-4 focus:ring-[#7a1f3d]/15 focus:border-[#7a1f3d] transition-all duration-300 outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:border-[#a8997a] hover:bg-[#f4ebd8]/60 placeholder-[#8c7a6b] font-medium relative z-0"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10 text-gray-400 hover:text-[#7a1f3d] transition-colors duration-300 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-3.5 h-3.5 border-2 border-[#b8ad9a] rounded focus:ring-0 checked:bg-[#7a1f3d] checked:border-[#7a1f3d] transition-all cursor-pointer group-hover:border-[#7a1f3d]"
                  />
                  <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-xs lg:text-[13px] text-[#5c4a40] font-semibold group-hover:text-[#2d1b11] transition-colors">Remember me</span>
              </label>

              <Link to="/admin/forgot-password" className="text-xs lg:text-[13px] font-bold text-[#670319] hover:text-[#520214] transition-colors hover:underline underline-offset-4">
                Forgot Password?
              </Link>
            </div>

            <div className="flex justify-center sm:justify-start pt-1">
              <ReCaptcha ref={recaptchaRef} onChange={setCaptchaToken} className="origin-left scale-[0.88] sm:scale-[0.92] lg:scale-100" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 lg:mt-3 bg-[#670319] hover:bg-[#520214] text-white font-bold py-2.5 lg:py-3 px-4 rounded-xl shadow-[0_8px_20px_-6px_rgba(103,3,25,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(103,3,25,0.5)] transition-all duration-300 flex items-center justify-center gap-2 border border-[#670319]/30 text-sm lg:text-base ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Logging in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          {/* IT Support Contact */}
          <div className="mt-3 lg:mt-4 text-center">
            <a href="mailto:archivio.admin@gmail.com" className="text-[11px] lg:text-xs font-bold text-[#670319] hover:text-[#520214] flex items-center justify-center gap-1.5 hover:underline underline-offset-4 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Having trouble logging in? Contact IT Support (archivio.admin@gmail.com)
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full text-center z-10 hidden md:block pt-2">
          <div className="flex items-center justify-center gap-3 text-[#8c7a6b] text-[11px] lg:text-xs font-medium tracking-wide">
            <span>&copy; {new Date().getFullYear()} SWU PHINMA. All rights reserved.</span>
            <span className="w-1 h-1 rounded-full bg-[#d2c9b6]"></span>
            <button 
              type="button" 
              onClick={() => { setPrivacyModalTab('terms'); setShowPrivacy(true); }} 
              className="hover:text-[#7a1f3d] transition-colors focus:outline-none cursor-pointer"
            >
              Terms and Conditions
            </button>
            <span className="w-1 h-1 rounded-full bg-[#d2c9b6]"></span>
            <button 
              type="button" 
              onClick={() => { setPrivacyModalTab('privacy'); setShowPrivacy(true); }} 
              className="hover:text-[#7a1f3d] transition-colors focus:outline-none cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Official Standalone Policy Modals */}
      <PrivacyPolicyModal 
        isOpen={showPrivacy} 
        mode={privacyModalTab}
        onClose={() => setShowPrivacy(false)} 
      />
    </div>
  );
}

export default UnifiedLogin;
