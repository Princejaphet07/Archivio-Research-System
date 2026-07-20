import React, { useState } from 'react';

// Import assets
import leftBg from '../assets/Frame (1).png';
import rightBg from '../assets/Rectangle 9 (1).png';
import tornEdge from '../assets/Vector 3.png';
import logo from '../assets/logo.png'; 

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      
      {/* ================== LEFT COLUMN (Maroon Section) - Hidden on Mobile/Tablet ================== */}
      <div 
        className="relative hidden w-[45%] flex-col items-center justify-center lg:flex"
        style={{ 
          backgroundImage: `url('${leftBg}')`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundColor: '#3b1220'
        }}
      >
        {/* Torn Edge Overlay */}
        <div className="absolute inset-y-0 right-0 z-10 translate-x-[45%] h-full">
          <img src={tornEdge} alt="Torn Edge" className="h-full w-auto object-cover" />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-12">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 p-2 shadow-inner border border-white/20">
            <img src={logo} alt="SWU Logo" className="h-full w-full object-contain" />
          </div>
          
          <p className="mb-2 text-xs font-bold tracking-widest text-[#d4af37]">SWU PHINMA</p>
          <h1 className="mb-2 font-serif text-5xl font-bold tracking-widest text-[#fae1a0]">ARCHIVIO</h1>
          
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="h-1 w-1 rotate-45 bg-[#d4af37]"></div>
          </div>
          
          <p className="mb-12 font-serif text-sm text-[#d4af37]">
            Research Archive Management System
          </p>

          {/* Stats Box */}
          <div className="flex w-full max-w-sm divide-x divide-[#d4af37]/20 rounded-xl border border-[#d4af37]/20 bg-[#2a0b16]/40 py-4 backdrop-blur-sm">
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">24</span>
              <span className="text-[10px] text-stone-300">Submissions</span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">8</span>
              <span className="text-[10px] text-stone-300">Pending</span>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <span className="font-serif text-2xl font-bold text-[#fae1a0]">156</span>
              <span className="text-[10px] text-stone-300">Published</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================== RIGHT COLUMN (Paper Section) - Full width on Mobile ================== */}
      <div 
        className="relative flex w-full flex-col justify-center px-6 sm:px-16 lg:w-[55%] lg:px-24"
        style={{ 
          backgroundImage: `url('${rightBg}')`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundColor: '#f5f0e6'
        }}
      >
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:pl-12">
          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Welcome Back!</h2>
            <div className="mt-2 flex flex-col items-start gap-2">
              <p className="text-sm text-stone-600">Sign in to your ARCHIVIO account</p>
              <div className="h-0.5 w-12 bg-[#d4af37]"></div>
            </div>
          </div>

          {/* Login Form Card */}
          <div className="rounded-2xl border border-white/50 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-stone-900">Sign In</h3>
              <p className="text-xs text-stone-500 mt-1">Enter your institutional email and password</p>
              <div className="mt-4 border-b border-stone-200"></div>
            </div>

            {/* Form submit instantly logs in without requiring validation */}
            <form className="space-y-5" onSubmit={(e) => {
              e.preventDefault();
              if (onLogin) onLogin();
            }}>
              
              {/* Email Input (Not Required) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input 
                    type="email" 
                    placeholder="Enter your @swu.phinma.edu.ph email" 
                    className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 pl-10 pr-4 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d]"
                  />
                </div>
              </div>

              {/* Password Input (Not Required) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    className="w-full rounded-lg border border-stone-200 bg-[#faf9f6] py-2.5 pl-10 pr-16 text-sm text-stone-700 outline-none transition-colors focus:border-[#7a1f3d] focus:ring-1 focus:ring-[#7a1f3d]"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#7a1f3d] hover:text-[#5a162d]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="h-3.5 w-3.5 rounded border-stone-300 text-[#7a1f3d] focus:ring-[#7a1f3d]"
                  />
                  <span className="text-xs font-medium text-stone-600">Remember me</span>
                </label>
                <a href="#" className="text-xs font-bold text-[#7a1f3d] hover:underline">
                  Forgot password?
                </a>
              </div>

              {/* Instant Action Submit Button */}
              <button 
                type="submit" 
                className="mt-4 w-full rounded-lg bg-[#7a1f3d] py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-[#5a162d] active:translate-y-0"
              >
                Sign In to ARCHIVIO
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}