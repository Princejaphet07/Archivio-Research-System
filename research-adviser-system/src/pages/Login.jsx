import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Imported Link and useNavigate
import logoImg from '../assets/logo.png'; 
import bgTexture from '../assets/Rectangle 9 (2).png';
import leftPanelBg from '../assets/left-panel-bg.png';
import jaggedEdge from '../assets/jagged-edge.png';

function Login() {
  const navigate = useNavigate(); // Initialize navigation

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
        {/* Fixed Jagged Edge */}
        <img 
          src={jaggedEdge} 
          className="absolute top-0 right-0 h-full w-[36px] translate-x-1/2 z-30 pointer-events-none hidden lg:block object-cover" 
          alt="" 
        />
        
        {/* Header section */}
        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-[#542133]/40 rounded-full flex items-center justify-center border border-[#d0a36e] mb-4 backdrop-blur-sm">
            <img src={logoImg} alt="Archivio Logo" className="w-14 h-14 object-contain" />
          </div>
          <p className="text-[#d0a36e] text-xs tracking-[0.2em] font-semibold uppercase mb-2">SWU Phinma</p>
          <h1 className="text-5xl font-serif tracking-widest mb-4 font-bold">ARCHIVIO</h1>
          <div className="w-2 flex gap-1 mb-4 text-[#d0a36e]">♦</div>
          <h2 className="text-lg font-serif text-[#d0a36e] mb-3">Research Archive Management System</h2>
        </div>

        {/* Stats Row */}
        <div className="flex w-full max-w-sm justify-between border border-[#5a1f33]/60 rounded-xl p-4 mb-6 bg-[#481426]/50 backdrop-blur-sm relative z-10">
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">24</div>
            <div className="text-[11px] text-gray-300 mt-1">Submissions</div>
          </div>
          <div className="text-center w-1/3 border-r border-[#5a1f33]/60">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">8</div>
            <div className="text-[11px] text-gray-300 mt-1">Pending</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-[#d0a36e] text-2xl font-bold font-serif">156</div>
            <div className="text-[11px] text-gray-300 mt-1">Published</div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area */}
      <div 
        className="hidden lg:flex flex-1 flex-col justify-center p-6 bg-[#f5f0e6]"
        style={{ backgroundImage: `url("${bgTexture}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-lg mx-auto relative z-10 pl-4">
          
          {/* Welcome Text Area */}
          <div className="mb-6">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Welcome Back!</h1>
            <p className="text-sm text-gray-600 mb-3">Sign in to your ARCHIVIO account</p>
            <div className="w-12 h-[2px] bg-[#d0a36e]"></div>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-xl shadow-2xl w-full p-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-[11px] text-gray-400">Enter your institutional email and password</p>
            </div>
            
            <hr className="border-gray-100 mb-5" />

            <form>
              {/* Email Address */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">✉️</span>
                  <input 
                    type="email" 
                    placeholder="Enter your @swu.phinma.edu.ph email" 
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition" 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔒</span>
                  <input 
                    type="password" 
                    placeholder="Enter your password" 
                    className="w-full bg-[#faf7f5] border border-gray-200 rounded-lg pl-9 pr-12 py-2.5 text-xs focus:outline-none focus:border-[#7a2e46] transition" 
                  />
                  <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] font-bold text-[#7a2e46] hover:text-[#5f2135]">
                    Show
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <input type="checkbox" className="w-3.5 h-3.5 text-[#7a2e46] bg-gray-100 border-gray-300 rounded focus:ring-[#7a2e46]" />
                  <label className="ml-2 text-[11px] text-gray-600">Remember me</label>
                </div>
                <Link to="#" className="text-[11px] font-semibold text-[#7a2e46] hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button - Now navigates to /dashboard */}
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-[#7a2e46] hover:bg-[#5f2135] text-white font-semibold py-3 px-4 rounded-lg transition duration-200 text-sm"
              >
                Sign In to ARCHIVIO
              </button>
              
              <div className="mt-5 text-center text-xs text-gray-500">
                Don't have an account? <Link to="/signup" className="text-[#7a2e46] font-semibold hover:underline">Sign Up here</Link>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;