import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import edge from '../assets/edge.png'; 
import bg from '../assets/parchment.png'; // Gi-sakto ngadto sa .png gikan sa imong sidebar

function ArchiveLogin() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden font-serif">
      
      {/* LEFT SIDE: Maroon Panel */}
      <div className="w-full md:w-[45%] bg-[#24050f] text-white flex flex-col justify-between p-12 relative z-20">
        
        {/* Likiliki sa Tunga */}
        <img 
          src={edge} 
          alt="Torn Edge" 
          className="absolute top-0 right-0 h-full w-10 md:w-14 translate-x-1/2 pointer-events-none z-50 object-cover"
        />

        {/* Main Content Area */}
        <div className="flex flex-col items-center text-center my-auto space-y-6 relative z-30">
          <div className="bg-white/5 p-2 rounded-full mb-2">
            <img src={logo} alt="Archivio Logo" className="w-28 h-28 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold tracking-widest text-[#f3e5ab]">ARCHIVIO</h1>
          <h2 className="text-sm font-medium tracking-wide text-amber-200/80 italic">Research Archive Management System</h2>
          <p className="text-xs text-stone-300 max-w-sm leading-relaxed">
            Access thousands of approved academic papers, theses, and capstone projects from SWU PHINMA students and faculty.
          </p>
        </div>

        {/* Stats Container */}
        <div className="grid grid-cols-3 gap-4 bg-black/20 backdrop-blur-sm border border-white/10 p-4 rounded-xl text-center relative z-30">
          <div>
            <p className="text-lg font-bold text-amber-200">1,248</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Papers</p>
          </div>
          <div className="border-x border-white/10">
            <p className="text-lg font-bold text-amber-200">342</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Authors</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-200">27</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">Program</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Welcome Panel */}
      <div 
        className="w-full md:w-[55%] flex items-center justify-center p-8 relative z-10"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-xl max-w-md w-full border border-stone-200/60 flex flex-col items-center">
          <h3 className="text-2xl font-bold text-stone-800 tracking-wide mb-1">Welcome Back</h3>
          <p className="text-xs text-stone-500 text-center mb-8">Sign in to access your bookmarks and personalized reading list.</p>

          <button className="w-full py-3 px-4 border border-stone-300 rounded-lg flex items-center justify-center space-x-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors mb-4 cursor-pointer">
            <span className="text-blue-500 font-bold text-lg">G</span>
            <span>Continue with Google</span>
          </button>

          <div className="w-full flex items-center my-4">
            <div className="flex-1 h-[1px] bg-stone-200"></div>
            <span className="px-3 text-xs text-stone-400 italic">or</span>
            <div className="flex-1 h-[1px] bg-stone-200"></div>
          </div>

          <button className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200/80 rounded-lg flex items-center justify-center space-x-3 text-sm font-medium text-stone-700 transition-colors mb-4 cursor-pointer">
            <span className="text-stone-600 text-lg">👤</span>
            <span>Continue as Guest</span>
          </button>

          <div className="bg-amber-50/60 border border-amber-200/50 p-4 rounded-xl text-center mb-6 w-full">
            <p className="text-xs font-semibold text-amber-800 mb-1 flex justify-center items-center gap-1">📖 Browsing as Guest</p>
            <p className="text-[11px] text-stone-600 leading-relaxed px-2">Search & read papers freely. Log in to bookmark and track your reading history.</p>
          </div>

          {/* LINK PABALIK SA HOME */}
          <Link to="/" className="text-xs text-stone-500 hover:text-stone-800 flex items-center space-x-1 transition-colors">
            <span>←</span>
            <span>Back to Archive</span>
          </Link>
        </div>
      </div>

    </div>
  );
}

export default ArchiveLogin;