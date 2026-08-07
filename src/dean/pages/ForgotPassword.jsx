import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png';
import newIcon from '../../assets/new icon.png';
import loginBg from '../../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ForgotPassword() {
  const navigate = useNavigate();
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
        confirmButtonColor: '#7a1f3d',
        confirmButtonText: 'Go to Login',
        background: '#fff',
        color: '#333'
      });

      navigate('/');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-stone-800 bg-cover bg-center" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="w-full flex justify-center items-center p-6">
        <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-md p-8 relative border-t-4 border-[#7a1f3d]">
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-gray-100">
              <img src={newIcon} alt="ARCHIVIO Logo" className="w-[60px] h-[60px] object-contain" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">Forgot Password</h1>
            <p className="text-xs text-stone-500 mt-1 text-center">
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
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dean@phinmaed.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#faf9f6] border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7a1f3d] hover:bg-[#5a162d] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 text-sm shadow-md"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3">6-Digit Code</label>
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
                      className="w-12 h-14 bg-[#faf9f6] border border-stone-200 rounded-lg text-center text-2xl font-semibold focus:outline-none focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] transition-all shadow-sm"
                      required
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#7a1f3d] hover:bg-[#5a162d] text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 text-sm shadow-md"
              >
                Verify Code
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => { setStep(1); setOtp(new Array(6).fill('')); }} className="text-xs text-[#7a1f3d] font-bold hover:underline">
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyAndReset}>
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-12 py-3 bg-[#faf9f6] border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] transition-all mb-3"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[10px] font-bold text-[#7a1f3d] hover:text-[#5a162d]">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="flex justify-between items-center mb-1 px-1">
                    <div className="w-1/2 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 w-full rounded-full ${i <= strengthCount ? strengthColor : 'bg-stone-200'}`}></div>
                      ))}
                    </div>
                    <div className={`text-[9px] font-semibold ${strengthCount <= 1 ? 'text-red-400' : strengthCount === 2 ? 'text-yellow-500' : strengthCount === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-12 py-3 bg-[#faf9f6] border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] transition-all"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-[#7a1f3d] hover:text-[#5a162d]">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7a1f3d] hover:bg-[#5a162d] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 text-sm shadow-md"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center mt-6 pt-4 border-t border-stone-100">
            <Link to="/" className="text-xs font-bold text-stone-500 hover:text-[#7a1f3d] transition-colors">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
