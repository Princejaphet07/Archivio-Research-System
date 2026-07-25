import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

function Header() {
  const location = useLocation();
  const path = location.pathname;
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();

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
    </nav>
  );
}

export default Header;