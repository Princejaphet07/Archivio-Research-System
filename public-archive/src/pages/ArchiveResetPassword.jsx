import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase/config';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';
import bgTexture from '../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ArchiveResetPassword() {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // oobCode can be in query param "oobCode" or Firebase's "code"
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const [email, setEmail] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const strengthCount = [hasMinLength, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthCount];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strengthCount];

  const fireAlert = (options) => {
    return Swal.fire({
      background: isDarkMode ? '#1c1518' : '#ffffff',
      color: isDarkMode ? '#f5f5f5' : '#1c1917',
      confirmButtonColor: '#7a2039',
      ...options
    });
  };

  // Verify the reset code upon page load
  useEffect(() => {
    let isMounted = true;

    async function checkCode() {
      if (!oobCode) {
        if (isMounted) {
          setVerifyingCode(false);
          setCodeValid(false);
          setCodeError('Missing password reset security code. Please request a new reset link.');
        }
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (isMounted) {
          setEmail(verifiedEmail);
          setCodeValid(true);
          setVerifyingCode(false);
        }
      } catch (err) {
        console.error('Code verification error:', err);
        if (isMounted) {
          setCodeValid(false);
          setVerifyingCode(false);
          if (err.code === 'auth/expired-action-code') {
            setCodeError('This password reset link has expired. For your security, reset links are only valid for a limited time.');
          } else if (err.code === 'auth/invalid-action-code') {
            setCodeError('This password reset link is invalid or has already been used. Please request a fresh reset link.');
          } else {
            setCodeError('Unable to verify reset link. Please check your internet connection and try again.');
          }
        }
      }
    }

    checkCode();

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    if (strengthCount < 4) {
      setError('Password must be at least 8 characters and include an uppercase letter, a number, and a special character.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsSuccess(true);

      await fireAlert({
        icon: 'success',
        title: 'Password Changed!',
        text: 'Your password has been successfully updated. You can now sign in with your new credentials.',
        confirmButtonText: 'Proceed to Sign In'
      });

      navigate('/login');
    } catch (err) {
      console.error('Confirm password reset error:', err);
      let errorMsg = 'Failed to reset password. Please try again.';

      if (err.code === 'auth/expired-action-code') {
        errorMsg = 'This reset link has expired. Please request a new one.';
      } else if (err.code === 'auth/invalid-action-code') {
        errorMsg = 'This link has already been used or is invalid.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please choose a stronger password.';
      }

      setError(errorMsg);
      fireAlert({
        icon: 'error',
        title: 'Reset Failed',
        text: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans bg-[#faf7f2] dark:bg-[#0d090b] text-stone-800 dark:text-gray-200 transition-colors relative overflow-hidden">
      
      {/* Background parchment texture */}
      <div 
        className="absolute inset-0 z-0 opacity-100 dark:opacity-10 transition-opacity duration-300 pointer-events-none"
        style={{
          backgroundImage: `url(${bgTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Ambient warm radial glow in dark mode */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(122,32,57,0.22)_0%,transparent_70%)]" />

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

      {/* Center Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 dark:bg-[#1c1518]/95 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-stone-200/90 dark:border-white/15 flex flex-col items-center transition-all">
          
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6">
            <Link 
              to="/" 
              className="w-16 h-16 bg-[#24050f] dark:bg-[#2d121c] rounded-2xl flex items-center justify-center border border-stone-200 dark:border-amber-900/40 mb-4 shadow-lg hover:scale-105 transition-transform p-3 group"
              title="Return to Home"
            >
              <img src={logoImg} alt="Archivio Logo" className="w-full h-full object-contain group-hover:rotate-6 transition-transform" />
            </Link>
            
            <h1 className="text-2xl font-serif font-bold text-[#3d0c1b] dark:text-[#f3e5ab] tracking-wide">
              {verifyingCode ? 'Verifying Link...' : codeValid ? 'Set New Password' : 'Link Unavailable'}
            </h1>
            
            {codeValid && email && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 text-center max-w-xs leading-relaxed">
                Create a secure new password for<br />
                <strong className="text-[#7a2039] dark:text-[#f3e5ab] font-mono">{email}</strong>
              </p>
            )}
          </div>

          {/* 1. LOADING / VERIFYING STATE */}
          {verifyingCode && (
            <div className="w-full flex flex-col items-center py-8 space-y-3">
              <svg className="animate-spin h-8 w-8 text-[#7a2039] dark:text-[#f3e5ab]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Verifying your reset security link...
              </p>
            </div>
          )}

          {/* 2. INVALID / EXPIRED LINK STATE */}
          {!verifyingCode && !codeValid && (
            <div className="w-full flex flex-col items-center text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl shadow-inner">
                ⚠️
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 font-serif">
                  Reset Link Expired or Already Used
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed px-2">
                  {codeError || 'For security purposes, password reset links can only be used once and expire shortly after being requested.'}
                </p>
              </div>

              <div className="w-full pt-3 space-y-2.5">
                <Link
                  to="/forgot-password"
                  className="w-full py-2.5 bg-[#7a2039] hover:bg-[#8b2742] text-white rounded-lg text-xs font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request a New Reset Link</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/login"
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center cursor-pointer border border-stone-200 dark:border-white/10"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* 3. VALID CODE: NEW PASSWORD FORM */}
          {!verifyingCode && codeValid && !isSuccess && (
            <form onSubmit={handleResetPassword} className="w-full space-y-4">
              
              {/* Error Alert */}
              {error && (
                <div className="w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3 flex items-start gap-2.5 text-left">
                  <span className="text-red-500 dark:text-red-400 text-sm mt-0.5">⚠️</span>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {/* New Password Input */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-12 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500"
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                      <span>Password Strength:</span>
                      <span className={strengthCount <= 1 ? 'text-red-500' : strengthCount === 2 ? 'text-amber-500' : strengthCount === 3 ? 'text-blue-500' : 'text-emerald-500'}>
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-200 dark:bg-black/40 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 transition-all rounded-full ${
                            level <= strengthCount ? strengthColor : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-12 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition-colors"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {confirmPassword && (
                  <p className={`text-[10px] font-semibold mt-1.5 flex items-center gap-1 ${
                    newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded-xl p-3 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                <p className="font-bold text-[10.5px] uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <span className={hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    {hasMinLength ? '✓' : '•'} At least 8 characters
                  </span>
                  <span className={hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    {hasUpper ? '✓' : '•'} 1 uppercase letter
                  </span>
                  <span className={hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    {hasNumber ? '✓' : '•'} 1 number (0-9)
                  </span>
                  <span className={hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                    {hasSpecial ? '✓' : '•'} 1 special character
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || strengthCount < 4 || newPassword !== confirmPassword}
                className="w-full py-3 bg-[#7a2039] hover:bg-[#8b2742] active:bg-[#661a2e] text-white rounded-lg text-xs font-bold tracking-wider uppercase shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Navigation */}
          <div className="w-full text-center mt-6 pt-4 border-t border-stone-200/80 dark:border-white/10">
            <Link 
              to="/login" 
              className="text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition-colors inline-flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back to Sign In</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
