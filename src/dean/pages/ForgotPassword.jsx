import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
// import { sendPasswordResetEmail } from 'firebase/auth'; // Replaced with custom backend
import logoImg from '../../assets/logo.png';
import newIcon from '../../assets/new icon.png';
import loginBg from '../../assets/parchment.png';
import Swal from 'sweetalert2';

export default function ForgotPassword() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const API_URL = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : 'http://localhost:3001/api';

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

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

    try {
      let sentSuccessfully = false;
      try {
        const response = await fetch(`${API_URL}/send-password-reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: cleanEmail, role: 'dean', origin: window.location.origin }),
        });

        let data = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            data = { error: text || `Server error (${response.status})` };
          }
        } catch (parseErr) {
          data = { error: `Server error (${response.status})` };
        }

        if (!response.ok) {
          const err = new Error(data.details || data.error || 'Failed to send password reset email');
          err.code = data.error; 
          throw err;
        }

        sentSuccessfully = true;
      } catch (fbErr) {
        console.warn('Backend send note:', fbErr.code, fbErr.message);

        // Firebase error mapping
        if (fbErr.code === 'auth/user-not-found') {
          throw new Error('No registered account found with this email address. Please make sure you have created an account first.');
        } else if (fbErr.code === 'auth/too-many-requests') {
          throw new Error('Too many requests sent. Please wait a few minutes before trying again.');
        } else if (fbErr.message?.includes('format')) {
          throw new Error('Invalid institutional email address format.');
        } else {
          throw new Error(fbErr.message || 'Unable to send reset email. Please try again.');
        }
      }

      if (sentSuccessfully) {
        setIsSent(true);
        setCountdown(60);

        await Swal.fire({
          icon: 'success',
          title: 'Reset Link Dispatched!',
          text: `We sent an official password reset link to ${cleanEmail}. Please check your inbox or spam folder.`,
          timer: 3500,
          showConfirmButton: true,
          confirmButtonText: 'Great, I will check',
          confirmButtonColor: '#7a1f3d',
          background: '#fff',
          color: '#333'
        });
      }
    } catch (err) {
      console.error('Password reset error:', err);
      let errorMsg = err.message || 'Failed to send password reset email. Please try again.';

      if (err.name === 'AbortError' || err.message.includes('Failed to fetch')) {
        errorMsg = 'Network error or server is starting up. Please check your internet connection and try again in a few seconds.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-stone-800 dark:text-stone-200 bg-cover bg-center" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="w-full flex justify-center items-center p-6">
        <div className="bg-white dark:bg-stone-800/95 rounded-2xl shadow-2xl w-full max-w-md p-8 relative border-t-4 border-[#7a1f3d]">
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center mb-6 shadow-md border border-gray-100">
              <img src={newIcon} alt="ARCHIVIO Logo" className="w-[60px] h-[60px] object-contain" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {isSent ? 'Reset Link Sent' : 'Forgot Password'}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 text-center">
              {isSent 
                ? 'Check your PHINMA Gmail inbox to reset your password.'
                : 'Enter your institutional email and we will send you a secure link to reset your password.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-red-500 text-sm">⚠️</span>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {!isSent ? (
            <form onSubmit={handleSendResetEmail}>
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dean.swu@phinmaed.com"
                    className="w-full pl-10 pr-4 py-3 bg-[#faf9f6] border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d] transition-all"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] hover:bg-[#5a162d] dark:hover:bg-[#b09230] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-lg transition duration-200 text-sm shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
              </button>
            </form>
          ) : (
            <div className="w-full flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl shadow-inner animate-pulse">
                ✓
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  We've sent a secure password reset link to:
                </p>
                <div className="inline-block bg-stone-100 dark:bg-stone-700 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-600 font-mono text-xs font-bold text-[#7a1f3d] dark:text-[#d4af37]">
                  {email.trim().toLowerCase()}
                </div>
              </div>

              <div className="w-full bg-stone-50 dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600 rounded-xl p-4 text-left space-y-2 text-xs text-stone-600 dark:text-stone-300">
                <p><span className="text-[#7a1f3d] dark:text-[#d4af37] font-bold">1.</span> Open your PHINMA Gmail inbox.</p>
                <p><span className="text-[#7a1f3d] dark:text-[#d4af37] font-bold">2.</span> Click the link to create your new password.</p>
                <p><span className="text-[#7a1f3d] dark:text-[#d4af37] font-bold">3.</span> Return here to log in.</p>
              </div>

              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#7a1f3d] hover:bg-[#5a162d] text-white rounded-lg text-xs font-bold tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                Open PHINMA Gmail
              </a>

              <div className="w-full flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setError('');
                  }}
                  className="text-stone-500 hover:text-[#7a1f3d] transition-colors"
                >
                  ← Edit email
                </button>

                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={loading || countdown > 0}
                  className="font-bold text-[#7a1f3d] dark:text-[#d4af37] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {countdown > 0 ? `Resend link (${countdown}s)` : 'Resend link'}
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-6 pt-4 border-t border-stone-100">
            <Link to="/" className="text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-[#7a1f3d] dark:text-[#f8d070] transition-colors">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
