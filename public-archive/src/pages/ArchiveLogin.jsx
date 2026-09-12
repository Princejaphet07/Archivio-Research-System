import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';
import bg from '../assets/parchment.png';
import { useTheme } from '../context/ThemeContext';

function ArchiveLogin() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ papers: 0, authors: 0, programs: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Where to redirect after login
  const from = location.state?.from?.pathname || '/';

  const calculatePasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 6) score += 1;
    if (pass.length > 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };

  useEffect(() => {
    const qSubs = query(collection(db, 'submissions'), where('reviewStatus', '==', 'published'));
    const qGroups = query(collection(db, 'groups'));

    let subsList = [];
    let groupsList = [];

    const computeStats = () => {
      if (!subsList.length) return;

      const uniqueAuthors = new Set();
      const uniquePrograms = new Set();

      subsList.forEach(sub => {
        const group = groupsList.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
        if (sub.studentUid) uniqueAuthors.add(sub.studentUid);
        const program = group?.program || sub.program;
        if (program) uniquePrograms.add(program);
      });

      setStats({
        papers: subsList.length,
        authors: uniqueAuthors.size,
        programs: uniquePrograms.size || 0
      });
    };

    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      subsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStats();
    });

    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      groupsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeStats();
    });

    return () => {
      unsubSubs();
      unsubGroups();
    };
  }, []);

  const fireAlert = (options) => {
    return Swal.fire({
      background: isDarkMode ? '#1c1518' : '#ffffff',
      color: isDarkMode ? '#f5f5f5' : '#1c1917',
      confirmButtonColor: '#7a2039',
      ...options
    });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!name || !confirmPassword))) {
      fireAlert({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all required fields.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Enforce @phinmaed.com domain strictly
    if (!cleanEmail.endsWith('@phinmaed.com')) {
      fireAlert({
        icon: 'error',
        title: 'Access Restricted',
        text: 'Access to ARCHIVIO Public Archive is strictly restricted to official PHINMA Education accounts (@phinmaed.com). Non-PHINMA emails cannot sign in or register.'
      });
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      fireAlert({ icon: 'warning', title: 'Passwords Mismatch', text: 'Your passwords do not match. Please try again.' });
      return;
    }

    // Password strength requirements for Sign Up
    if (!isLogin) {
      const missingReqs = [];
      if (!/[A-Z]/.test(password)) missingReqs.push('at least 1 uppercase letter (A-Z)');
      if (!/[0-9]/.test(password)) missingReqs.push('at least 1 number (0-9)');
      if (!/[^A-Za-z0-9]/.test(password)) missingReqs.push('at least 1 special character (!@#$%^&*)');
      if (password.length < 8) missingReqs.push('minimum 8 characters');
      if (missingReqs.length > 0) {
        fireAlert({
          icon: 'warning',
          title: 'Weak Password',
          html: `Your password must have:<br><ul style="text-align:left;margin-top:8px">${missingReqs.map(r => `<li>&bull; ${r}</li>`).join('')}</ul>`
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        fireAlert({ icon: 'success', title: 'Welcome Back!', timer: 1500, showConfirmButton: false });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(userCredential.user, { displayName: name });
        fireAlert({ icon: 'success', title: 'Account Created!', text: 'Welcome to Archivio.', timer: 1500, showConfirmButton: false });
      }
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      let msg = 'Authentication failed. Please check your credentials.';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please log in.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') msg = 'Invalid email or password.';
      fireAlert({ icon: 'error', title: 'Oops...', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'phinmaed.com',
      prompt: 'select_account'
    });
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const userEmail = userCredential.user.email?.toLowerCase().trim();

      if (!userEmail || !userEmail.endsWith('@phinmaed.com')) {
        await auth.signOut();
        fireAlert({
          icon: 'error',
          title: 'Unauthorized Account',
          text: `The account (${userEmail || 'non-PHINMA'}) is not a @phinmaed.com account. Access is strictly restricted to PHINMA Education accounts.`
        });
        return;
      }

      fireAlert({ icon: 'success', title: 'Welcome!', timer: 1500, showConfirmButton: false });
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      fireAlert({ icon: 'error', title: 'Google Auth Failed', text: error.message || 'Could not sign in with Google.' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden font-serif">
      
      {/* LEFT SIDE: Maroon Panel */}
      <div className="w-full md:w-[45%] h-[25vh] md:h-full bg-[#24050f] text-white flex flex-col justify-center md:justify-between p-6 md:p-12 relative z-20 shadow-xl md:shadow-[15px_0_30px_-5px_rgba(0,0,0,0.6)]">        <div className="flex flex-col items-center text-center my-auto space-y-2 md:space-y-6 relative z-30">
          <div className="bg-white/5 p-2 rounded-full mb-1 hidden md:block">
            <img src={logo} alt="Archivio Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg" />
          </div>
          {/* Mobile Logo row */}
          <div className="md:hidden flex items-center gap-3">
            <img src={logo} alt="Archivio Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
            <h1 className="text-4xl font-bold tracking-widest text-[#f3e5ab]">ARCHIVIO</h1>
          </div>
          
          <h1 className="hidden md:block text-4xl md:text-5xl font-bold tracking-widest text-[#f3e5ab]">ARCHIVIO</h1>
          <h2 className="text-xs md:text-sm font-medium tracking-wide text-amber-200/80 italic mb-2">Research Archive Management System</h2>
          
          {/* PREMIUM FEATURES CHECKLIST */}
          <div className="hidden md:flex flex-col gap-2 mt-4 text-left w-full max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-stone-200 bg-white/5 p-2 rounded-lg backdrop-blur-sm border border-white/10 shadow-sm">
              <span className="text-xl">📖</span>
              <span className="text-xs font-sans tracking-wide">Read full-text PDF manuscripts</span>
            </div>
            <div className="flex items-center gap-3 text-stone-200 bg-white/5 p-2 rounded-lg backdrop-blur-sm border border-white/10 shadow-sm">
              <span className="text-xl">📚</span>
              <span className="text-xs font-sans tracking-wide">Create your personal reading list</span>
            </div>
            <div className="flex items-center gap-3 text-stone-200 bg-white/5 p-2 rounded-lg backdrop-blur-sm border border-white/10 shadow-sm">
              <span className="text-xl">🤖</span>
              <span className="text-xs font-sans tracking-wide">Access AI "Talk to Research" Assistant</span>
            </div>
          </div>

          <p className="hidden md:block text-xs text-stone-300 max-w-sm leading-relaxed mt-6">
            Access thousands of approved academic papers, theses, and capstone projects from SWU PHINMA students and faculty.
          </p>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-4 bg-black/20 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center relative z-30">
          <div>
            <p className="text-lg font-bold text-amber-200">{stats.papers}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Papers</p>
          </div>
          <div className="border-x border-white/10">
            <p className="text-lg font-bold text-amber-200">{stats.authors}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Authors</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-200">{stats.programs}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Program</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Welcome Panel */}
      <div 
        className="w-full md:w-[55%] h-[75vh] md:h-full flex items-center justify-center p-4 md:p-8 relative z-10 transition-colors overflow-y-auto bg-[#faf7f2] dark:bg-[#0d090b]"
      >
        {/* Background parchment texture (visible in light mode, subtly dimmed in dark mode) */}
        <div 
          className="absolute inset-0 z-0 opacity-100 dark:opacity-10 transition-opacity duration-300 pointer-events-none"
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />

        {/* Ambient warm radial glow in dark mode */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(122,32,57,0.2)_0%,transparent_70%)]" />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-stone-300/80 dark:border-white/15 text-stone-700 dark:text-[#f3e5ab] shadow-sm hover:scale-105 transition-all cursor-pointer backdrop-blur-md"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* Elevated Sign In / Sign Up Card */}
        <div className="bg-white/95 dark:bg-[#1c1518]/95 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] max-w-md w-full border border-stone-200/90 dark:border-white/15 flex flex-col items-center transition-all my-auto md:my-auto pb-8 md:pb-10 relative z-10">
          
          {/* Animated Toggle Switch */}
          <div className="flex bg-stone-200/70 dark:bg-black/50 p-1 rounded-full mb-6 w-full max-w-[240px] relative mt-2 md:mt-0 border border-stone-300/60 dark:border-white/10">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#7a2039] rounded-full shadow-sm dark:shadow-md transition-transform duration-300 ease-in-out"
              style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}
            ></div>
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 text-xs font-bold py-2 rounded-full relative z-10 transition-colors ${isLogin ? 'text-[#7a2039] dark:text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 text-xs font-bold py-2 rounded-full relative z-10 transition-colors ${!isLogin ? 'text-[#7a2039] dark:text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
            >
              Sign Up
            </button>
          </div>

          <h3 className="text-2xl font-bold text-stone-800 dark:text-[#f3e5ab] tracking-wide mb-1 font-serif">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-300 text-center mb-6">
            {isLogin ? 'Sign in to access restricted papers and your reading list.' : 'Sign up to read restricted full texts and bookmark your favorites.'}
          </p>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-4 font-sans">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500 dark:[&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f5f5f5]"
                    placeholder="Juan Dela Cruz"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500 dark:[&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f5f5f5]"
                  placeholder="yourname@phinmaed.com"
                />
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-medium">Official @phinmaed.com email address required</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  id="archive-password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-password="true"
                  data-no-copy="true"
                  data-is-password="true"
                  onCopy={(e) => { e.preventDefault(); return false; }}
                  onCut={(e) => { e.preventDefault(); return false; }}
                  onContextMenu={(e) => { e.preventDefault(); return false; }}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500 select-none dark:[&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f5f5f5]"
                  placeholder="••••••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-[#f3e5ab] transition-colors cursor-pointer" title="Toggle Password Visibility">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
              {isLogin && (
                <div className="flex justify-end mt-1.5">
                  <Link to="/forgot-password" className="text-[11px] font-bold text-[#7a2039] dark:text-[#f3e5ab] hover:underline transition-colors">
                    Forgot Password?
                  </Link>
                </div>
              )}
              
              {/* Password Strength Meter + Requirements (Only for Signup) */}
              {!isLogin && password && (
                <div className="mt-2 space-y-2">
                  {/* Strength Bar */}
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map(level => {
                      const strength = calculatePasswordStrength(password);
                      let bgColor = "bg-stone-200 dark:bg-white/10";
                      if (level <= strength) {
                        if (strength <= 1) bgColor = "bg-red-500";
                        else if (strength === 2) bgColor = "bg-orange-400";
                        else if (strength === 3) bgColor = "bg-yellow-400";
                        else bgColor = "bg-green-500";
                      }
                      return <div key={level} className={`flex-1 rounded-full transition-colors duration-300 ${bgColor}`}></div>;
                    })}
                  </div>
                  <p className="text-[9px] text-stone-500 dark:text-stone-300 text-right font-medium">
                    {calculatePasswordStrength(password) <= 1 && "Weak"}
                    {calculatePasswordStrength(password) === 2 && "Fair"}
                    {calculatePasswordStrength(password) === 3 && "Good"}
                    {calculatePasswordStrength(password) === 4 && "Strong"}
                  </p>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                    {[
                      { label: 'Uppercase (A-Z)', ok: /[A-Z]/.test(password) },
                      { label: 'Number (0-9)',    ok: /[0-9]/.test(password) },
                      { label: 'Special (!@#$%)', ok: /[^A-Za-z0-9]/.test(password) },
                      { label: '8+ Characters',  ok: password.length >= 8 },
                    ].map(({ label, ok }) => (
                      <span key={label} className={`flex items-center gap-1 text-[10px] font-sans font-medium transition-colors ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          {ok
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          }
                        </svg>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="confirmPassword"
                    id="archive-confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    data-password="true"
                    data-no-copy="true"
                    data-is-password="true"
                    onCopy={(e) => { e.preventDefault(); return false; }}
                    onCut={(e) => { e.preventDefault(); return false; }}
                    onContextMenu={(e) => { e.preventDefault(); return false; }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500 select-none dark:[&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f5f5f5]"
                    placeholder="••••••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-[#f3e5ab] transition-colors cursor-pointer" title="Toggle Confirm Password Visibility">
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {!isLogin && (
              <div className="flex items-start gap-3 mt-2 mb-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 cursor-pointer w-4 h-4 accent-[#7a2039] dark:accent-[#f3e5ab]"
                />
                <label htmlFor="terms" className="text-xs text-stone-600 dark:text-stone-300 leading-snug">
                  I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#7a2039] dark:text-[#f3e5ab] font-bold hover:underline cursor-pointer">Terms and Conditions</button> and acknowledge the Privacy Policy.
                </label>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || (!isLogin && !agreedToTerms)}
              className={`w-full py-3 bg-gradient-to-r from-[#7a2039] to-[#541223] hover:from-[#8b2440] hover:to-[#631529] text-white rounded-lg text-sm font-bold tracking-wider uppercase shadow-lg shadow-[#7a2039]/20 hover:shadow-[#7a2039]/40 transition-all cursor-pointer ${loading || (!isLogin && !agreedToTerms) ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.99]'}`}
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="relative flex items-center justify-center w-full mt-6 mb-4">
            <div className="absolute w-full border-t border-stone-300 dark:border-white/10"></div>
            <span className="bg-white dark:bg-[#1c1518] px-3 text-stone-400 dark:text-stone-400 text-xs italic relative z-10 font-sans rounded-full">or</span>
          </div>

          <button 
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-2.5 flex items-center justify-center gap-3 bg-white hover:bg-stone-50 dark:bg-white/5 dark:hover:bg-white/10 border border-stone-300 dark:border-white/15 rounded-lg font-sans font-medium text-sm text-stone-700 dark:text-stone-200 transition-all shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google (@phinmaed.com)</span>
          </button>

          {/* LINK PABALIK SA HOME */}
          <div className="mt-8">
            <Link to="/" className="text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-[#f3e5ab] flex items-center space-x-1.5 transition-colors font-medium">
              <span>&larr;</span>
              <span>Back to Archive</span>
            </Link>
          </div>
        </div>
      </div>

      {/* TERMS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] dark:bg-[#1a1416] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-stone-200 dark:border-white/10">
            <div className="flex justify-between items-center p-6 border-b border-stone-200 dark:border-white/10">
              <h2 className="text-2xl font-bold text-[#7a2039] dark:text-[#f3e5ab]">Terms and Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto font-sans text-sm text-stone-700 dark:text-stone-300 space-y-4">
              <p>Welcome to <strong>ARCHIVIO</strong>, the Research Archive Management System for SWU PHINMA.</p>

              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mt-4">1. Acceptance of Terms</h3>
              <p>By creating an account, you agree to abide by these Terms and Conditions. This system is strictly for academic and research purposes.</p>

              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mt-4">2. Intellectual Property &amp; Plagiarism</h3>
              <p>All research papers, theses, and capstone projects hosted on ARCHIVIO are the intellectual property of their respective student authors and SWU PHINMA. Users are strictly prohibited from copying, plagiarizing, distributing, or selling any materials found within this archive. The system disables copying and downloading to enforce academic integrity.</p>

              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mt-4">3. User Conduct</h3>
              <p>You agree to use the platform respectfully. Any unauthorized attempts to scrape data, bypass security measures, or misrepresent your identity will result in immediate account termination.</p>

              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mt-4">4. Privacy &amp; Data</h3>
              <p>Your email and name are collected solely for authentication and personalizing your experience (such as your personal reading list). We do not share this data with third-party advertisers.</p>
            </div>
            <div className="p-6 border-t border-stone-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }}
                className="px-6 py-2 bg-gradient-to-r from-[#7a2039] to-[#541223] text-white rounded-lg font-bold hover:brightness-110 transition cursor-pointer shadow-md"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchiveLogin;
