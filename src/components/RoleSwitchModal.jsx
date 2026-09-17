import React, { useEffect } from 'react';

export default function RoleSwitchModal({ isOpen, onClose, targetRole = 'adviser', onConfirm }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSwitchingToAdviser = targetRole === 'adviser';

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      window.location.href = isSwitchingToAdviser ? '/adviser/dashboard' : '/dean/dashboard';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden transform animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              Role Switcher
            </span>
            <span className="text-stone-300 dark:text-stone-600">›</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B1F35] dark:text-[#f8d070]">
              {isSwitchingToAdviser ? 'Adviser Mode' : 'Dean Mode'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 flex flex-col items-center text-center">
          {/* Animated Avatar Icon */}
          <div className="relative mb-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${
              isSwitchingToAdviser 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600'
                : 'bg-[#7B1F35]/10 dark:bg-[#7B1F35]/30 border border-[#7B1F35]/20 dark:border-[#7B1F35]/50 text-[#7B1F35] dark:text-[#f8d070]'
            }`}>
              {isSwitchingToAdviser ? '🧑‍🏫' : '🎓'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 flex items-center justify-center text-[10px] shadow font-bold text-stone-700 dark:text-stone-300">
              ⇄
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            {isSwitchingToAdviser ? 'Switch to Adviser Mode?' : 'Switch to Dean Mode?'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md leading-relaxed">
            {isSwitchingToAdviser 
              ? 'You will temporarily leave your Dean portal and enter your Research Adviser workspace. Your Dean functions will be paused — no approvals, publishing, or user management while in this mode.'
              : 'You will temporarily leave your Research Adviser workspace and enter your Dean portal to manage approvals, manuscripts, publishing, and system oversight.'}
          </p>

          {/* Leaving vs Entering Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6 text-left">
            {/* Card 1: Leaving */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-stone-400 dark:text-stone-500 uppercase">
                  LEAVING
                </span>
                <div className="flex items-center gap-2 mt-1 mb-2 font-bold text-sm text-stone-800 dark:text-stone-200">
                  <span>{isSwitchingToAdviser ? '🎓 Dean Mode' : '🧑‍🏫 Adviser Mode'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                  {isSwitchingToAdviser ? (
                    <>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Approve research</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Publish to archive</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Manage advisers</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> View all submissions</li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Manage my groups</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Track requirements</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Submit research</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> View group progress</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Card 2: Entering */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
              isSwitchingToAdviser
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                : 'bg-[#7B1F35]/5 dark:bg-[#7B1F35]/20 border-[#7B1F35]/30 dark:border-[#7B1F35]/60'
            }`}>
              <div>
                <span className={`text-[10px] font-bold tracking-wider uppercase ${
                  isSwitchingToAdviser ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#7B1F35] dark:text-[#f8d070]'
                }`}>
                  ENTERING
                </span>
                <div className={`flex items-center gap-2 mt-1 mb-2 font-bold text-sm ${
                  isSwitchingToAdviser ? 'text-emerald-900 dark:text-emerald-200' : 'text-[#7B1F35] dark:text-[#f8d070]'
                }`}>
                  <span>{isSwitchingToAdviser ? '🧑‍🏫 Adviser Mode' : '🎓 Dean Mode'}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                  {isSwitchingToAdviser ? (
                    <>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Manage my groups</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Track requirements</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Submit research</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> View group progress</li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35] dark:bg-[#f8d070]"></span> Approve research</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35] dark:bg-[#f8d070]"></span> Publish to archive</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35] dark:bg-[#f8d070]"></span> Manage advisers</li>
                      <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35] dark:bg-[#f8d070]"></span> View all submissions</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Self-Approval Rule Alert Box */}
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-left">
            <span className="text-base mt-0.5">⚠️</span>
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-normal">
              {isSwitchingToAdviser ? (
                <>
                  <strong className="font-bold">Self-approval rule applies:</strong> Any research you submit as Adviser cannot be approved by you as Dean. It will be automatically forwarded to the Vice Dean.
                </>
              ) : (
                <>
                  <strong className="font-bold">Executive Oversight Active:</strong> You will have full executive authority to review, approve, and publish research manuscripts across all departments.
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              {isSwitchingToAdviser ? 'Stay as Dean' : 'Stay as Adviser'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isSwitchingToAdviser
                  ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
                  : 'bg-[#7B1F35] hover:bg-[#601628] active:bg-[#4d1120]'
              }`}
            >
              <span>{isSwitchingToAdviser ? 'Yes, Switch to Adviser' : 'Yes, Switch to Dean'}</span>
              <span className="text-sm">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
