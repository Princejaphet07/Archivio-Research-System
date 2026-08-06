import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase/config';

export default function StudentActivate() {
  const [token, setToken] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    setToken(urlToken);

    if (urlToken) {
      validateToken(urlToken);
    } else {
      setError('❌ Invalid activation link. No token provided.');
      setValidating(false);
    }
  }, []);

  const validateToken = async (tokenValue) => {
    setValidating(true);
    setError('');

    try {
      // Query Firestore for student invitation with matching token
      const invitationsRef = collection(db, 'studentInvitations');
      const q = query(invitationsRef, where('invitationToken', '==', tokenValue));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('❌ Invalid or expired activation link.');
        setValidating(false);
        return;
      }

      const invitation = snapshot.docs[0];
      const invitationDoc = invitation.data();

      // Check if already activated
      if (invitationDoc.status === 'active') {
        setError('⚠️ This account has already been activated. Please login instead.');
        setValidating(false);
        return;
      }

      // Check if token expired (7 days)
      const invitedDate = new Date(invitationDoc.invitationSentAt);
      const now = new Date();
      const daysDiff = (now - invitedDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        setError('❌ This invitation link has expired. Please request a new one from your adviser.');
        setValidating(false);
        return;
      }

      // Token valid - load student data
      setStudentData({
        id: invitation.id,
        ...invitationDoc
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
    if (!formData.firstName || !formData.lastName) {
      setError('❌ Please fill in all fields');
      return;
    }

    if (!formData.password || !formData.confirmPassword) {
      setError('❌ Please fill in password fields');
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

    setLoading(true);

    try {
      // Create Firebase Auth account
      const trimmedEmail = studentData.studentEmail.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const userId = userCredential.user.uid;

      // Update Firestore student invitation
      const invitationRef = doc(db, 'studentInvitations', studentData.id);
      await updateDoc(invitationRef, {
        status: 'active',
        userId: userId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        activatedAt: new Date().toISOString(),
        invitationToken: null // Clear token after use
      });

      setSuccess('✅ Account activated successfully! Redirecting to login...');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        {studentData ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Create Your Account</h1>
              <p className="text-gray-600 text-sm">Complete your registration as a student researcher</p>
            </div>

            <form onSubmit={handleActivateAccount} className="space-y-5">
              
              {/* Email - Read Only */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email"
                  value={studentData.studentEmail}
                  readOnly
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-600 cursor-not-allowed focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">✓ Verified email from invitation</p>
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="e.g. Juan" 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
                  disabled={loading}
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Last Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="e.g. Dela Cruz" 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">🔒</span>
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password" 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-12 pr-24 py-3 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-purple-600 hover:text-purple-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Confirm Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">🔒</span>
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password" 
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-12 pr-24 py-3 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-purple-600 hover:text-purple-800"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-600 mt-2">❌ Passwords do not match</p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start gap-3 mt-6">
                <input 
                  type="checkbox" 
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mt-0.5 cursor-pointer" 
                />
                <label className="text-sm text-gray-700">
                  I agree to the <span className="font-semibold text-blue-600">Terms and Conditions</span> and <span className="font-semibold text-blue-600">Privacy Policy</span> of ARCHIVIO
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading || !passwordValidation.isValid || !formData.agreeTerms}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-base mt-8"
              >
                {loading ? 'Activating...' : 'Activate My Account'}
              </button>

              <p className="text-center text-sm text-gray-600 mt-6">
                Already have an account? <a href="/" className="text-purple-600 font-semibold hover:text-purple-800">Sign in here</a>
              </p>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-red-600 text-lg font-semibold">❌ Invalid Activation Link</p>
            <p className="text-gray-600 text-sm mt-3">Please check your email for a valid invitation link from your adviser.</p>
            <a href="/" className="inline-block mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg text-sm">
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
