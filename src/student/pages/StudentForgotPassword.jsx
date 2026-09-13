import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import swuLogoSeal from '../../assets/new icon.png';
import parchmentBg from '../../assets/parchment.jpg';
import Swal from 'sweetalert2';

export default function StudentForgotPassword({ onSwitchPage }) {
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
      const PUBLIC_URL = import.meta.env.VITE_PUBLIC_ARCHIVE_URL || 'https://archivio-public.web.app';
      const actionCodeSettings = {
        url: `${PUBLIC_URL}/reset-password`,
        handleCodeInApp: true
      };

      let sentSuccessfully = false;
      try {
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
        sentSuccessfully = true;
      } catch (fbErr) {
        console.warn('Firebase client SDK send note:', fbErr.code, fbErr.message);

        if (fbErr.code === 'auth/user-not-found') {
          throw new Error('No registered account found with this email address. Please make sure you have created an account first.');
        } else if (fbErr.code === 'auth/too-many-requests') {
          throw new Error('Too many requests sent. Please wait a few minutes before trying again.');
        } else if (fbErr.code === 'auth/invalid-email') {
          throw new Error('Invalid institutional email address format.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${API_URL}/send-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          sentSuccessfully = true;
        } else {
          const data = await response.json().catch(() => ({}));
          let errorMsg = data.error || 'Unable to send reset email. Please try again.';
          if (errorMsg.includes('No registered account')) {
            errorMsg = 'No account found with this email address. Please make sure you have created an account first.';
          } else if (errorMsg.includes('Too many requests')) {
            errorMsg = 'Too many requests sent. Please wait a few minutes before trying again.';
          }
          throw new Error(errorMsg);
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
          confirmButtonColor: '#6B0F1A',
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
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              {isSent ? 'Reset Link Sent' : 'Forgot Password'}
            </h1>
            <p className="text-xs text-gray-500 mt-2 text-center">
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. prdo.vender.swu@phinmaed.com"
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#7a2e46] transition"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B0F1A] hover:bg-[#540c14] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-sm shadow-sm tracking-wide flex items-center justify-center gap-2"
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
                <p className="text-xs text-gray-600">
                  We've sent a secure password reset link to:
                </p>
                <div className="inline-block bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 font-mono text-xs font-bold text-[#6B0F1A]">
                  {email.trim().toLowerCase()}
                </div>
              </div>

              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 text-xs text-gray-600">
                <p><span className="text-[#6B0F1A] font-bold">1.</span> Open your PHINMA Gmail inbox.</p>
                <p><span className="text-[#6B0F1A] font-bold">2.</span> Click the link to create your new password.</p>
                <p><span className="text-[#6B0F1A] font-bold">3.</span> Return here to log in.</p>
              </div>

              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#6B0F1A] hover:bg-[#540c14] text-white rounded-lg text-xs font-bold tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
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
                  className="text-gray-500 hover:text-[#6B0F1A] transition-colors"
                >
                  ← Edit email
                </button>

                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={loading || countdown > 0}
                  className="font-bold text-[#6B0F1A] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {countdown > 0 ? `Resend link (${countdown}s)` : 'Resend link'}
                </button>
              </div>
            </div>
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
