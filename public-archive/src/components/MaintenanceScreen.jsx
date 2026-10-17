import React, { useState } from 'react';
import { useSystemLogo } from '../hooks/useSystemLogo';

export default function MaintenanceScreen({ portalName = 'Public Research Archive' }) {
  const { logoUrl } = useSystemLogo();
  const [checking, setChecking] = useState(false);

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#FAF7F0] via-[#F4EFE6] to-[#EAE3D6] dark:from-[#18181b] dark:via-[#1c1917] dark:to-[#0c0a09] text-stone-800 dark:text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      <style>{`
        @keyframes typeHandLeft {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-2deg); }
        }
        @keyframes typeHandRight {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes headBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes screenGlow {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(128, 30, 56, 0.45)) drop-shadow(0 0 35px rgba(245, 158, 11, 0.25)); }
          50% { filter: drop-shadow(0 0 24px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 45px rgba(128, 30, 56, 0.35)); }
        }
        @keyframes steamFloat {
          0% { transform: translateY(0) scaleX(1); opacity: 0.7; }
          50% { transform: translateY(-8px) scaleX(1.3); opacity: 0.4; }
          100% { transform: translateY(-16px) scaleX(0.8); opacity: 0; }
        }
        @keyframes floatTag1 {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes floatTag2 {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes floatTag3 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes codeLineAnim {
          0% { width: 0%; opacity: 0.3; }
          50% { width: 85%; opacity: 1; }
          100% { width: 100%; opacity: 0.7; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        .anim-hand-left { animation: typeHandLeft 0.28s infinite ease-in-out; transform-origin: 155px 175px; }
        .anim-hand-right { animation: typeHandRight 0.32s infinite ease-in-out 0.1s; transform-origin: 195px 175px; }
        .anim-head { animation: headBob 2.5s infinite ease-in-out; }
        .anim-screen-glow { animation: screenGlow 3.5s infinite ease-in-out; }
        .anim-steam-1 { animation: steamFloat 2s infinite linear; }
        .anim-steam-2 { animation: steamFloat 2s infinite linear 1s; }
        .anim-tag-1 { animation: floatTag1 3.8s infinite ease-in-out; }
        .anim-tag-2 { animation: floatTag2 4.2s infinite ease-in-out 0.8s; }
        .anim-tag-3 { animation: floatTag3 3.4s infinite ease-in-out 1.5s; }
        .anim-code-bar { animation: codeLineAnim 2s infinite ease-in-out; }
        .anim-pulse-dot { animation: pulseDot 1.8s infinite ease-in-out; }
      `}</style>

      {/* Decorative ambient background circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#801e38]/10 dark:bg-[#801e38]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="max-w-2xl w-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-stone-900/10 dark:shadow-black/40 flex flex-col items-center text-center relative z-10 transition-all">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={logoUrl || '/assets/logo.png'}
            alt="ARCHIVIO"
            className="w-10 h-10 object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="text-left">
            <span className="font-serif font-black tracking-wider text-[#801e38] dark:text-red-400 text-lg block leading-tight">
              ARCHIVIO
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-stone-500 dark:text-stone-400 block">
              Southwestern University PHINMA
            </span>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 text-xs font-bold tracking-wide uppercase shadow-xs mb-5">
          <span className="w-2 h-2 rounded-full bg-amber-500 anim-pulse-dot"></span>
          <span>System Maintenance Active</span>
          {portalName && (
            <span className="bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded-full text-[10px] font-mono lowercase">
              {portalName}
            </span>
          )}
        </div>

        {/* ============================================================== */}
        {/* ANIMATED CODER / DEVELOPER ILLUSTRATION (Interactive SVG) */}
        {/* ============================================================== */}
        <div className="relative w-full max-w-[340px] sm:max-w-[400px] h-[210px] sm:h-[230px] my-2 flex items-center justify-center">
          
          {/* Floating Code Snippets / Tags */}
          <div className="absolute top-2 left-2 sm:left-4 anim-tag-1 z-20">
            <div className="bg-[#801e38] text-white font-mono text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-red-300/30 flex items-center gap-1.5">
              <span className="text-amber-300">&lt;/&gt;</span>
              <span>npm run update</span>
            </div>
          </div>

          <div className="absolute top-4 right-1 sm:right-3 anim-tag-2 z-20">
            <div className="bg-stone-900 dark:bg-stone-800 text-emerald-400 font-mono text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-stone-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-pulse-dot"></span>
              <span>git commit -m "upgrade"</span>
            </div>
          </div>

          <div className="absolute bottom-6 right-2 sm:right-6 anim-tag-3 z-20">
            <div className="bg-amber-500 text-stone-950 font-mono text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
              <span>⚡</span>
              <span>Optimizing DB</span>
            </div>
          </div>

          {/* Master Animated SVG */}
          <svg
            viewBox="0 0 350 200"
            className="w-full h-full overflow-visible drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="laptopGlowPub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#801e38" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="hoodieGradPub" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#801e38" />
                <stop offset="100%" stopColor="#4a0e1c" />
              </linearGradient>
              <linearGradient id="deskGradPub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e7e5e4" />
                <stop offset="100%" stopColor="#d6d3d1" />
              </linearGradient>
            </defs>

            {/* Desk Surface */}
            <rect x="25" y="155" width="300" height="12" rx="6" fill="url(#deskGradPub)" className="dark:fill-stone-700" />
            <rect x="50" y="167" width="10" height="33" rx="2" fill="#a8a29e" className="dark:fill-stone-800" />
            <rect x="290" y="167" width="10" height="33" rx="2" fill="#a8a29e" className="dark:fill-stone-800" />

            {/* Coffee Mug with Steaming Vapor */}
            <g transform="translate(60, 132)">
              <rect x="0" y="4" width="18" height="19" rx="3" fill="#801e38" />
              <path d="M 18 8 Q 25 8 25 14 Q 25 19 18 19" fill="none" stroke="#801e38" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 5 0 Q 3 -5 5 -10" fill="none" stroke="#d6d3d1" strokeWidth="1.5" strokeLinecap="round" className="anim-steam-1" />
              <path d="M 11 -2 Q 14 -7 11 -12" fill="none" stroke="#d6d3d1" strokeWidth="1.5" strokeLinecap="round" className="anim-steam-2" />
            </g>

            {/* Programmer Body: Chair Back */}
            <rect x="155" y="90" width="40" height="65" rx="8" fill="#44403c" className="dark:fill-stone-800" />
            <rect x="171" y="155" width="8" height="25" fill="#292524" />

            {/* Programmer: Torso & Shoulders */}
            <path
              d="M 140 160 Q 142 125 160 120 Q 175 116 190 120 Q 208 125 210 160 Z"
              fill="url(#hoodieGradPub)"
            />

            {/* Programmer: Head with animated bobbing */}
            <g className="anim-head">
              <rect x="170" y="105" width="10" height="15" fill="#fbcfe8" rx="2" />
              <circle cx="175" cy="95" r="17" fill="#292524" />
              <circle cx="175" cy="98" r="14" fill="#fcd34d" />
              <path d="M 160 92 Q 175 80 190 92 Q 185 84 175 85 Q 165 84 160 92 Z" fill="#1c1917" />
              <path d="M 158 98 Q 158 80 175 80 Q 192 80 192 98" fill="none" stroke="#801e38" strokeWidth="4" strokeLinecap="round" />
              <rect x="156" y="93" width="5" height="10" rx="2" fill="#801e38" />
              <rect x="189" y="93" width="5" height="10" rx="2" fill="#801e38" />
            </g>

            {/* Programmer: Arms & Hands Typing (Animated) */}
            <path
              d="M 146 130 Q 148 152 165 154"
              fill="none"
              stroke="#801e38"
              strokeWidth="9"
              strokeLinecap="round"
              className="anim-hand-left"
            />
            <path
              d="M 204 130 Q 202 152 185 154"
              fill="none"
              stroke="#801e38"
              strokeWidth="9"
              strokeLinecap="round"
              className="anim-hand-right"
            />

            {/* The Laptop & Glowing Monitor Screen */}
            <g transform="translate(135, 110)">
              <rect x="25" y="44" width="30" height="4" rx="2" fill="#78716c" />
              <polygon points="12,47 68,47 78,52 2,52" fill="#a8a29e" className="dark:fill-stone-600" />
              <g className="anim-screen-glow">
                <rect x="15" y="5" width="50" height="38" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                <rect x="19" y="10" width="22" height="2.5" rx="1" fill="#38bdf8" />
                <rect x="19" y="15" width="35" height="2" rx="1" fill="#a78bfa" className="anim-code-bar" />
                <rect x="23" y="19" width="28" height="2" rx="1" fill="#34d399" />
                <rect x="23" y="23" width="18" height="2" rx="1" fill="#fbbf24" />
                <rect x="19" y="27" width="38" height="2" rx="1" fill="#f43f5e" />
                <rect x="19" y="32" width="14" height="2" rx="1" fill="#38bdf8" />
                <rect x="35" y="32" width="3" height="3" fill="#ffffff" className="anim-pulse-dot" />
              </g>
            </g>

            {/* Plant on Desk */}
            <g transform="translate(265, 135)">
              <polygon points="4,20 18,20 16,10 6,10" fill="#d97706" />
              <path d="M 11 10 Q 5 2 2 4" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 11 10 Q 11 0 11 2" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 11 10 Q 17 2 20 4" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* Informative Content */}
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 dark:text-stone-50 mb-2.5">
          System Under Maintenance
        </h1>

        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-lg mb-6 leading-relaxed">
          The ARCHIVIO Public Research Archive is currently undergoing scheduled platform upgrades and optimizations to serve you better.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="px-6 py-2.5 bg-[#801e38] hover:bg-[#68182d] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#801e38]/20 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{checking ? 'Checking Status...' : 'Check Status / Refresh'}</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-6 max-w-sm">
          Normal operations will resume automatically once updates are finalized. Thank you for your patience.
        </p>

      </div>
    </div>
  );
}
