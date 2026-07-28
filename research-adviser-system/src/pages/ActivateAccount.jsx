import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import logoImg from '../assets/logo.png';
import bgTexture from '../assets/Rectangle 9 (2).png';
import leftPanelBg from '../assets/left-panel-bg.png';
import jaggedEdge from '../assets/jagged-edge.png';

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
        navigate('/dashboard');
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
    <div className="min-h-screen flex font-sans text-gray-800 overflow-x-hidden">
      
      {/* Left Column: Info Panel */}
      <div 
        className="w-full lg:w-[40%] text-white flex flex-col items-center justify-center py-12 px-10 xl:px-16 relative shadow-2xl z-10"
        style={{ 
          backgroundImage: `url("${leftPanelBg}")`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'top center' 
        }}
      >
        <img 
          src={jaggedEdge} 
          className="absolute top-0 right-0 h-full w-[36px] translate-x-1/2 z-30 pointer-events-none hidden lg:block object-cover" 
          alt="" 
        />
        
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-[#542133]/40 rounded-full flex items-center justify-center border border-[#d0a36e] mb-4 backdrop-blur-sm">
            <img src={logoImg} alt="Archivio Logo" className="w-14 h-14 object-contain" />
          </div>
          <p className="text-[#d0a36e] text-xs tracking-[0.2em] font-semibold uppercase mb-2">SWU Phinma</p>
          <h1 className="text-5xl font-serif tracking-widest mb-4 font-bold">ARCHIVIO</h1>
          <div className="w-2 flex gap-1 mb-4 text-[#d0a36e]">♦</div>
          <h2 className="text-lg font-serif text-[#d0a36e] mb-3">Research Archive Management System</h2>
        </div>

        {adviserData && (
          <div className="border border-[#5a1f33]/60 rounded-xl p-5 bg-[#481426]/50 backdrop-blur-sm relative z-10 w-full max-w-sm text-center">
            <p className="text-[#d0a36e] text-sm font-semibold mb-2">Welcome</p>
            <p className="text-xl font-serif font-bold text-white mb-1">{adviserData.displayName}</p>
            <p className="text-[11px] text-gray-300">{adviserData.email}</p>
            <p className="text-[10px] text-gray-400 mt-3">Invited by: {adviserData.invitedByName}</p>
          </div>
        )}
      </div>

      {/* Right Column: Form Area */}
      <div 
        className="hidden lg:flex flex-1 flex-col justify-center p-6 bg-[#f5f0e6]"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-lg mx-auto relative z-10 pl-4">
          
          <div className="mb-6">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Activate Account</h1>
            <p className="text-sm text-gray-600 mb-3">Create your password to get started</p>
            <div className="w-12 h-[2px] bg-[#d0a36e]"></div>
          </div>

          <div className="bg-white rounded-xl shadow-2xl w-full p-8">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-red-500 text-sm">⚠️</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-green-500 text-sm">✅</span>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {adviserData ? (
              <form onSubmit={handleActivateAccount} className="space-y-4">
                
                {/* Email Address - Read Only */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="email"
                    value={adviserData.email}
                    readOnly
                    className="w-full bg-[#f4ece3] border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 focus:outline-none transition cursor-not-allowed"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">✓ Verified email from invitation</p>
                </div>
                
                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔒</span>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password" 
                      className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-12 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition disabled:opacity-50" 
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {formData.password && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] font-semibold text-gray-600 mb-1">Password must contain:</p>
                      <div className={`text-[10px] flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{passwordValidation.minLength ? '✅' : '○'}</span> At least 8 characters
                      </div>
                      <div className={`text-[10px] flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{passwordValidation.hasUppercase ? '✅' : '○'}</span> One uppercase letter
                      </div>
                      <div className={`text-[10px] flex items-center gap-2 ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{passwordValidation.hasLowercase ? '✅' : '○'}</span> One lowercase letter
                      </div>
                      <div className={`text-[10px] flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{passwordValidation.hasNumber ? '✅' : '○'}</span> One number
                      </div>
                      <div className={`text-[10px] flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>
                        <span>{passwordValidation.hasSpecialChar ? '✅' : '○'}</span> One special character (!@#$%^&*)
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔒</span>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password" 
                      className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-12 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition disabled:opacity-50" 
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-[10px] text-red-600 mt-1">❌ Passwords do not match</p>
                  )}
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-2 mt-4">
                  <input 
                    type="checkbox" 
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-4 h-4 text-[#7a2e46] bg-gray-100 border-gray-300 rounded focus:ring-[#7a2e46] mt-0.5" 
                  />
                  <label className="text-[10px] text-gray-600">
                    I agree to the <span className="font-semibold text-[#7a2e46]">Terms and Conditions</span> and <span className="font-semibold text-[#7a2e46]">Privacy Policy</span> of ARCHIVIO
                  </label>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={loading || !passwordValidation.isValid || !formData.agreeTerms}
                  className="w-full bg-[#7a2e46] hover:bg-[#5f2135] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-sm mt-6"
                >
                  {loading ? 'Activating...' : 'Activate My Account'}
                </button>

                <p className="text-center text-[11px] text-gray-500 mt-4">
                  Already have an account? <Link to="/login" className="text-[#7a2e46] font-semibold hover:underline">Sign in here</Link>
                </p>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-600 text-sm font-semibold">❌ Invalid Activation Link</p>
                <p className="text-gray-600 text-xs mt-2">Please check your email for a valid invitation link.</p>
                <Link to="/login" className="inline-block mt-4 bg-[#7a2e46] hover:bg-[#5f2135] text-white font-semibold py-2 px-4 rounded-lg text-sm">
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
