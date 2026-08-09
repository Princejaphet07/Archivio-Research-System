import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';
import bg from '../assets/parchment.png';

function ArchiveLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ papers: 0, authors: 0, programs: 0 });
  const { isDarkMode, toggleTheme } = useTheme();
  
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

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!name || !confirmPassword))) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all required fields.' });
      return;
    }
    
    if (!isLogin && password !== confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Passwords Mismatch', text: 'Your passwords do not match. Please try again.' });
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Swal.fire({ icon: 'success', title: 'Welcome Back!', timer: 1500, showConfirmButton: false });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        Swal.fire({ icon: 'success', title: 'Account Created!', text: 'Welcome to Archivio.', timer: 1500, showConfirmButton: false });
      }
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      let msg = 'Authentication failed. Please check your credentials.';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please log in.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') msg = 'Invalid email or password.';
      Swal.fire({ icon: 'error', title: 'Oops...', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      Swal.fire({ icon: 'success', title: 'Welcome!', timer: 1500, showConfirmButton: false });
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Google Auth Failed', text: error.message || 'Could not sign in with Google.' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden font-serif">
      
      {/* THEME TOGGLE (Absolute Top Right) */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-4 right-4 z-[60] p-2.5 bg-black/20 md:bg-white/10 dark:bg-black/40 text-amber-100 hover:bg-black/40 transition rounded-full backdrop-blur-sm border border-white/10 shadow-lg"
        title="Toggle Dark Mode"
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

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
              <span className="text-xl">🔓</span>
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
        className="w-full md:w-[55%] h-[75vh] md:h-full flex items-center justify-center p-4 md:p-8 relative z-10 transition-colors overflow-y-auto"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 md:p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] max-w-md w-full border border-white/40 dark:border-gray-700/50 flex flex-col items-center transition-colors my-auto md:my-auto pb-8 md:pb-10 relative">
          
          {/* Animated Toggle Switch */}
          <div className="flex bg-stone-200/50 dark:bg-gray-800/50 p-1 rounded-full mb-6 w-full max-w-[240px] relative mt-2 md:mt-0">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-full shadow-sm transition-transform duration-300 ease-in-out"
              style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}
            ></div>
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 text-xs font-bold py-2 rounded-full relative z-10 transition-colors ${isLogin ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400'}`}
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 text-xs font-bold py-2 rounded-full relative z-10 transition-colors ${!isLogin ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400'}`}
            >
              Sign Up
            </button>
          </div>

          <h3 className="text-2xl font-bold text-stone-800 dark:text-gray-100 tracking-wide mb-1">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-gray-400 text-center mb-6">
            {isLogin ? 'Sign in to access restricted papers and your reading list.' : 'Sign up to read restricted full texts and bookmark your favorites.'}
          </p>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-4 font-sans">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors"
                placeholder="juan@swu.phinma.edu.ph"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700" title="Toggle Password Visibility">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
              {isLogin && (
                <div className="flex justify-end mt-1">
                  <Link to="/forgot-password" className="text-[11px] font-bold text-stone-500 dark:text-gray-400 hover:text-[#24050f] dark:hover:text-[#f3e5ab] transition-colors">
                    Forgot Password?
                  </Link>
                </div>
              )}
              
              {/* Password Strength Meter (Only for Signup) */}
              {!isLogin && password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5 mb-1">
                    {[1, 2, 3, 4].map(level => {
                      const strength = calculatePasswordStrength(password);
                      let bgColor = "bg-stone-200 dark:bg-gray-700";
                      if (level <= strength) {
                        if (strength <= 1) bgColor = "bg-red-500";
                        else if (strength === 2) bgColor = "bg-orange-400";
                        else if (strength === 3) bgColor = "bg-yellow-400";
                        else bgColor = "bg-green-500";
                      }
                      return <div key={level} className={`flex-1 rounded-full transition-colors duration-300 ${bgColor}`}></div>;
                    })}
                  </div>
                  <p className="text-[9px] text-stone-500 dark:text-gray-400 text-right">
                    {calculatePasswordStrength(password) <= 1 && "Weak"}
                    {calculatePasswordStrength(password) === 2 && "Fair"}
                    {calculatePasswordStrength(password) === 3 && "Good"}
                    {calculatePasswordStrength(password) === 4 && "Strong"}
                  </p>
                </div>
              )}
            </div>
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700" title="Toggle Password Visibility">
                    {showPassword ? (
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
                  className="mt-1 cursor-pointer w-4 h-4 accent-[#3d0c1b]"
                />
                <label htmlFor="terms" className="text-xs text-stone-500 dark:text-gray-400 leading-snug">
                  I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#3d0c1b] dark:text-[#d6ad60] font-bold hover:underline cursor-pointer">Terms and Conditions</button> and acknowledge the Privacy Policy.
                </label>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || (!isLogin && !agreedToTerms)}
              className={`w-full py-3 bg-[#24050f] text-white rounded text-sm font-bold tracking-wider uppercase shadow-md transition-colors ${loading || (!isLogin && !agreedToTerms) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#3f081b] cursor-pointer'}`}
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {/* Removed the old text-based toggle button here */}

          <div className="w-full flex items-center my-2">
            <div className="flex-1 h-[1px] bg-stone-200 dark:bg-gray-600"></div>
            <span className="px-3 text-xs text-stone-400 dark:text-stone-500 italic">or</span>
            <div className="flex-1 h-[1px] bg-stone-200 dark:bg-gray-600"></div>
          </div>

          <button onClick={handleGoogleAuth} className="w-full py-3 px-4 border border-stone-300 dark:border-gray-600 rounded-lg flex items-center justify-center space-x-3 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors mb-4 cursor-pointer shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with SWU PHINMA Email</span>
          </button>

          {/* LINK PABALIK SA HOME */}
          <div className="mt-8">
            <Link to="/" className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 flex items-center space-x-1 transition-colors">
              <span>←</span>
              <span>Back to Archive</span>
            </Link>
          </div>
        </div>
      </div>

      {/* TERMS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-fadeIn">
            <div className="flex justify-between items-center p-6 border-b border-stone-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-[#3d0c1b] dark:text-[#f3e5ab]">Terms and Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto font-sans text-sm text-stone-700 dark:text-gray-300 space-y-4">
              <p>Welcome to <strong>ARCHIVIO</strong>, the Research Archive Management System for SWU PHINMA.</p>
              
              <h3 className="font-bold text-stone-900 dark:text-gray-100 text-base mt-4">1. Acceptance of Terms</h3>
              <p>By creating an account, you agree to abide by these Terms and Conditions. This system is strictly for academic and research purposes.</p>
              
              <h3 className="font-bold text-stone-900 dark:text-gray-100 text-base mt-4">2. Intellectual Property & Plagiarism</h3>
              <p>All research papers, theses, and capstone projects hosted on ARCHIVIO are the intellectual property of their respective student authors and SWU PHINMA. Users are strictly prohibited from copying, plagiarizing, distributing, or selling any materials found within this archive. The system disables copying and downloading to enforce academic integrity.</p>

              <h3 className="font-bold text-stone-900 dark:text-gray-100 text-base mt-4">3. User Conduct</h3>
              <p>You agree to use the platform respectfully. Any unauthorized attempts to scrape data, bypass security measures, or misrepresent your identity will result in immediate account termination.</p>

              <h3 className="font-bold text-stone-900 dark:text-gray-100 text-base mt-4">4. Privacy Data</h3>
              <p>Your email and name are collected solely for authentication and personalizing your experience (such as your personal reading list). We do not share this data with third-party advertisers.</p>
            </div>
            <div className="p-6 border-t border-stone-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowTermsModal(false)} className="px-6 py-2 bg-[#3d0c1b] text-white rounded font-bold hover:bg-[#24050f] transition">
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