import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { logActivity } from '../../firebase/logActivity';
import { AlertCircle, Mail, Lock } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import bgTexture from '../../assets/Rectangle 9 (2).png';
import leftPanelBg from '../../assets/left-panel-bg.png';
import jaggedEdge from '../../assets/jagged-edge.png';
import { useRepositoryStats } from '../../utils/useRepositoryStats';

function Login() {
  const navigate = useNavigate();
  const { stats } = useRepositoryStats();
  const [email, setEmail] = useState(localStorage.getItem('adviser_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('adviser_remembered_email'));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Trim whitespace from email and password
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Validate @phinmaed.com domain — no personal emails allowed
      if (!trimmedEmail.endsWith('@phinmaed.com')) {
        setError('Please use your institutional email (@phinmaed.com) to sign in.');
        setLoading(false);
        return;
      }

      console.log('Login attempt:', { email: trimmedEmail, passwordLength: trimmedPassword.length });

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);

      console.log('Login successful:', userCredential.user.email);

      if (rememberMe) {
        localStorage.setItem('adviser_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('adviser_remembered_email');
      }

      await logActivity({
        user: trimmedEmail,
        role: 'Adviser',
        action: 'Log in',
        status: 'Success'
      });

      // Login successful - protected routes will handle redirect
      navigate('/adviser/dashboard');
    } catch (err) {
      console.error('Login error:', err);

      if (err.code === 'auth/user-not-found') {
        setError('Email not found. Please check your email or create an account.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email or password is incorrect. Please try again.');
      } else {
        setError(`Login failed: ${err.message}`);
      }

      await logActivity({
        user: email.trim().toLowerCase() || 'unknown',
        role: 'Adviser',
        action: 'Failed login attempt',
        status: 'Failed',
        details: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex font-sans text-gray-800 overflow-hidden bg-[#f5f0e6]">

      {/* Left Column: Info Panel */}
      <div className="hidden lg:flex w-[40%] h-full text-white flex-col items-center justify-center py-6 px-8 xl:px-12 relative z-20">
        {/* Background Layer at back of torn-edge */}
        <div 
          className="absolute inset-0 bg-cover bg-top pointer-events-none z-10"
          style={{ backgroundImage: `url("${leftPanelBg}")`, backgroundColor: '#4a1525' }}
        />

        {/* Fixed Jagged Edge */}
        <img
          src={jaggedEdge}
          className="absolute top-0 right-0 h-full w-12 sm:w-14 lg:w-16 translate-x-[20%] z-20 pointer-events-none object-fill"
          alt="Torn Edge"
        />

        {/* Header section */}
        <div className="flex flex-col items-center mb-6 relative z-30">
          <div className="w-16 h-16 bg-[#542133]/40 rounded-full flex items-center justify-center border border-[#d0a36e] mb-3 backdrop-blur-sm">
            <img src={logoImg} alt="Archivio Logo" className="w-12 h-12 object-contain" />
          </div>
          <p className="text-[#d0a36e] text-[11px] tracking-[0.2em] font-semibold uppercase mb-1">SWU Phinma</p>
          <h1 className="text-4xl xl:text-5xl font-serif tracking-widest mb-2 font-bold">ARCHIVIO</h1>
          <div className="w-2 flex gap-1 mb-2 text-[#d0a36e]">♦</div>
          <h2 className="text-sm font-serif text-[#d0a36e] mb-2 text-center">Research Archive Management System</h2>
        </div>

        {/* Stats Row */}
        <div className="flex w-full max-w-sm justify-between border border-[#5a1f33]/60 rounded-xl p-3 bg-[#481426]/50 backdrop-blur-sm relative z-10">
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">{stats.total}</div>
            <div className="text-[10px] text-gray-300 mt-0.5">Submissions</div>
          </div>
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">{stats.pending}</div>
            <div className="text-[10px] text-gray-300 mt-0.5">Pending</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">{stats.published}</div>
            <div className="text-[10px] text-gray-300 mt-0.5">Published</div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div
        className="w-full lg:w-[60%] h-full flex flex-col justify-center items-center p-4 lg:p-6 bg-[#f5f0e6] transition-colors overflow-hidden"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-md mx-auto relative z-10 my-auto">

          {/* Welcome Text Area */}
          <div className="mb-4">
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-1">Welcome Back!</h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Sign in to your ARCHIVIO account</p>
            <div className="w-12 h-[2px] bg-[#d0a36e]"></div>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-xl shadow-2xl w-full p-6 sm:p-7 border border-transparent backdrop-blur-sm">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">Sign In</h2>
              <p className="text-[11px] text-gray-400">Enter your institutional email and password</p>
            </div>

            <hr className="border-gray-100 mb-3.5" />

            <form onSubmit={handleLogin}>
              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Email Address */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="Enter your @phinmaed.com email"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#770000] transition disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-12 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#770000] transition disabled:opacity-50"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-[#770000] hover:text-[#590000]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-3.5 h-3.5 text-[#770000] bg-gray-100 border-gray-300 rounded focus:ring-[#770000]"
                  />
                  <label className="ml-2 text-[11px] text-gray-600">Remember me</label>
                </div>
                <Link to="/adviser/forgot-password" className="text-[11px] font-semibold text-[#770000] hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#770000] hover:bg-[#590000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 text-xs sm:text-sm"
              >
                {loading ? 'Signing In...' : 'Sign In to ARCHIVIO'}
              </button>

              <div className="mt-3 text-center text-xs text-gray-500">
                Don't have an account? <Link to="/adviser/signup" className="text-[#770000] font-semibold hover:underline">Sign Up here</Link>
              </div>

              <div className="mt-3 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-[10.5px] text-blue-800">
                <p className="font-semibold mb-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Invited via Email?
                </p>
                <p className="text-[10px]">If you received an invitation email from your Dean, click the activation link in the email to activate your account.</p>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
