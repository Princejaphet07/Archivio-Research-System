import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import logoImg from '../assets/logo.png';
import bgTexture from '../assets/Rectangle 9 (2).png';
import leftPanelBg from '../assets/left-panel-bg.png';
import jaggedEdge from '../assets/jagged-edge.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

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
        setError('❌ Please use your institutional email (@phinmaed.com) to sign in.');
        setLoading(false);
        return;
      }

      console.log('Login attempt:', { email: trimmedEmail, passwordLength: trimmedPassword.length });

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);

      console.log('Login successful:', userCredential.user.email);

      // Login successful - protected routes will handle redirect
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);

      if (err.code === 'auth/user-not-found') {
        setError('❌ Email not found. Please check your email or create an account.');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Invalid email format.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('❌ Email or password is incorrect. Please try again.');
      } else {
        setError(`❌ Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-800 overflow-x-hidden">

      {/* Left Column: Info Panel */}
      <div
        className="w-full lg:w-[40%] text-white flex flex-col items-center justify-center py-12 px-10 xl:px-16 relative shadow-2xl z-10"
        style={{
          backgroundImage: `url("${leftPanelBg}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center'
        }}
      >
        {/* Fixed Jagged Edge */}
        <img
          src={jaggedEdge}
          className="absolute top-0 right-0 h-full w-[36px] translate-x-1/2 z-30 pointer-events-none hidden lg:block object-cover"
          alt=""
        />

        {/* Header section */}
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-[#542133]/40 rounded-full flex items-center justify-center border border-[#d0a36e] mb-4 backdrop-blur-sm">
            <img src={logoImg} alt="Archivio Logo" className="w-14 h-14 object-contain" />
          </div>
          <p className="text-[#d0a36e] text-xs tracking-[0.2em] font-semibold uppercase mb-2">SWU Phinma</p>
          <h1 className="text-5xl font-serif tracking-widest mb-4 font-bold">ARCHIVIO</h1>
          <div className="w-2 flex gap-1 mb-4 text-[#d0a36e]">♦</div>
          <h2 className="text-lg font-serif text-[#d0a36e] mb-3">Research Archive Management System</h2>
        </div>

        {/* Stats Row */}
        <div className="flex w-full max-w-sm justify-between border border-[#5a1f33]/60 rounded-xl p-4 mb-6 bg-[#481426]/50 backdrop-blur-sm relative z-10">
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">24</div>
            <div className="text-[11px] text-gray-300 mt-1">Submissions</div>
          </div>
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">8</div>
            <div className="text-[11px] text-gray-300 mt-1">Pending</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">156</div>
            <div className="text-[11px] text-gray-300 mt-1">Published</div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center p-6 bg-[#f5f0e6]"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-lg mx-auto relative z-10 pl-4">

          {/* Welcome Text Area */}
          <div className="mb-6">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Welcome Back!</h1>
            <p className="text-sm text-gray-600 mb-3">Sign in to your ARCHIVIO account</p>
            <div className="w-12 h-[2px] bg-[#d0a36e]"></div>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-xl shadow-2xl w-full p-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-[11px] text-gray-400">Enter your institutional email and password</p>
            </div>

            <hr className="border-gray-100 mb-5" />

            <form onSubmit={handleLogin}>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Email Address */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="Enter your @phinmaed.com email"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-12 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition disabled:opacity-50"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-3.5 h-3.5 text-[#7a2e46] bg-gray-100 border-gray-300 rounded focus:ring-[#7a2e46]"
                  />
                  <label className="ml-2 text-[11px] text-gray-600">Remember me</label>
                </div>
                <Link to="#" className="text-[11px] font-semibold text-[#7a2e46] hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7a2e46] hover:bg-[#5f2135] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-sm"
              >
                {loading ? 'Signing In...' : 'Sign In to ARCHIVIO'}
              </button>

              <div className="mt-5 text-center text-xs text-gray-500">
                Don't have an account? <Link to="/signup" className="text-[#7a2e46] font-semibold hover:underline">Sign Up here</Link>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
                <p className="font-semibold mb-1">📧 Invited via Email?</p>
                <p className="mb-2">If you received an invitation email from your Dean, click the activation link in the email to create your account.</p>
                <p className="text-[10px] text-blue-700">The activation link looks like: <span className="font-mono">http://localhost:5176/adviser-activate?token=...</span></p>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;