import React from 'react';
import swuLogoSeal from '../../assets/logo.png';
import parchmentBg from '../../assets/parchment.jpg';

export default function Header({ studentName }) {
  // Safety check: Kung undefined o null ang studentName, gamiton ang 'STUDENT'
  const displayName = studentName || 'STUDENT';

  return (
    <div 
      className="w-full flex items-center gap-4 px-7 py-3 border-b border-[#b4a078]/30 shrink-0 z-50"
      style={{ 
        backgroundImage: `url(${parchmentBg})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center top' 
      }}
    >
      <img src={swuLogoSeal} alt="SWU Logo" className="w-[52px] h-[52px] object-contain" />
      <span className="text-[17px] font-bold text-[#3a1a1a] tracking-[0.18em]">
        WELCOME {displayName.toUpperCase()}
      </span>
    </div>
  );
}
