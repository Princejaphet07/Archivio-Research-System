import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import loginBg from '../../assets/parchment.png';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  
  // Form states
  const [adviserData, setAdviserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validating, setValidating] = useState(true);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setValidating(true);
    setError('');

    if (!token) {
      setError('❌ Invalid activation link. No token provided.');
      setValidating(false);
      return;
    }

    try {
      // Query Firestore for adviser with matching token
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      
      // Search for adviser with this token
      const advisersRef = collection(db, 'advisers');
      const q = query(advisersRef, where('invitationToken', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('❌ Invalid or expired activation link.');
        setValidating(false);
        return;
      }

      const adviser = snapshot.docs[0];
      const adviserDoc = adviser.data();

      // Check if already activated
      if (adviserDoc.status === 'active') {
        setError('⚠️ This account has already been activated. Please login instead.');
        setValidating(false);
        return;
      }

      // Check if token expired (7 days)
      const invitedDate = new Date(adviserDoc.invitationSentAt);
      const now = new Date();
      const daysDiff = (now - invitedDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        setError('❌ This invitation link has expired. Please request a new one from your dean.');
        setValidating(false);
        return;
      }

      // Token valid - load adviser data
      setAdviserData({
        id: adviser.id,
        ...adviserDoc
      });
      setValidating(false);

    } catch (error) {
      console.error('Error validating token:', error);
      setError('❌ Error validating activation link. Please try again.');
      setValidating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return {
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar
    };
  };

  const handleActivateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.password || !formData.confirmPassword) {
      setError('❌ Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('❌ Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError('❌ Password does not meet requirements');
      return;
    }

    if (!formData.agreeTerms) {
      setError('❌ You must agree to the terms and conditions');
      return;
    }

    // Validate email domain - only @phinmaed.com allowed
    if (!adviserData.email.toLowerCase().endsWith('@phinmaed.com')) {
      setError('❌ Only institutional emails (@phinmaed.com) can create adviser accounts');
      return;
    }

    setLoading(true);

    try {
      // Trim email and password
      const trimmedEmail = adviserData.email.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const userId = userCredential.user.uid;

      // CLEANUP: Wipe orphaned groups tied to this adviser's email to ensure a 100% fresh start
      const oldGroupsQuery = query(collection(db, 'groups'), where('adviserUid', '==', trimmedEmail));
      const oldGroupsSnap = await getDocs(oldGroupsQuery);
      const deleteGroupPromises = oldGroupsSnap.docs.map(d => deleteDoc(doc(db, 'groups', d.id)));
      await Promise.all(deleteGroupPromises);

      // Update Firestore adviser record
      const adviserRef = doc(db, 'advisers', adviserData.id);
      await updateDoc(adviserRef, {
        status: 'active',
        userId: userId,
        activatedAt: new Date().toISOString()
        // We DO NOT clear the token here. Keeping the token allows the system to correctly identify 
        // if they click the link again and show them the 'Already Activated' message instead of 'Invalid link'
      });

      // Also create user profile in 'advisers' collection if not already there
      // This ensures the adviser can access the system
      setSuccess('✅ Account activated successfully! Redirecting to dashboard...');

      // Redirect to dashboard after 2 seconds (Firebase Auth has already signed them in)
      setTimeout(() => {
        navigate('/adviser/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error activating account:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('❌ This email is already registered. Please login or contact support.');
      } else if (error.code === 'auth/weak-password') {
        setError('❌ Password is too weak. Please use a stronger password.');
      } else {
        setError(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-sans">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#7a2e46] border-t-transparent mb-4"></div>
          <p className="text-gray-600">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center font-sans p-6 bg-cover bg-center"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="max-w-md w-full rounded-2xl border border-white/50 bg-white/95 p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#7a1f3d]"></div>

        <div className="mb-6">
          <h2 className="font-serif text-3xl font-bold text-stone-900">Activate Account</h2>
          <div className="mt-2 flex flex-col items-start gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a1f3d] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
              Research Adviser
            </span>
            <p className="text-xs text-stone-500 font-medium">Create your password to get started</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-xs text-red-800 font-medium leading-relaxed flex-1 mt-0.5">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-500 text-lg">✅</span>
            <p className="text-xs text-green-800 font-medium leading-relaxed flex-1 mt-0.5">{success}</p>
          </div>
        )}

        {adviserData ? (
          <form onSubmit={handleActivateAccount} className="space-y-5">
            {/* Adviser Info Read Only */}
            <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-4 mb-2">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Account Details</p>
              <p className="font-serif text-lg font-bold text-[#7a1f3d]">{adviserData.displayName}</p>
              <p className="text-xs text-stone-500">{adviserData.email}</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">New Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a strong password" 
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 focus:border-[#7a1f3d] transition-all disabled:opacity-50" 
                  disabled={loading}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 bg-stone-50 border border-stone-100 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Password Requirements</p>
                  <div className={`text-[11px] flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600 font-medium' : 'text-stone-400'}`}>
                    <span>{passwordValidation.minLength ? '✅' : '○'}</span> At least 8 characters
                  </div>
                  <div className={`text-[11px] flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green-600 font-medium' : 'text-stone-400'}`}>
                    <span>{passwordValidation.hasUppercase ? '✅' : '○'}</span> One uppercase letter
                  </div>
                  <div className={`text-[11px] flex items-center gap-2 ${passwordValidation.hasLowercase ? 'text-green-600 font-medium' : 'text-stone-400'}`}>
                    <span>{passwordValidation.hasLowercase ? '✅' : '○'}</span> One lowercase letter
                  </div>
                  <div className={`text-[11px] flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600 font-medium' : 'text-stone-400'}`}>
                    <span>{passwordValidation.hasNumber ? '✅' : '○'}</span> One number
                  </div>
                  <div className={`text-[11px] flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600 font-medium' : 'text-stone-400'}`}>
                    <span>{passwordValidation.hasSpecialChar ? '✅' : '○'}</span> One special character (!@#$%^&*)
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password" 
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 focus:border-[#7a1f3d] transition-all disabled:opacity-50" 
                  disabled={loading}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[10px] text-red-500 font-semibold mt-1.5 pl-1 flex items-center gap-1">
                  <span>❌</span> Passwords do not match
                </p>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-3 mt-4 bg-stone-50/50 p-3 rounded-lg border border-stone-100">
              <input 
                type="checkbox" 
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                disabled={loading}
                className="w-4 h-4 text-[#7a1f3d] border-stone-300 rounded focus:ring-[#7a1f3d] mt-0.5" 
              />
              <label className="text-xs text-stone-600 leading-relaxed">
                I agree to the <span className="font-bold text-[#7a1f3d] cursor-pointer hover:underline">Terms of Service</span> and <span className="font-bold text-[#7a1f3d] cursor-pointer hover:underline">Privacy Policy</span>.
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading || !passwordValidation.isValid || !formData.agreeTerms || formData.password !== formData.confirmPassword}
              className="w-full bg-[#7a1f3d] hover:bg-[#5a162d] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#7a1f3d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Activating...
                </>
              ) : (
                <>
                  Activate My Account
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>

            <div className="text-center pt-4 border-t border-stone-100 mt-6">
              <p className="text-xs font-medium text-stone-500">
                Already activated? <Link to="/" className="text-[#7a1f3d] font-bold hover:underline ml-1">Sign in here</Link>
              </p>
            </div>
          </form>
        ) : (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-stone-900 font-bold text-lg mb-2">Invalid Activation Link</p>
            <p className="text-stone-500 text-sm mb-8 px-4 leading-relaxed">
              This link is invalid, expired, or the account has already been activated.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-colors shadow-sm w-full sm:w-auto"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
