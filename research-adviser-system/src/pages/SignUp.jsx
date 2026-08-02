import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import logoImg from '../assets/logo.png'; 
import bgTexture from '../assets/Rectangle 9 (2).png';
import leftPanelBg from '../assets/left-panel-bg.png';
import jaggedEdge from '../assets/jagged-edge.png';

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
        navigate('/login');
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
    <div className="min-h-screen flex font-sans text-gray-800 overflow-x-hidden">
      
      {/* Left Column: Info Panel */}
      <div 
        className="w-full lg:w-[40%] text-white flex flex-col items-center py-12 px-10 xl:px-16 relative shadow-2xl z-10"
        style={{ 
          backgroundImage: `url("${leftPanelBg}")`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'top center' 
        }}
      >
        {/* Fixed Jagged Edge */}
        <img 
          src={jaggedEdge} 
          className="absolute top-0 right-0 h-full w-[36px] translate-x-1/2 z-30 pointer-events-none hidden lg:block object-cover" 
          alt="" 
        />
        
        {/* Header section */}
        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-[#542133]/40 rounded-full flex items-center justify-center border border-[#d0a36e] mb-3 backdrop-blur-sm">
            <img src={logoImg} alt="Archivio Logo" className="w-12 h-12 object-contain" />
          </div>
          <p className="text-[#d0a36e] text-xs tracking-[0.2em] font-semibold uppercase mb-1">SWU Phinma</p>
          <h1 className="text-4xl font-serif tracking-widest mb-3 font-bold">ARCHIVIO</h1>
          <div className="w-2 flex gap-1 mb-3 text-[#d0a36e]">♦</div>
          <h2 className="text-lg italic font-serif text-gray-200 mb-3">Research Adviser Portal</h2>
          <p className="text-center text-xs text-gray-300 max-w-[260px] leading-relaxed">
            Guide student research groups, review manuscripts, and help shape the next generation of researchers.
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex w-full justify-between border border-[#5a1f33]/60 rounded-xl p-3 mb-6 bg-[#481426]/50 backdrop-blur-sm relative z-10">
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">24</div>
            <div className="text-[11px] text-gray-300">Submissions</div>
          </div>
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">8</div>
            <div className="text-[11px] text-gray-300">Pending</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-[#d0a36e] text-xl font-bold font-serif">156</div>
            <div className="text-[11px] text-gray-300">Published</div>
          </div>
        </div>

        {/* Features List */}
        <div className="w-full space-y-2.5 relative z-10">
          <div className="flex items-center space-x-3 bg-[#481426]/40 backdrop-blur-sm p-3 rounded-xl border border-[#5a1f33]/60 hover:bg-[#541b2f]/60 transition">
            <div className="bg-[#3a0c1b]/80 p-2 rounded text-blue-300 text-lg">👥</div>
            <div>
              <div className="text-xs font-semibold">Manage Student Groups</div>
              <div className="text-[11px] text-gray-400">Track progress & submissions</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-[#481426]/40 backdrop-blur-sm p-3 rounded-xl border border-[#5a1f33]/60 hover:bg-[#541b2f]/60 transition">
            <div className="bg-white/90 p-2 rounded text-black text-lg">📝</div>
            <div>
              <div className="text-xs font-semibold">Review Manuscripts</div>
              <div className="text-[11px] text-gray-400">Provide feedback & approve work</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-[#481426]/40 backdrop-blur-sm p-3 rounded-xl border border-[#5a1f33]/60 hover:bg-[#541b2f]/60 transition">
            <div className="bg-[#3a0c1b]/80 p-2 rounded text-green-400 text-lg">📊</div>
            <div>
              <div className="text-xs font-semibold">Track Requirements</div>
              <div className="text-[11px] text-gray-400">Monitor document compliance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div 
        className="hidden lg:flex flex-1 justify-center items-center p-6 bg-[#f5f0e6]"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-8 relative z-10">
          
          {/* Invite Banner */}
          <div className="bg-[#faf5f6] border border-gray-200 text-center py-1.5 px-4 rounded-lg mb-5 flex justify-center items-center gap-2">
            <span className="text-xs text-[#7a2e46] font-medium">✉️ Invited by your Dean · Use your @phinmaed.com email</span>
          </div>

          <div className="text-center mb-5">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Create Your Account</h2>
            <p className="text-xs text-gray-500">Fill in your details below to activate your Research Adviser account.</p>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSignUp}>
            {/* Divider */}
            <div className="flex items-center mb-4">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-3 text-[10px] font-bold text-[#d0a36e] uppercase tracking-widest">Personal Details</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">First Name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} type="text" placeholder="e.g. Maria" 
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition ${isPrefilled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#fcfcfc]'}`} 
                  readOnly={isPrefilled} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Last Name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} type="text" placeholder="e.g. Cendana" 
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition ${isPrefilled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#fcfcfc]'}`} 
                  readOnly={isPrefilled} required />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center mb-4 mt-5">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-3 text-[10px] font-bold text-[#d0a36e] uppercase tracking-widest">Account Setup</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email Address <span className="text-gray-400 font-normal">(must be @phinmaed.com)</span></label>
              <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="e.g. adviser.cendana@phinmaed.com" 
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition ${isPrefilled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-[#fcfcfc]'}`} 
                readOnly={isPrefilled} required />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input 
                    name="password" value={formData.password} onChange={handleChange}
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 pr-9 text-xs focus:outline-none focus:border-[#7a2e46] transition" 
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 pr-9 text-xs focus:outline-none focus:border-[#7a2e46] transition" 
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="flex justify-between items-center mb-3">
                <div className="w-1/2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 w-full rounded-full ${i <= strengthCount ? strengthColor : 'bg-gray-200'}`}></div>
                  ))}
                </div>
                <div className={`text-[9px] font-semibold ${strengthCount <= 1 ? 'text-red-400' : strengthCount === 2 ? 'text-yellow-500' : strengthCount === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                  {strengthLabel}
                </div>
              </div>
            )}

            <div className="flex items-center mb-4">
              <input name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} type="checkbox" className="w-3.5 h-3.5 text-[#7a2e46] bg-gray-100 border-gray-300 rounded focus:ring-[#7a2e46]" />
              <label className="ml-2 text-[11px] text-gray-600">
                I agree to the ARCHIVIO <span onClick={() => setShowTerms(true)} className="text-[#7a2e46] hover:underline cursor-pointer font-semibold">Terms of Use</span> and <span onClick={() => setShowPrivacy(true)} className="text-[#7a2e46] hover:underline cursor-pointer font-semibold">Privacy Policy</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading || !formData.agreeTerms}
              className="w-full bg-[#7a2e46] hover:bg-[#5f2135] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 mb-4 text-sm"
            >
              {loading ? 'Creating Account...' : 'Activate Account'}
            </button>

            <div className="text-center text-xs text-gray-500">
              Already have an account? <Link to="/login" className="text-[#7a2e46] font-semibold hover:underline">Sign In here</Link>
            </div>

            <div className="mt-5 text-center text-[9px] text-gray-400 flex justify-center items-center gap-1">
              🔒 Your information is encrypted and secure.
            </div>

          </form>
        </div>
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