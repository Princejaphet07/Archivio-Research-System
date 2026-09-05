import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import bgTexture from '../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ArchiveForgotPassword() {
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
        confirmButtonColor: '#24050f',
        confirmButtonText: 'Go to Login',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#333'
      });

      navigate('/login');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-stone-800 dark:text-gray-200 bg-stone-50 dark:bg-gray-900 transition-colors relative">
      {/* Background overlay for light mode */}
      <div 
        className="absolute inset-0 z-0 dark:hidden"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', opacity: 0.5 }}
      ></div>

      <div className="w-full flex justify-center items-center p-6 z-10">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] w-full max-w-md p-8 relative border border-white/40 dark:border-gray-700/50">
          
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-stone-200 dark:border-gray-600 mb-4 shadow-md hover:scale-105 transition-transform p-2">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
            </Link>
            <h1 className="text-2xl font-serif font-bold text-[#3d0c1b] dark:text-[#f3e5ab]">Forgot Password</h1>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1 text-center">
              {step === 1 && "Enter your email to receive a verification code."}
              {step === 2 && "Check your email for the 6-digit code."}
              {step === 3 && "Create a new secure password."}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <span className="text-red-500 text-sm">⚠️</span>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
              <span className="text-green-500 text-sm">✅</span>
              <p className="text-xs text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="mb-5">
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 dark:text-gray-500 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@swu.phinma.edu.ph"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#24050f] text-white rounded text-sm font-bold tracking-wider uppercase shadow-md transition-colors hover:bg-[#3f081b] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-3">6-Digit Code</label>
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
                      className="w-12 h-14 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded text-center text-2xl font-semibold focus:outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-stone-700 dark:text-gray-200 transition-colors"
                      required
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#24050f] text-white rounded text-sm font-bold tracking-wider uppercase shadow-md transition-colors hover:bg-[#3f081b]"
              >
                Verify Code
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => { setStep(1); setOtp(new Array(6).fill('')); }} className="text-xs text-stone-500 dark:text-gray-400 font-bold hover:text-[#24050f] dark:hover:text-[#f3e5ab]">
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyAndReset}>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 dark:text-gray-500 text-sm">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-12 py-2.5 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors mb-3"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[10px] font-bold text-stone-500 dark:text-gray-400 hover:text-[#24050f] dark:hover:text-[#f3e5ab]">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="flex justify-between items-center mb-1 px-1">
                    <div className="w-1/2 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 w-full rounded-full ${i <= strengthCount ? strengthColor : 'bg-stone-200 dark:bg-gray-600'}`}></div>
                      ))}
                    </div>
                    <div className={`text-[9px] font-semibold ${strengthCount <= 1 ? 'text-red-400' : strengthCount === 2 ? 'text-yellow-500' : strengthCount === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-stone-600 dark:text-gray-300 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 dark:text-gray-500 text-sm">🔒</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-12 py-2.5 bg-stone-50 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded outline-none focus:border-[#24050f] dark:focus:border-[#f3e5ab] text-sm text-stone-700 dark:text-gray-200 transition-colors"
                    required
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-stone-500 dark:text-gray-400 hover:text-[#24050f] dark:hover:text-[#f3e5ab]">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#24050f] text-white rounded text-sm font-bold tracking-wider uppercase shadow-md transition-colors hover:bg-[#3f081b] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center mt-6 pt-4 border-t border-stone-200 dark:border-gray-700">
            <Link to="/login" className="text-xs font-bold text-stone-500 dark:text-gray-400 hover:text-[#24050f] dark:hover:text-[#f3e5ab] transition-colors">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
