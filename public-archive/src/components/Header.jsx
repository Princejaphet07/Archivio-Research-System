import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/logo.png';

function Header() {
  const location = useLocation();
  const path = location.pathname;
  const { currentUser, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="flex justify-between items-center px-12 py-4 bg-[#3d0c1b] text-white relative z-50 shadow-md w-full">
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
      <div className="flex space-x-4 font-sans text-sm items-center">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/10 transition text-amber-200"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        {currentUser ? (
          <>
            <span className="hidden md:block text-stone-300">
              Welcome, {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
            </span>
            <button 
              onClick={handleLogout}
              className="px-5 py-2 border border-white/30 rounded hover:bg-white/10 transition cursor-pointer"
            >
              Logout
            </button>
          </>
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

      {/* MOBILE MENU TOGGLE */}
      <button 
        className="md:hidden text-white hover:text-amber-200 transition"
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

      {/* MOBILE DROPDOWN */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#3d0c1b] border-t border-white/10 md:hidden shadow-xl font-sans text-sm flex flex-col z-50">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/' ? 'text-[#d6ad60]' : 'text-white'}`}>Home</Link>
          <Link to="/browse" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/browse' ? 'text-[#d6ad60]' : 'text-white'}`}>Browse</Link>
          <Link to="/bookmarks" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/bookmarks' ? 'text-[#d6ad60]' : 'text-white'}`}>Bookmarks</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)} className={`px-6 py-4 border-b border-white/5 ${path === '/about' ? 'text-[#d6ad60]' : 'text-white'}`}>About</Link>
        </div>
      )}
    </nav>
  );
}

export default Header;