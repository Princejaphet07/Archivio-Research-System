import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';
import bgTexture from '../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ArchiveForgotPassword() {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const fireAlert = (options) => {
    return Swal.fire({
      background: isDarkMode ? '#1c1518' : '#ffffff',
      color: isDarkMode ? '#f5f5f5' : '#1c1917',
      confirmButtonColor: '#7a2039',
      ...options
    });
  };

  const handleSendResetEmail = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your institutional email address.');
      return;
    }

    if (!cleanEmail.endsWith('@phinmaed.com')) {
      setError('Access is restricted: please enter your official @phinmaed.com institutional email address.');
      return;
    }

    setLoading(true);

    const API_URL = import.meta.env.VITE_BACKEND_URL 
      ? `${import.meta.env.VITE_BACKEND_URL}/api` 
      : 'https://archivio-email-service.onrender.com/api';

    try {
      let sentViaBrandedService = false;

      // 1. Try sending the official branded SWU PHINMA HTML email template
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

        const response = await fetch(`${API_URL}/send-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          sentViaBrandedService = true;
        } else {
          const data = await response.json().catch(() => ({}));
          if (data.error && data.error.includes('No registered account')) {
            throw new Error('No account found with this email address. Please make sure you have registered first.');
          }
        }
      } catch (backendError) {
        console.warn('Backend branded reset failed or timed out:', backendError.message);
        if (backendError.message.includes('No account found')) {
          throw backendError;
        }
      }

      // 2. If backend service was unavailable or sleeping, seamlessly send via Firebase Client Auth
      if (!sentViaBrandedService) {
        await sendPasswordResetEmail(auth, cleanEmail);
      }

      setIsSent(true);
      setCountdown(60); // 60s cooldown

      fireAlert({
        icon: 'success',
        title: 'Reset Link Dispatched!',
        text: `We sent an official password reset link to ${cleanEmail}. Please check your inbox or spam folder.`,
        timer: 3500,
        showConfirmButton: true,
        confirmButtonText: 'Great, I will check'
      });
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMsg = err.message || 'Failed to send password reset email. Please try again.';

      if (err.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email address. Please make sure you have registered first.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'The email address format is invalid. Please double-check.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many requests sent. Please wait a few minutes before trying again.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection and try again.';
      }

      setError(errorMsg);
      fireAlert({
        icon: 'error',
        title: 'Unable to Send Link',
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
              {isSent ? 'Reset Link Sent' : 'Forgot Password'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 text-center max-w-xs leading-relaxed">
              {isSent 
                ? 'Check your PHINMA Gmail inbox to reset your password.'
                : 'Enter your institutional email and we will send you a secure link to reset your password.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="w-full mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3 flex items-start gap-2.5 text-left">
              <span className="text-red-500 dark:text-red-400 text-sm mt-0.5">⚠️</span>
              <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* STEP 1: Enter Email Form */}
          {!isSent ? (
            <form onSubmit={handleSendResetEmail} className="w-full space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user.swu@phinmaed.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/70 dark:bg-black/40 border border-stone-300 dark:border-white/15 rounded-lg outline-none focus:border-[#7a2039] dark:focus:border-[#f3e5ab] focus:ring-2 focus:ring-[#7a2039]/10 dark:focus:ring-[#f3e5ab]/20 text-sm text-stone-900 dark:text-stone-100 transition-all placeholder-stone-400 dark:placeholder-stone-500"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-stone-500 dark:text-stone-400">
                  <span>🔒</span>
                  <span>Strictly restricted to official <strong>@phinmaed.com</strong> accounts</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#7a2039] hover:bg-[#8b2742] active:bg-[#661a2e] text-white rounded-lg text-xs font-bold tracking-wider uppercase shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Sent Confirmation View */
            <div className="w-full flex flex-col items-center text-center space-y-4">
              
              {/* Success Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl shadow-inner animate-pulse">
                ✓
              </div>

              <div className="space-y-1">
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  We've sent a secure password reset link to:
                </p>
                <div className="inline-block bg-stone-100 dark:bg-[#2d1723] px-3.5 py-1.5 rounded-full border border-stone-200 dark:border-white/10 font-mono text-xs font-bold text-[#7a2039] dark:text-[#f3e5ab] break-all">
                  {email.trim().toLowerCase()}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="w-full bg-stone-50 dark:bg-black/30 border border-stone-200 dark:border-white/10 rounded-xl p-4 text-left space-y-2 text-xs text-stone-600 dark:text-stone-300">
                <div className="flex items-start gap-2">
                  <span className="text-[#7a2039] dark:text-[#f3e5ab] font-bold">1.</span>
                  <p>Open your PHINMA Gmail inbox.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#7a2039] dark:text-[#f3e5ab] font-bold">2.</span>
                  <p>Look for an email from <strong>Archivio Research System</strong> (check Spam or Junk if not in Primary).</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#7a2039] dark:text-[#f3e5ab] font-bold">3.</span>
                  <p>Click the link to create your new password, then return here to log in.</p>
                </div>
              </div>

              {/* Quick Action: Open Gmail */}
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#7a2039] hover:bg-[#8b2742] text-white rounded-lg text-xs font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open PHINMA Gmail</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>

              {/* Secondary Actions */}
              <div className="w-full flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setError('');
                  }}
                  className="text-stone-500 dark:text-stone-400 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] font-medium transition-colors"
                >
                  ← Edit email
                </button>

                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={loading || countdown > 0}
                  className="font-bold text-[#7a2039] dark:text-[#f3e5ab] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-opacity"
                >
                  {countdown > 0 ? `Resend link (${countdown}s)` : 'Resend link'}
                </button>
              </div>
            </div>
          )}

          {/* Footer Back to Login */}
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
