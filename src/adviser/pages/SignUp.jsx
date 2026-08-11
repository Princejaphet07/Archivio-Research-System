import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import loginBg from '../../assets/parchment.png';

function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    
    if (emailParam) {
      const fetchInvitation = async () => {
        try {
          const q = query(collection(db, 'advisers'), where('email', '==', emailParam.toLowerCase()), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setFormData(prev => ({
              ...prev,
              email: data.email,
              firstName: data.firstName || '',
              lastName: data.lastName || ''
            }));
            setIsPrefilled(true);
          }
        } catch (err) {
          console.error("Failed to fetch invitation:", err);
        }
      };
      fetchInvitation();
    }
  }, [location]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  // Password strength helpers
  const hasEightChars = formData.password.length >= 8;
  const hasNumber = /\d/.test(formData.password);
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);
  const strengthCount = [hasEightChars, hasNumber, hasUpper, hasSpecial].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthCount];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][strengthCount];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password.trim();

    // Validate institutional email
    if (!trimmedEmail.endsWith('@phinmaed.com')) {
      setError('❌ Please use your institutional email (@phinmaed.com) to register.');
      return;
    }

    // Validate password match
    if (trimmedPassword !== formData.confirmPassword.trim()) {
      setError('❌ Passwords do not match.');
      return;
    }

    // Validate password strength
    if (!hasEightChars || !hasNumber || !hasUpper || !hasSpecial) {
      setError('❌ Password must be at least 8 characters with an uppercase letter, number, and special character.');
      return;
    }

    if (!formData.agreeTerms) {
      setError('❌ You must agree to the Terms of Use and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check that this email was invited by a Dean
      const advisersRef = collection(db, 'advisers');
      const q = query(advisersRef, where('email', '==', trimmedEmail), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('❌ No invitation found for this email. Please make sure you are using the email that was invited by your Dean.');
        setLoading(false);
        return;
      }

      const invitationDoc = snapshot.docs[0];
      const invitationData = invitationDoc.data();

      // 2. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const newUser = userCredential.user;

      // 3. Update the existing invitation record in Firestore
      const adviserRef = doc(db, 'advisers', invitationDoc.id);
      await updateDoc(adviserRef, {
        status: 'active',
        userId: newUser.uid,
        firstName: formData.firstName.trim() || invitationData.firstName,
        lastName: formData.lastName.trim() || invitationData.lastName,
        displayName: `${(formData.firstName.trim() || invitationData.firstName)} ${(formData.lastName.trim() || invitationData.lastName)}`,
        activatedAt: new Date().toISOString()
      });

      setSuccess('✅ Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('❌ This email is already registered. Please go to the Login page instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('❌ Password is too weak. Please use a stronger password.');
      } else {
        setError(`❌ Sign up failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center font-sans p-6 bg-cover bg-center overflow-x-hidden"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="max-w-md w-full rounded-2xl border border-white/50 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden transition-colors">
        
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#7a1f3d]"></div>

        <div className="mb-4">
          <h2 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">Create Account</h2>
          <div className="mt-2 flex flex-col items-start gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a1f3d] dark:text-[#f8d070] bg-red-50 dark:bg-[#7a1f3d]/20 border border-red-100 dark:border-[#f8d070]/30 px-2 py-0.5 rounded-md">
              Research Adviser
            </span>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Register for your Adviser account</p>
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

        <form onSubmit={handleSignUp} className="space-y-3">
          
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">First Name <span className="text-red-500">*</span></label>
              <input name="firstName" value={formData.firstName} onChange={handleChange} type="text" placeholder="e.g. Maria" 
                className={`w-full border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 dark:focus:ring-[#f8d070]/20 focus:border-[#7a1f3d] dark:focus:border-[#f8d070] transition-all disabled:opacity-50 ${isPrefilled ? 'bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 cursor-not-allowed' : 'bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200'}`} 
                readOnly={isPrefilled} required disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input name="lastName" value={formData.lastName} onChange={handleChange} type="text" placeholder="e.g. Cendana" 
                className={`w-full border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 dark:focus:ring-[#f8d070]/20 focus:border-[#7a1f3d] dark:focus:border-[#f8d070] transition-all disabled:opacity-50 ${isPrefilled ? 'bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 cursor-not-allowed' : 'bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200'}`} 
                readOnly={isPrefilled} required disabled={loading} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="e.g. adviser.cendana@phinmaed.com" 
              className={`w-full border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 dark:focus:ring-[#f8d070]/20 focus:border-[#7a1f3d] dark:focus:border-[#f8d070] transition-all disabled:opacity-50 ${isPrefilled ? 'bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 cursor-not-allowed' : 'bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200'}`} 
              readOnly={isPrefilled} required disabled={loading} />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input 
                name="password" value={formData.password} onChange={handleChange}
                type={showPassword ? "text" : "password"} 
                placeholder="Create a strong password" 
                className="w-full bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 dark:focus:ring-[#f8d070]/20 focus:border-[#7a1f3d] dark:focus:border-[#f8d070] transition-all disabled:opacity-50" 
                required disabled={loading}
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
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="flex justify-between items-center mt-3 mb-1">
                <div className="w-1/2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1.5 w-full rounded-full ${i <= strengthCount ? strengthColor : 'bg-stone-200'}`}></div>
                  ))}
                </div>
                <div className={`text-[10px] font-bold ${strengthCount <= 1 ? 'text-red-500' : strengthCount === 2 ? 'text-yellow-600' : strengthCount === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                  {strengthLabel}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input 
                name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm your password" 
                className="w-full bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/20 dark:focus:ring-[#f8d070]/20 focus:border-[#7a1f3d] dark:focus:border-[#f8d070] transition-all disabled:opacity-50" 
                required disabled={loading}
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

          <div className="flex items-start gap-3 mt-2 bg-stone-50/50 dark:bg-stone-900/50 p-2 rounded-lg border border-stone-100 dark:border-stone-800">
            <input 
              name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} 
              type="checkbox" 
              className="w-4 h-4 text-[#7a1f3d] dark:text-[#f8d070] border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 rounded focus:ring-[#7a1f3d] dark:focus:ring-[#f8d070] mt-0.5" 
              disabled={loading}
            />
            <label className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              I agree to the <span onClick={() => setShowTerms(true)} className="font-bold text-[#7a1f3d] dark:text-[#f8d070] cursor-pointer hover:underline">Terms of Service</span> and <span onClick={() => setShowPrivacy(true)} className="font-bold text-[#7a1f3d] dark:text-[#f8d070] cursor-pointer hover:underline">Privacy Policy</span>.
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.agreeTerms || formData.password !== formData.confirmPassword}
            className="w-full bg-[#7a1f3d] hover:bg-[#5a162d] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-[#7a1f3d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>

          <div className="text-center pt-3 border-t border-stone-100 dark:border-stone-800 mt-4">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              Already have an account? <Link to="/" className="text-[#7a1f3d] dark:text-[#f8d070] font-bold hover:underline ml-1">Sign in here</Link>
            </p>
          </div>
        </form>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
            <h3 className="text-xl font-serif font-bold mb-4 text-[#7a2e46]">Terms of Use</h3>
            <div className="text-sm text-gray-600 max-h-60 overflow-y-auto space-y-3">
              <p>Welcome to ARCHIVIO. By accessing our portal, you agree to these terms.</p>
              <p>1. <strong>Usage:</strong> The system is strictly for academic research management.</p>
              <p>2. <strong>Accountability:</strong> You are responsible for all activities under your account.</p>
              <p>3. <strong>Data Integrity:</strong> Do not upload falsified or malicious data.</p>
              <p>Please use this platform responsibly to guide our future researchers.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowTerms(false)} className="px-4 py-2 bg-[#7a2e46] text-white rounded-lg text-sm font-semibold hover:bg-[#5f2135]">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
            <h3 className="text-xl font-serif font-bold mb-4 text-[#7a2e46]">Privacy Policy</h3>
            <div className="text-sm text-gray-600 max-h-60 overflow-y-auto space-y-3">
              <p>Your privacy is important to us. This policy outlines how we handle your data.</p>
              <p>1. <strong>Data Collection:</strong> We collect only necessary academic and profile information.</p>
              <p>2. <strong>Data Usage:</strong> Your data is used exclusively to facilitate the research management process within SWU Phinma.</p>
              <p>3. <strong>Data Protection:</strong> We employ standard encryption and security practices to protect your records.</p>
              <p>We do not share your information with third parties outside of academic administration requirements.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowPrivacy(false)} className="px-4 py-2 bg-[#7a2e46] text-white rounded-lg text-sm font-semibold hover:bg-[#5f2135]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
