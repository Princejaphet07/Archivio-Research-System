import React from 'react';

function Footer() {
  return (
    <footer className="bg-[#1a050d] text-stone-400 py-6 px-8 md:px-16 font-sans text-[11px] border-t-4 border-[#3d0c1b]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start">
        
        {/* Left Side: Logo & Info */}
        <div className="mb-5 md:mb-0">
          <h2 className="text-[#f3e5ab] text-lg font-serif font-bold tracking-widest mb-1">
            ARCHIVIO
          </h2>
          <p className="mb-0.5">Research Archive Management System</p>
          <p>SWU PHINMA • Cebu City, Philippines</p>
        </div>

        {/* Center: Navigation */}
        <div className="flex flex-col space-y-1 mb-5 md:mb-0">
          <h3 className="text-[#8c7435] font-bold mb-1 tracking-widest uppercase text-[9px]">Navigation</h3>
          <a href="#" className="hover:text-amber-200 transition">Home</a>
          <a href="#" className="hover:text-amber-200 transition">Browse Research</a>
          <a href="#" className="hover:text-amber-200 transition">About</a>
          <a href="#" className="hover:text-amber-200 transition">Contact Library</a>
        </div>

        {/* Right Side: Copyright */}
        <div className="md:text-right flex flex-col md:justify-end mt-2 md:mt-0">
          <p className="mb-0.5">© 2025 SWU PHINMA • ARCHIVIO</p>
          <p>Capstone Project • BSIT</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;