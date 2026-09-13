import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../firebase/config';
// import { sendPasswordResetEmail } from 'firebase/auth'; // Replaced with custom backend
import newIcon from '../../assets/new icon.png';
import loginBg from '../../assets/parchment.png';
import Swal from 'sweetalert2';

function ForgotPassword() {
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
          body: JSON.stringify({ email: cleanEmail, role: 'adviser' }),
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
          confirmButtonColor: '#7a2e46',
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
    <div className="min-h-screen flex font-sans text-gray-800 bg-cover bg-center" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="w-full flex justify-center items-center p-6">
        <div className="bg-white border border-transparent rounded-xl shadow-2xl w-full max-w-md p-8 relative transition-colors">
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-gray-100">
              <img src={newIcon} alt="ARCHIVIO Logo" className="w-[60px] h-[60px] object-contain" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-900">
              {isSent ? 'Reset Link Sent' : 'Forgot Password'}
            </h1>
            <p className="text-xs text-gray-500 mt-1 text-center">
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
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. adviser@phinmaed.com"
                  className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#7a2e46] transition"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7a2e46] hover:bg-[#5f2135] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-sm shadow-md flex items-center justify-center gap-2"
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
                <div className="inline-block bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 font-mono text-xs font-bold text-[#7a2e46]">
                  {email.trim().toLowerCase()}
                </div>
              </div>

              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 text-xs text-gray-600">
                <p><span className="text-[#7a2e46] font-bold">1.</span> Open your PHINMA Gmail inbox.</p>
                <p><span className="text-[#7a2e46] font-bold">2.</span> Click the link to create your new password.</p>
                <p><span className="text-[#7a2e46] font-bold">3.</span> Return here to log in.</p>
              </div>

              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#7a2e46] hover:bg-[#5f2135] text-white rounded-lg text-xs font-bold tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
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
                  className="text-gray-500 hover:text-[#7a2e46] transition-colors"
                >
                  ← Edit email
                </button>

                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={loading || countdown > 0}
                  className="font-bold text-[#7a2e46] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {countdown > 0 ? `Resend link (${countdown}s)` : 'Resend link'}
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <Link to="/" className="text-xs font-semibold text-gray-500 hover:text-[#7a2e46] transition">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
