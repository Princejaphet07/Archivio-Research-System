import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { logActivity } from '../../firebase/logActivity';
import swuLogoSeal from '../../assets/new icon.png';
import parchmentBg from '../../assets/parchment.jpg';
import tornEdge from '../../assets/torn-edge.png';
import Swal from 'sweetalert2';
import { getBackendUrl } from '../../utils/backendUrl';

export default function StudentLogin({ onSwitchPage, onLogin, prefilledEmail }) {
  const [email, setEmail] = useState(prefilledEmail || localStorage.getItem('student_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('student_remembered_email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteAcceptedNotice, setInviteAcceptedNotice] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldAccept = params.get('acceptInvite') === 'true';
    const loginEmailParam = params.get('loginEmail') || (!shouldAccept ? params.get('email') : null);
    if (loginEmailParam) {
      setEmail(loginEmailParam.trim().toLowerCase());
    }

    const emailToAccept = params.get('email');
    const groupParam = params.get('group');
    const leaderParam = params.get('leader');

    if (shouldAccept && emailToAccept) {
      const cleanEmail = emailToAccept.trim().toLowerCase();
      
      if (leaderParam) {
        setEmail(leaderParam.trim().toLowerCase());
      }

      setInviteAcceptedNotice({
        group: groupParam || 'Research Group',
        email: cleanEmail
      });

      const acceptInvitation = async () => {
        // 1. Call Backend Admin API (Zero security rule barriers)
        try {
          const backendUrl = getBackendUrl();
          await fetch(`${backendUrl}/api/accept-student-invitation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
        } catch (backendErr) {
          console.warn('Backend accept notice:', backendErr);
        }

        // 2. Direct Firestore update as immediate client fallback
        try {
          const invQ = query(collection(db, 'studentInvitations'), where('studentEmail', '==', cleanEmail));
          const invSnap = await getDocs(invQ);
          for (const invDoc of invSnap.docs) {
            await updateDoc(doc(db, 'studentInvitations', invDoc.id), {
              status: 'accepted',
              accepted: true,
              acceptedAt: new Date().toISOString()
            });
          }
        } catch (fsErr) {
          console.warn('Direct Firestore invitation update notice:', fsErr);
        }

        Swal.fire({
          icon: 'success',
          title: 'Invitation Accepted!',
          html: `
            <div style="font-family: inherit; text-align: left; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
              <p style="margin-bottom: 10px;">
                Welcome! You have successfully accepted the invitation for <strong>${groupParam || 'your research group'}</strong>.
              </p>
              <div style="background-color: #f0f7ff; border: 1px solid #b3d4f5; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <strong style="color: #1a5fa8; display: block; margin-bottom: 4px;">ℹ️ How to Sign In:</strong>
                <span>Please sign in using your group leader's credentials${leaderParam ? ` (<strong>${leaderParam}</strong>)` : ''} to access the unified research dashboard.</span>
              </div>
            </div>
          `,
          confirmButtonColor: '#7B1F35',
          confirmButtonText: 'Proceed to Sign In'
        });

        // Clean query parameters from URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      };

      acceptInvitation();
    }
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Validate @phinmaed.com domain — no personal emails allowed
      if (!trimmedEmail.endsWith('@phinmaed.com')) {
        setError('❌ Please use your institutional email (@phinmaed.com) to sign in.');
        setLoading(false);
        return;
      }

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      // Save or remove remembered email
      if (rememberMe) {
        localStorage.setItem('student_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('student_remembered_email');
      }

      // Fetch student document from Firestore to get full name & group info
      const studentsRef = collection(db, 'students');
      let studentData = null;
      try {
        const directSnap = await getDoc(doc(db, 'students', user.uid));
        if (directSnap.exists()) {
          studentData = directSnap.data();
        } else {
          const q = query(studentsRef, where('uid', '==', user.uid));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            studentData = snapshot.docs[0].data();
          } else {
            const qEmail = query(studentsRef, where('email', '==', trimmedEmail));
            const snapshotEmail = await getDocs(qEmail);
            if (!snapshotEmail.empty) {
              studentData = snapshotEmail.docs[0].data();
            }
          }
        }
      } catch (e) {
        console.warn('Error reading student doc:', e.message);
      }

      let displayName = user.displayName || trimmedEmail.split('@')[0];
      let groupName = 'Your Group';
      let adviserName = 'Your Adviser';
      
      if (studentData) {
        displayName = studentData.displayName || (studentData.firstName ? `${studentData.firstName} ${studentData.lastName || ''}`.trim() : null) || displayName;
        groupName = studentData.groupName || studentData.groupMembers?.groupName || 'Your Group';
        adviserName = studentData.invitedByName || studentData.groupMembers?.invitedByName || 'Your Adviser';
      }

      const initials = displayName.substring(0, 2).toUpperCase();

      // Call onLogin with student info
      if (onLogin) onLogin(displayName, initials, groupName, adviserName);

      // ✅ Log student login
      await logActivity({
        user:    trimmedEmail,
        role:    'Student',
        action:  'Logged in to Student Portal',
        status:  'Success',
        details: `Group: ${groupName} | Adviser: ${adviserName}`,
      });

    } catch (err) {
      console.error('Login error:', err);
      
      let errMsg = '❌ Login failed. Please try again.';
      if (err.code === 'auth/user-not-found') {
        errMsg = '❌ Email not found. Please check your email or create an account.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = '❌ Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = '❌ Invalid email format.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = '❌ Email or password is incorrect.';
      }
      setError(errMsg);

      // ❌ Log failed student login
      await logActivity({
        user:    email.trim().toLowerCase() || 'unknown',
        role:    'Student',
        action:  'Failed login attempt',
        status:  'Failed',
        details: err.code || 'Invalid credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen max-h-screen font-serif overflow-hidden relative">

      {/* LEFT PANEL — Dark Maroon with Archivio Branding */}
      <div className="w-[42%] h-full flex flex-col items-center justify-center py-6 px-8 relative z-20">
        {/* Background Layer at back of torn-edge */}
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none z-10"
          style={{ backgroundImage: `url("${parchmentBg}")`, backgroundColor: '#390c16' }}
        />

        <img 
          src={tornEdge} 
          alt="Torn Edge Divider" 
          className="absolute right-0 translate-x-[20%] top-0 h-full w-12 sm:w-14 lg:w-16 object-fill pointer-events-none z-20"
        />
        
        {/* Decorative Top Lines */}
        <div className="absolute top-0 left-0 w-full h-48 flex justify-around px-8 opacity-20 pointer-events-none z-20">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-gradient-to-b from-white to-transparent" />
          ))}
        </div>

        {/* Branding Container */}
        <div className="flex flex-col items-center z-30 my-auto">
          {/* Logo & Subheading */}
          <div className="flex flex-col items-center mb-3">
            <img
              src={swuLogoSeal}
              alt="SWU University Seal"
              className="w-[70px] h-[70px] object-contain mb-2 bg-white rounded-full p-1 shadow-md" 
            />
            <span className="text-[#C6A87C] text-xs font-sans tracking-[0.2em] font-medium uppercase">
              SWU Phinma
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-white text-3xl lg:text-[2.75rem] font-serif tracking-widest mb-2">
            ARCHIVIO
          </h1>

          {/* Diamond Divider */}
          <div className="flex items-center gap-3 mb-3 w-full max-w-[280px]">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C6A87C]/60"></div>
            <div className="w-1.5 h-1.5 rotate-45 bg-[#C6A87C]"></div>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C6A87C]/60"></div>
          </div>

          {/* Subtitle */}
          <p className="text-[#C6A87C] text-sm lg:text-base font-serif mb-6 lg:mb-8 tracking-wide text-center">
            Research Archive Management System
          </p>

          {/* Stats Box */}
          <div className="flex bg-[#4f1826] rounded-xl py-3 px-6 border border-white/5 shadow-xl w-full max-w-[340px] justify-between">
            <div className="flex flex-col items-center">
              <span className="text-[#C6A87C] text-xl font-serif font-bold mb-0.5">24</span>
              <span className="text-white/70 text-[11px] font-sans tracking-wide">Submissions</span>
            </div>
            <div className="w-[1px] bg-white/10 mx-2"></div>
            <div className="flex flex-col items-center">
              <span className="text-[#C6A87C] text-xl font-serif font-bold mb-0.5">8</span>
              <span className="text-white/70 text-[11px] font-sans tracking-wide">Pending</span>
            </div>
            <div className="w-[1px] bg-white/10 mx-2"></div>
            <div className="flex flex-col items-center">
              <span className="text-[#C6A87C] text-xl font-serif font-bold mb-0.5">156</span>
              <span className="text-white/70 text-[11px] font-sans tracking-wide">Published</span>
            </div>
          </div>
        </div>

        {/* Create Account Link */}
        <div className="text-center z-10 pb-4">
          <button
            onClick={() => onSwitchPage('signup')}
            className="bg-transparent border-none text-white/60 text-xs sm:text-sm font-sans cursor-pointer hover:text-white transition-colors underline-offset-4 hover:underline"
          >
            Create an Account
          </button>
        </div>
      </div>

      {/* RIGHT PANEL — Parchment background with White Login Card */}
      <div 
        className="w-[58%] h-full bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center p-6 lg:p-10 z-10 overflow-hidden"
        style={{ backgroundImage: `url(${parchmentBg})` }}
      >
        <div className="w-full max-w-[440px] flex flex-col items-start pl-2 my-auto">

          {/* Heading Section */}
          <div className="mb-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#2A1115] mb-1 font-serif tracking-tight">
              Welcome Back!
            </h2>
            <div className="inline-block relative pb-1">
              <p className="text-xs sm:text-sm font-sans text-gray-600 tracking-wide">
                Sign in to your ARCHIVIO account
              </p>
              <div className="absolute bottom-0 left-0 w-10 h-[2.5px] bg-[#C6A87C]" />
            </div>
          </div>

          {/* White Sign-In Card Container */}
          <div className="w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-t-[4px] border-[#6B0F1A] p-6 sm:p-7 box-border">
            
            <div className="mb-3">
              <h3 className="text-lg lg:text-xl font-bold text-[#222] font-sans mb-0.5">
                Sign In
              </h3>
              <p className="text-[11px] font-sans text-gray-400">
                Enter your institutional email and password
              </p>
            </div>

            <hr className="border-gray-100 mb-4" />

            {inviteAcceptedNotice && (
              <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-emerald-600 text-sm">✅</span>
                <div className="text-[11px] text-emerald-800 leading-relaxed font-sans">
                  <strong className="block font-semibold text-emerald-900 mb-0.5">Invitation Accepted!</strong>
                  You have joined <strong>{inviteAcceptedNotice.group}</strong>. Sign in below using your group leader's credentials.
                </div>
              </div>
            )}

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-red-500 text-xs">⚠️</span>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="flex flex-col gap-3">

              {/* Email Input Field */}
              <div>
                <label className="block text-[10px] font-bold font-sans text-gray-400 tracking-wider uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your @phinmaed.com email"
                    className="w-full py-2.5 pl-10 pr-4 bg-[#FBF9F6] border border-gray-200 rounded-lg text-xs sm:text-sm font-sans text-gray-700 outline-none box-border focus:border-[#6B0F1A] focus:bg-white transition-all disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div>
                <label className="block text-[10px] font-bold font-sans text-gray-400 tracking-wider uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full py-2.5 pl-10 pr-14 bg-[#FBF9F6] border border-gray-200 rounded-lg text-xs sm:text-sm font-sans text-gray-700 outline-none box-border focus:border-[#6B0F1A] focus:bg-white transition-all disabled:opacity-50"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#6B0F1A] text-xs font-semibold font-sans hover:underline p-0 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex justify-between items-center mt-0.5 mb-1 text-xs font-sans">
                <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-3.5 h-3.5 accent-[#6B0F1A] cursor-pointer rounded border-gray-300 disabled:opacity-50"
                  />
                  <span className="text-[11px]">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => onSwitchPage('forgot-password')}
                  className="bg-transparent border-none text-[#6B0F1A] text-[11px] font-medium cursor-pointer p-0 hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 bg-[#670319] text-white border-none rounded-lg text-xs sm:text-sm font-sans font-bold tracking-wide cursor-pointer transition-all duration-200 hover:bg-[#520214] active:scale-[0.99] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading ? 'Signing In...' : 'Sign In to ARCHIVIO'}
              </button>

            </form>
          </div>
        </div>
      </div>

      {/* TORN EDGE DIVIDER */}
      <div className="absolute top-0 w-[60px] h-full z-20 pointer-events-none" style={{ left: 'calc(42% - 30px)' }}>
        <svg viewBox="0 0 60 1000" preserveAspectRatio="none" className="w-full h-full block" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L0,1000 Q10,980 6,960 Q18,940 8,920 Q20,900 5,880 Q15,860 3,840 Q22,820 10,800 Q18,780 4,760 Q16,740 7,720 Q24,700 9,680 Q19,660 2,640 Q21,620 11,600 Q17,580 5,560 Q23,540 8,520 Q20,500 3,480 Q22,460 12,440 Q16,420 4,400 Q24,380 9,360 Q18,340 2,320 Q21,300 11,280 Q15,260 5,240 Q23,220 7,200 Q19,180 3,160 Q22,140 10,120 Q17,100 4,80 Q20,60 8,40 Q14,20 0,0 Z" fill="#390c16" />
        </svg>
      </div>

    </div>
  );
}
