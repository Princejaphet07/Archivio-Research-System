import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../firebase/config';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import newIcon from '../assets/new icon.png';
import loginBg from '../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Query parameters: supports token (backend direct) and oobCode (Firebase native)
  const token = searchParams.get('token') || '';
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const paramEmail = searchParams.get('email') || '';

  const API_URL = import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api` 
    : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api');

  const [email, setEmail] = useState(paramEmail);
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

  // Verify the reset code/token upon page load
  useEffect(() => {
    let isMounted = true;

    async function checkCode() {
      if (!token && !oobCode) {
        if (isMounted) {
          setVerifyingCode(false);
          setCodeValid(false);
          setCodeError('Missing password reset security token or code. Please request a fresh reset link from your portal.');
        }
        return;
      }

      // 1. If backend secure token is present:
      if (token) {
        try {
          const res = await fetch(`${API_URL}/verify-reset-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email: paramEmail })
          });
          const data = await res.json().catch(() => ({}));

          if (isMounted) {
            if (res.ok && data.valid) {
              setEmail(data.email || paramEmail);
              setCodeValid(true);
              setVerifyingCode(false);
            } else {
              setCodeValid(false);
              setVerifyingCode(false);
              setCodeError(data.error || 'This reset link has expired or has already been used. Please request a new one.');
            }
          }
        } catch (backendErr) {
          console.error('Backend token verify error:', backendErr);
          if (!oobCode && isMounted) {
            setCodeValid(false);
            setVerifyingCode(false);
            setCodeError('Unable to connect to verification server. Please check your connection and try again.');
          }
        }
      }

      // 2. If oobCode is present (and token was not verified yet):
      if (oobCode && isMounted && !codeValid) {
        try {
          const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
          if (isMounted) {
            setEmail(verifiedEmail);
            setCodeValid(true);
            setVerifyingCode(false);
          }
        } catch (err) {
          console.error('Firebase oobCode verification error:', err);
          if (isMounted && !token) {
            setCodeValid(false);
            setVerifyingCode(false);
            if (err.code === 'auth/expired-action-code') {
              setCodeError('This password reset link has expired. For security, links are only valid for a limited time.');
            } else if (err.code === 'auth/invalid-action-code') {
              setCodeError('This password reset link is invalid or has already been used. Please request a fresh reset link.');
            } else {
              setCodeError('Unable to verify reset link. Please check your internet connection and try again.');
            }
          }
        }
      }
    }

    checkCode();

    return () => {
      isMounted = false;
    };
  }, [token, oobCode, paramEmail, API_URL]);

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
      if (token) {
        // Submit via backend token endpoint (Admin SDK - bypasses rate limit)
        const res = await fetch(`${API_URL}/reset-password-with-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email, newPassword })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update password');
        }
      } else if (oobCode) {
        // Fallback via Firebase client SDK
        await confirmPasswordReset(auth, oobCode, newPassword);
      } else {
        throw new Error('Missing reset token or code');
      }

      setIsSuccess(true);

      await Swal.fire({
        icon: 'success',
        title: 'Password Updated!',
        text: 'Your password has been successfully reset. You can now sign in with your new credentials.',
        confirmButtonColor: '#801e38',
        confirmButtonText: 'Go to Sign In',
        background: '#ffffff',
        color: '#1c1917'
      });

      navigate('/');
    } catch (err) {
      console.error('Confirm password reset error:', err);
      let errorMsg = err.message || 'Failed to reset password. Please try again.';

      if (err.code === 'auth/expired-action-code') {
        errorMsg = 'This reset link has expired. Please request a new one.';
      } else if (err.code === 'auth/invalid-action-code') {
        errorMsg = 'This link has already been used or is invalid.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please choose a stronger password.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 md:p-6 font-sans bg-cover bg-center text-stone-800 dark:text-stone-100"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="bg-white dark:bg-[#1e1e1e]/95 rounded-2xl shadow-2xl w-full max-w-md p-8 relative border-t-4 border-[#801e38]">
        
        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-white dark:bg-[#1e1e1e] rounded-full flex items-center justify-center mb-4 shadow-md border border-gray-100">
            <img src={newIcon} alt="ARCHIVIO Logo" className="w-[60px] h-[60px] object-contain" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 text-center">
            Set New Password
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 text-center">
            {email ? `For account: ${email}` : 'Enter your new secure password for ARCHIVIO'}
          </p>
        </div>

        {/* Verifying Token State */}
        {verifyingCode && (
          <div className="py-10 text-center">
            <div className="w-10 h-10 border-3 border-[#801e38]/30 border-t-[#801e38] rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">Verifying security token...</p>
            <p className="text-xs text-stone-400 mt-1">Please wait a moment while we validate your link.</p>
          </div>
        )}

        {/* Invalid Token State */}
        {!verifyingCode && !codeValid && (
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
              <span className="text-2xl mb-2 block">⚠️</span>
              <h3 className="text-sm font-bold text-red-800 mb-1">Invalid or Expired Link</h3>
              <p className="text-xs text-red-600 leading-relaxed">{codeError}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link 
                to="/"
                className="w-full text-center py-2.5 bg-[#801e38] hover:bg-[#68182d] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}

        {/* Valid Token: Form to Set Password */}
        {!verifyingCode && codeValid && !isSuccess && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span className="text-red-500 text-sm">⚠️</span>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#fbfaf8] dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                  required
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-stone-400">Strength:</span>
                    <span className="text-[10px] font-bold text-stone-600 dark:text-stone-300">{strengthLabel}</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full transition-all ${strengthCount >= 1 ? strengthColor : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all ${strengthCount >= 2 ? strengthColor : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all ${strengthCount >= 3 ? strengthColor : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full transition-all ${strengthCount >= 4 ? strengthColor : 'bg-transparent'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-stone-500">
                    <span className={hasMinLength ? 'text-emerald-600 font-semibold' : ''}>✓ 8+ chars</span>
                    <span className={hasUpper ? 'text-emerald-600 font-semibold' : ''}>✓ Uppercase</span>
                    <span className={hasNumber ? 'text-emerald-600 font-semibold' : ''}>✓ Number</span>
                    <span className={hasSpecial ? 'text-emerald-600 font-semibold' : ''}>✓ Special char</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔒</span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#fbfaf8] dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 text-xs"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || strengthCount < 4}
              className="w-full py-3 bg-[#801e38] hover:bg-[#68182d] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
          <Link to="/" className="text-xs font-semibold text-stone-500 hover:text-[#801e38] transition-colors">
            ← Back to ARCHIVIO Login
          </Link>
        </div>

      </div>
    </div>
  );
}
