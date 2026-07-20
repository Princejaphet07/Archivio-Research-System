import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// I-import ang tanan nimo nga mga assets
import logo from '../assets/logo.png';
import loginBg from '../assets/parchment.png';
import tornEdge from '../assets/torn-edge.png';
import maroonBg from '../assets/maroon-bg.png'; 

function Login() {
  const navigate = useNavigate();

  // Navigation state sulod sa login: 'login' | 'recovery' | 'reset'
  const [view, setView] = useState('login');
  
  // Input states
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  
  // Recovery/Verification
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState(Array(6).fill(''));
  
  // Password Reset Validation
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasEightChars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  
  let strengthText = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthTextColor = 'text-red-500';
  
  if (strengthCount === 2 || strengthCount === 3) {
    strengthText = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthTextColor = 'text-amber-500';
  } else if (strengthCount === 4) {
    strengthText = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthTextColor = 'text-emerald-500';
  }

  const handleOtpChange = (value, index) => {
    if (isNaN(Number(value))) return;
    if (value.length > 1) value = value.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const resetToLogin = () => {
    setView('login');
    setEmail('');
    setCodeSent(false);
    setOtp(Array(6).fill(''));
    setNewPassword('');
    setConfirmPassword('');
  };

  // KINI ANG LOGIC SA PAGBALHIN NGADTO SA DASHBOARD
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    // Ibalhin dretso sa /dashboard route bisag walay sulod ang inputs
    navigate('/dashboard');
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
              <span className="text-[#d6ad60] font-bold text-2xl font-serif">24</span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-1">Submissions</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-2xl font-serif font-semibold">8</span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mt-1">Pending</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center px-2">
              <span className="text-[#d6ad60] font-bold text-2xl font-serif">156</span>
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
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                      {/* Gikuha nako ang required attribute diri */}
                      <input 
                        type="email" 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your @swu.phinma.edu.ph email" 
                        className="w-full pl-10 pr-4 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white transition-all placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                      {/* Gikuha nako ang required attribute diri */}
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Enter your password" 
                        className="w-full pl-10 pr-16 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220] focus:ring-1 focus:ring-[#3b1220] focus:bg-white transition-all placeholder:text-stone-400"
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
                    <button type="button" onClick={() => setView('recovery')} className="text-xs text-[#801e38] font-semibold hover:underline">Forgot password?</button>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#801e38] hover:bg-[#601328] text-white font-bold text-sm py-3.5 rounded-xl mt-4 shadow-md shadow-[#801e38]/10 transition-all cursor-pointer text-center"
                  >
                    Sign In to ARCHIVIO
                  </button>
                </form>
              </div>
            </>
          )}

          {/* VIEW: RECOVERY CARD */}
          {view === 'recovery' && (
            <div className="bg-white/95 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-8 sm:p-10 border-t-[4px] border-[#3b1220] backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#3b1220] rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <svg className="w-5 h-5 text-[#d6ad60]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Account Recovery</h3>
                <p className="text-xs text-stone-500 mt-1">Regain access to your ARCHIVIO account</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#801e38] tracking-wider uppercase">Step 1 — Enter Your Email</span>
                    {codeSent && <span className="text-[10px] font-bold text-emerald-600">✓ Sent</span>}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={codeSent}
                      placeholder="Enter your institutional email" 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none transition-all ${
                        codeSent ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed' : 'bg-[#fbfaf8] border-stone-200 focus:border-[#3b1220]'
                      }`}
                    />
                  </div>
                </div>

                {!codeSent ? (
                  <button 
                    type="button" 
                    onClick={() => email.trim() !== '' && setCodeSent(true)}
                    className="w-full bg-[#801e38] hover:bg-[#601328] text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all uppercase tracking-wider"
                  >
                    Send Verification Code
                  </button>
                ) : (
                  <div className="text-right">
                    <button onClick={() => setCodeSent(false)} className="text-xs text-[#801e38] font-bold hover:underline">Change email?</button>
                  </div>
                )}
              </div>

              <hr className="my-6 border-stone-100" />

              <div className={`transition-all ${codeSent ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <span className="block text-[10px] font-bold text-[#801e38] tracking-wider uppercase mb-3">Step 2 — Enter Verification Code</span>
                <div className="flex justify-between gap-2 mb-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      disabled={!codeSent}
                      className="w-11 h-12 text-center border rounded-xl text-lg font-bold bg-[#fbfaf8] border-stone-200 outline-none focus:border-[#3b1220]"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 mt-6">
                  <button type="button" onClick={resetToLogin} className="text-xs text-stone-500 font-bold hover:text-stone-800">← Back</button>
                  <button 
                    type="button"
                    disabled={!codeSent || otp.some(d => d === '')}
                    onClick={() => setView('reset')}
                    className="bg-[#801e38] hover:bg-[#601328] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    Verify & Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: RESET PASSWORD CARD */}
          {view === 'reset' && (
            <div className="bg-white/95 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.08)] p-8 sm:p-10 border-t-[4px] border-[#3b1220] backdrop-blur-sm">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-serif font-bold text-stone-900">Reset Password</h3>
                <p className="text-xs text-stone-500 mt-1">Create a new password</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (newPassword !== confirmPassword) return alert("Passwords do not match!");
                alert("Password updated!");
                resetToLogin();
              }}>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                    <input 
                      type={showNewPassword ? 'text' : 'password'} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password" 
                      className="w-full pl-10 pr-16 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220]"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-4 text-xs font-semibold text-[#801e38]">{showNewPassword ? 'Hide' : 'Show'}</button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password" 
                      className="w-full pl-10 pr-16 py-3 bg-[#fbfaf8] border border-stone-200 rounded-xl text-sm outline-none focus:border-[#3b1220]"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 text-xs font-semibold text-[#801e38]">{showConfirmPassword ? 'Hide' : 'Show'}</button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button type="button" onClick={resetToLogin} className="text-xs text-stone-500 font-bold hover:text-stone-800">← Back</button>
                  <button 
                    type="submit"
                    disabled={strengthCount < 4 || newPassword !== confirmPassword}
                    className="bg-[#801e38] hover:bg-[#601328] text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-md transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default Login;