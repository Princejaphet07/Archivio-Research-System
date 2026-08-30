import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SettingsModal from './SettingsModal';
import logo from '../assets/logo.png';

function Header() {
  const location = useLocation();
  const path = location.pathname;
  const { currentUser, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="flex justify-between items-center px-4 md:px-12 py-4 bg-[#3d0c1b] text-white sticky top-0 z-50 shadow-md w-full transition-all">
      <Link to="/" className="flex items-center space-x-3">
        <img src={logo} alt="Logo" className="w-10 h-10 object-contain bg-white/10 rounded-full p-1" />
        <span className="text-xl font-bold tracking-widest text-[#f3e5ab]">ARCHIVIO</span>
      </Link>
      <div className="hidden md:flex space-x-8 text-sm font-sans">
        <Link to="/" className={`${path === '/' ? 'text-[#d6ad60]' : 'hover:text-amber-200'} transition`}>Home</Link>
        <Link to="/browse" className={`${path === '/browse' ? 'text-[#d6ad60]' : 'hover:text-amber-200'} transition`}>Browse</Link>
        <Link to="/bookmarks" className={`${path === '/bookmarks' ? 'text-[#d6ad60]' : 'hover:text-amber-200'} transition`}>Bookmarks</Link>
        <Link to="/about" className={`${path === '/about' ? 'text-[#d6ad60]' : 'hover:text-amber-200'} transition`}>About</Link>
      </div>
      <div className="hidden md:flex space-x-4 font-sans text-sm items-center">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition text-amber-200"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        {currentUser ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 hover:bg-white/5 px-2 py-1.5 rounded-lg transition"
            >
              <div className="w-8 h-8 rounded-full bg-[#d6ad60] text-[#3d0c1b] flex items-center justify-center font-bold text-sm">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-stone-200">
                {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-stone-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 py-1 text-stone-800 dark:text-stone-200 z-50">
                <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-700 md:hidden">
                  <p className="text-sm font-semibold truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
                </div>
                
                <button 
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Settings
                </button>
                
                <button 
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login" className="px-5 py-2 border border-white/30 rounded hover:bg-white/10 transition">
              Log In
            </Link>
            <Link to="/login" className="px-5 py-2 bg-[#d6ad60] text-stone-900 font-semibold rounded hover:bg-[#ebdcb9] transition cursor-pointer">
              Sign Up
            </Link>
          </>
        )}
      </div>



      {/* MOBILE ACTIONS HEADER (Dark mode + hamburger) */}
      <div className="flex md:hidden items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition text-amber-200"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button 
          className="text-white hover:text-amber-200 transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* MOBILE DROPDOWN */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#3d0c1b] border-t border-white/10 md:hidden shadow-xl font-sans text-sm flex flex-col z-50">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/' ? 'text-[#d6ad60]' : 'text-white'}`}>Home</Link>
          <Link to="/browse" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/browse' ? 'text-[#d6ad60]' : 'text-white'}`}>Browse</Link>
          <Link to="/bookmarks" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/bookmarks' ? 'text-[#d6ad60]' : 'text-white'}`}>Bookmarks</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/about' ? 'text-[#d6ad60]' : 'text-white'}`}>About</Link>
          
          {/* MOBILE AUTH LINKS */}
          <div className="px-6 py-4 flex flex-col gap-3">
            {currentUser ? (
              <>
                <span className="text-stone-300">Welcome, {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}</span>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-center py-2 border border-white/30 rounded hover:bg-white/10 transition">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full text-center py-2 border border-white/30 rounded hover:bg-white/10 transition">Log In</Link>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full text-center py-2 bg-[#d6ad60] text-stone-900 font-semibold rounded hover:bg-[#ebdcb9] transition">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
}

export default Header;