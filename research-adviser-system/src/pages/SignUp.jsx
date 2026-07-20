import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import logoImg from '../assets/logo.png'; 
import bgTexture from '../assets/Rectangle 9 (2).png';
import leftPanelBg from '../assets/left-panel-bg.png';
import jaggedEdge from '../assets/jagged-edge.png';

function SignUp() {
  const navigate = useNavigate(); // Initialize navigation

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
        {/* Compact Form Card */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-8 relative z-10">
          
          {/* Invite Banner */}
          <div className="bg-[#faf5f6] border border-gray-200 text-center py-1.5 px-4 rounded-lg mb-5 flex justify-center items-center gap-2">
            <span className="text-xs text-[#7a2e46] font-medium">✉️ Invited by Dean Santos · College of Information Technology</span>
          </div>

          <div className="text-center mb-5">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Create Your Account</h2>
            <p className="text-xs text-gray-500">Fill in your details below to activate your Research Adviser account.</p>
          </div>

          <form>
            {/* Divider */}
            <div className="flex items-center mb-4">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-3 text-[10px] font-bold text-[#d0a36e] uppercase tracking-widest">Personal Details</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">First Name</label>
                <input type="text" placeholder="e.g. Maria" className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Last Name</label>
                <input type="text" placeholder="e.g. Cendana" className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Department</label>
              <select className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 focus:outline-none focus:border-[#7a2e46] appearance-none transition">
                <option>Select your department</option>
                <option>College of Information Technology</option>
              </select>
            </div>

            {/* Divider */}
            <div className="flex items-center mb-4 mt-5">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-3 text-[10px] font-bold text-[#d0a36e] uppercase tracking-widest">Account Setup</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Email Address</label>
              <input type="email" defaultValue="adviser.cendana@swu.phinma.edu.ph" className="w-full bg-[#f4ece3] border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-[#7a2e46] transition" readOnly />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Confirm Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#fcfcfc] border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#7a2e46] transition" />
              </div>
            </div>

            {/* Password Strength Indicator */}
            <div className="flex justify-between items-center mb-4">
               <div className="w-1/2 flex gap-1">
                 <div className="h-1 w-full bg-green-500 rounded-full"></div>
                 <div className="h-1 w-full bg-green-500 rounded-full"></div>
                 <div className="h-1 w-full bg-gray-200 rounded-full"></div>
               </div>
               <div className="text-[9px] text-gray-400">Min. 8 characters with numbers</div>
            </div>
            <p className="text-[11px] text-green-600 font-medium mb-4 mt-[-0.75rem]">Strength: Good</p>

            <div className="flex items-center mb-4">
              <input type="checkbox" className="w-3.5 h-3.5 text-[#7a2e46] bg-gray-100 border-gray-300 rounded focus:ring-[#7a2e46]" defaultChecked />
              <label className="ml-2 text-[11px] text-gray-600">
                I agree to the ARCHIVIO Terms of Use and Privacy Policy
              </label>
            </div>

            {/* Activate Account Button - Now navigates to /dashboard */}
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-[#7a2e46] hover:bg-[#5f2135] text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 mb-4 text-sm"
            >
              Activate Account
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
    </div>
  );
}

export default SignUp;