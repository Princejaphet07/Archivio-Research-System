import React, { useState, useRef } from 'react';
import swuLogoSeal from '../../assets/new icon.png';
import parchmentBg from '../../assets/parchment.jpg';
import Swal from 'sweetalert2';

export default function StudentForgotPassword({ onSwitchPage }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const inputRefs = useRef([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const API_URL = 'http://localhost:3001/api';

  const handleChangeOtp = (element, index) => {
    if (isNaN(element.value)) return false;
    
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDownOtp = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setSuccess('A 6-digit verification code has been sent to your email.');
      setTimeout(() => setSuccess(''), 3000);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength helpers
  const hasEightChars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthCount];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][strengthCount];

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (strengthCount < 4) {
      return setError('Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          code: otp.join(''),
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Password successfully changed!',
        text: 'You can now log in with your new password.',
        confirmButtonColor: '#6B0F1A',
        confirmButtonText: 'Go to Login',
        background: '#fff',
        color: '#333'
      });

      onSwitchPage('login');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-[#FDF9ED] font-sans" style={{ backgroundImage: `url("${parchmentBg}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="w-[1000px] h-[580px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex overflow-hidden border border-[#E8DFCB] relative z-10 m-4">
        
        {/* Left Side - Brand Banner */}
        <div className="w-[45%] bg-[#4A1024] relative overflow-hidden flex flex-col items-center justify-center p-8 z-10">
          <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.5)_50%,transparent_51%)] bg-[length:40px_100%]"></div>
          
          <div className="z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <img src={swuLogoSeal} alt="SWU Logo" className="w-[70px] h-[70px] object-contain" />
            </div>
            <div className="text-white text-[11px] tracking-[4px] mb-8 opacity-80 font-semibold font-sans">
              SWU PHINMA
            </div>
            
            <h1 className="text-white text-5xl font-serif tracking-[2px] mb-4 drop-shadow-md">
              ARCHIVIO
            </h1>
            
            <div className="w-2 h-2 bg-[#d0a36e] transform rotate-45 mb-4"></div>
            
            <p className="text-[#d0a36e] font-serif text-sm tracking-wide text-center">
              Research Archive Management System
            </p>
          </div>
        </div>

        {/* Right Side - Forgot Password Flow */}
        <div className="w-[55%] flex flex-col p-[60px] bg-white relative">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-3xl font-serif font-bold text-gray-900">Forgot Password</h1>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {step === 1 && "Enter your email to receive a verification code."}
              {step === 2 && "Check your email for the 6-digit code."}
              {step === 3 && "Create a new secure password."}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-red-500 text-sm">⚠️</span>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-green-500 text-sm">✅</span>
              <p className="text-xs text-green-700">{success}</p>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. prdo.vender.swu@phinmaed.com"
                  className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#7a2e46] transition"
                  required
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B0F1A] hover:bg-[#540c14] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-sm shadow-sm tracking-wide"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">6-Digit Code</label>
                <div className="flex justify-between gap-2">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      ref={(el) => (inputRefs.current[index] = el)}
                      value={data}
                      onChange={(e) => handleChangeOtp(e.target, index)}
                      onKeyDown={(e) => handleKeyDownOtp(e, index)}
                      onFocus={(e) => e.target.select()}
                      className="w-[14%] h-14 bg-[#faf7f5] border border-gray-200 rounded-lg text-center text-2xl font-semibold focus:outline-none focus:border-[#7a2e46] transition shadow-sm"
                      required
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#6B0F1A] hover:bg-[#540c14] text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-sm shadow-sm tracking-wide"
              >
                Verify Code
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => { setStep(1); setOtp(new Array(6).fill('')); }} className="text-xs text-[#6B0F1A] hover:underline">
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyAndReset}>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#7a2e46] transition mb-3"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 focus:outline-none">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="flex justify-between items-center mb-1 px-1">
                    <div className="w-1/2 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 w-full rounded-full ${i <= strengthCount ? strengthColor : 'bg-gray-200'}`}></div>
                      ))}
                    </div>
                    <div className={`text-[9px] font-semibold ${strengthCount <= 1 ? 'text-red-400' : strengthCount === 2 ? 'text-yellow-500' : strengthCount === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#7a2e46] transition"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none">
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B0F1A] hover:bg-[#540c14] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-sm shadow-sm tracking-wide"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center mt-8 pt-4">
            <button onClick={() => onSwitchPage('login')} className="text-xs font-semibold text-gray-500 hover:text-[#6B0F1A] transition">
              ← Back to Login
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
