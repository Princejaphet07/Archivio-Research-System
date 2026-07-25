import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';
import edge from '../assets/edge.png'; 
import bg from '../assets/parchment.png';

function ArchiveLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Where to redirect after login (e.g., if they tried to view a paper first)
  const from = location.state?.from?.pathname || '/';

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter both email and password.' });
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Swal.fire({ icon: 'success', title: 'Welcome Back!', timer: 1500, showConfirmButton: false });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
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
      
      {/* LEFT SIDE: Maroon Panel */}
      <div className="w-full md:w-[45%] bg-[#24050f] text-white flex flex-col justify-between p-12 relative z-20">
        
        <img 
          src={edge} 
          alt="Torn Edge" 
          className="absolute top-0 right-0 h-full w-10 md:w-14 translate-x-1/2 pointer-events-none z-50 object-cover"
        />

        <div className="flex flex-col items-center text-center my-auto space-y-6 relative z-30">
          <div className="bg-white/5 p-2 rounded-full mb-2">
            <img src={logo} alt="Archivio Logo" className="w-28 h-28 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold tracking-widest text-[#f3e5ab]">ARCHIVIO</h1>
          <h2 className="text-sm font-medium tracking-wide text-amber-200/80 italic">Research Archive Management System</h2>
          <p className="text-xs text-stone-300 max-w-sm leading-relaxed">
            Access thousands of approved academic papers, theses, and capstone projects from SWU PHINMA students and faculty.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 bg-black/20 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center relative z-30">
          <div>
            <p className="text-lg font-bold text-amber-200">1,248</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Papers</p>
          </div>
          <div className="border-x border-white/10">
            <p className="text-lg font-bold text-amber-200">342</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Authors</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-200">27</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Program</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Welcome Panel */}
      <div 
        className="w-full md:w-[55%] flex items-center justify-center p-8 relative z-10"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-xl max-w-md w-full border border-stone-200/60 flex flex-col items-center">
          <h3 className="text-2xl font-bold text-stone-800 tracking-wide mb-1">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="text-xs text-stone-500 text-center mb-6">
            {isLogin ? 'Sign in to access restricted papers and your reading list.' : 'Sign up to read restricted full texts and bookmark your favorites.'}
          </p>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-4 font-sans">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded outline-none focus:border-[#24050f] text-sm text-stone-700"
                placeholder="juan@swu.phinma.edu.ph"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded outline-none focus:border-[#24050f] text-sm text-stone-700"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 bg-[#24050f] text-white rounded text-sm font-bold tracking-wider uppercase shadow-md transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#3f081b] cursor-pointer'}`}
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="w-full text-center mb-4">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-[#5a1528] hover:underline font-sans cursor-pointer font-bold"
            >
              {isLogin ? "Don't have an account? Sign up here" : "Already have an account? Log in here"}
            </button>
          </div>

          <div className="w-full flex items-center my-2">
            <div className="flex-1 h-[1px] bg-stone-200"></div>
            <span className="px-3 text-xs text-stone-400 italic">or</span>
            <div className="flex-1 h-[1px] bg-stone-200"></div>
          </div>

          <button onClick={handleGoogleAuth} className="w-full py-3 px-4 border border-stone-300 rounded-lg flex items-center justify-center space-x-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors mb-4 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* LINK PABALIK SA HOME */}
          <div className="mt-8">
            <Link to="/" className="text-xs text-stone-500 hover:text-stone-800 flex items-center space-x-1 transition-colors">
              <span>←</span>
              <span>Back to Archive</span>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ArchiveLogin;