import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.png';

/**
 * PrivacyPolicyModal
 * Dedicated institutional Data Privacy Policy modal
 * for ARCHIVIO - Research Archive Management System at Southwestern University PHINMA.
 * Fully compliant with Philippine Republic Act No. 10173 (Data Privacy Act of 2012).
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {function} onAccept - Optional callback when user accepts the policy
 */
export default function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAccept
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      const topOffset = el.offsetTop - 80;
      contentRef.current.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  const q = searchQuery.toLowerCase().trim();
  const matches = (text) => !q || (typeof text === 'string' && text.toLowerCase().includes(q));

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div className="bg-[#faf8f5] dark:bg-[#181316] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-[#dcd4c5] dark:border-white/10 overflow-hidden text-stone-800 dark:text-stone-200">
        
        {/* ============================================================ */}
        {/* MODAL HEADER */}
        {/* ============================================================ */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#e2dac9] dark:border-white/10 bg-white/90 dark:bg-[#1f181c]/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            
            {/* Institution & Repository Branding */}
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src={logo}
                alt="SWU PHINMA Seal"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-sm flex-shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-emerald-800 dark:text-emerald-400 font-sans">
                    SWU PHINMA • College of Information Technology
                  </span>
                  <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                    Official Institutional Policy
                  </span>
                </div>
                <h2
                  id="privacy-modal-title"
                  className="text-lg sm:text-2xl font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] tracking-tight leading-tight mt-0.5"
                >
                  ARCHIVIO Data Privacy Policy
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Statutory Data Protection Framework &bull; R.A. 10173 Compliance &bull; Effective A.Y. 2025–2026
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 transition cursor-pointer flex-shrink-0"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* POLICY IDENTIFIER & SEARCH BAR (NO TABS) */}
          <div className="mt-4 pt-3 border-t border-[#ede6d9] dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Dedicated Policy Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <svg className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Republic Act No. 10173 (Data Privacy Act of 2012)</span>
            </div>

            {/* Quick Keyword Filter */}
            <div className="relative w-full sm:w-64">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search within Privacy Policy..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  &times;
                </button>
              )}
            </div>

          </div>

          {/* Quick Jump Navigation */}
          <div className="hidden sm:flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-[11px] text-stone-500 dark:text-stone-400 scrollbar-hide">
            <span className="font-semibold text-stone-700 dark:text-stone-300 shrink-0">Jump to:</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-scope')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0">1. Statutory Scope</button>
            <span>&bull;</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-data')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0">2. Data Collected</button>
            <span>&bull;</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-purpose')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0">3. Purpose of Processing</button>
            <span>&bull;</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-security')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0">4. Security</button>
            <span>&bull;</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-rights')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0 font-medium text-emerald-800 dark:text-emerald-300">5. Data Subject Rights</button>
            <span>&bull;</span>
            <button type="button" onClick={() => scrollToSection('sec-priv-contact')} className="hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline shrink-0">6. DPO Contact</button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MODAL BODY (SCROLLABLE PRIVACY CONTENT) */}
        {/* ============================================================ */}
        <div
          ref={contentRef}
          className="p-5 sm:p-7 overflow-y-auto flex-1 font-sans text-xs sm:text-sm leading-relaxed space-y-6 text-stone-700 dark:text-stone-300 selection:bg-emerald-500/20"
        >
          {/* Statutory Framework Banner */}
          {(!q || matches('Compliance with the Philippine Data Privacy Act of 2012 Republic Act No. 10173 National Privacy Commission')) && (
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-50/90 to-stone-50 dark:from-[#16271e] dark:to-[#171316] border border-emerald-200/70 dark:border-emerald-800/40">
              <div className="flex items-start gap-3">
                <span className="text-xl sm:text-2xl">🔒</span>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300">
                    Compliance with the Philippine Data Privacy Act of 2012
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                    ARCHIVIO is committed to upholding your statutory rights under <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and the regulations established by the <strong>National Privacy Commission (NPC)</strong>. We process your data transparently, securely, and exclusively for verified academic archival functions.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                      RA 10173 Fully Aligned
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-white/10 text-stone-700 dark:text-stone-300">
                      Zero Commercial Advertising
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. Statutory Scope */}
          {(!q || matches('Statutory Scope Processing Principles transparency legitimate purpose proportionality')) && (
            <section id="sec-priv-scope" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">1</span>
                Statutory Scope &amp; Processing Principles
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Personal data collected through ARCHIVIO is processed in accordance with the fundamental principles of <strong>transparency, legitimate purpose, and proportionality</strong>. We collect only what is strictly necessary to deliver institutional research archiving, certificate verification, and user account management.
              </p>
            </section>
          )}

          {/* 2. Personal Information Collected */}
          {(!q || matches('Categories Personal Data Collected user profile email department activity bookmark')) && (
            <section id="sec-priv-data" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">2</span>
                Categories of Personal Data Collected
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Depending on your interaction with the public archive, we may collect the following data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-stone-900 dark:text-stone-100 block text-xs mb-1">👤 User Account Profiles</strong>
                  <ul className="text-xs text-stone-600 dark:text-stone-400 list-disc pl-4 space-y-0.5">
                    <li>Full Name and Display Name</li>
                    <li>Institutional Email Address (<code>@phinmaed.com</code>) or verified email</li>
                    <li>Encrypted authentication credentials via Firebase Auth</li>
                    <li>Academic Program or Department affiliation</li>
                  </ul>
                </div>
                <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-stone-900 dark:text-stone-100 block text-xs mb-1">📖 Academic Activity &amp; Bookmarks</strong>
                  <ul className="text-xs text-stone-600 dark:text-stone-400 list-disc pl-4 space-y-0.5">
                    <li>Personal saved reading lists and bookmarks</li>
                    <li>Search queries and filter preferences</li>
                    <li>Certificate verification lookup logs</li>
                    <li>Paper view counters and access telemetry</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* 3. Purpose of Processing */}
          {(!q || matches('Purpose of Data Processing authenticate bookmarks metrics monetize sell')) && (
            <section id="sec-priv-purpose" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">3</span>
                Purpose of Data Processing
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Collected data is used strictly for the following purposes:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                <li>Authenticating user identities and safeguarding archive access;</li>
                <li>Delivering personalized research features (e.g., personal reading lists and saved studies);</li>
                <li>Generating statistical archive views and departmental research metrics for academic evaluation;</li>
                <li>Validating the legitimacy of archival certificates issued to student researchers;</li>
                <li>Preventing automated scraping, credential attacks, and unauthorized system intrusion.</li>
              </ul>
              <p className="mt-2 font-medium text-emerald-800 dark:text-emerald-300">
                We never monetize, sell, lease, or distribute your personal information to third-party commercial advertisers or data brokers.
              </p>
            </section>
          )}

          {/* 4. Security & Firebase Infrastructure */}
          {(!q || matches('Security Infrastructure Technical Safeguards HTTPS TLS Firestore AES-256 Firebase Auth encryption')) && (
            <section id="sec-priv-security" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">4</span>
                Security Infrastructure &amp; Technical Safeguards
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                ARCHIVIO employs industry-standard organizational, physical, and technical measures:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                <li><strong>Encrypted Transport:</strong> All data is transmitted over secure HTTPS with TLS 1.3 encryption.</li>
                <li><strong>Encrypted Storage:</strong> User records and metadata are stored in Google Cloud Firestore with AES-256 encryption at rest.</li>
                <li><strong>Password Protection:</strong> Passwords are never stored in plaintext and are managed by Google Firebase Authentication with secure cryptographic hashing.</li>
                <li><strong>Role-Based Access:</strong> Access to user logs and administrative data is restricted strictly to authorized university administrators.</li>
              </ul>
            </section>
          )}

          {/* 5. Statutory Rights under R.A. 10173 */}
          {(!q || matches('Statutory Rights Data Subject informed access rectification erasure blocking object complaint NPC')) && (
            <section id="sec-priv-rights" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">5</span>
                Your Statutory Rights as a Data Subject
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                Under Chapter III of Republic Act No. 10173, you possess the following enforceable rights:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">1. Right to Be Informed</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to know how, why, and to what extent your personal data is collected and processed.</span>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">2. Right to Access</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You may request reasonable access to personal data held about you within the system.</span>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">3. Right to Rectification</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to dispute and request the correction of inaccurate, erroneous, or outdated information.</span>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">4. Right to Erasure / Blocking</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You may request the suspension, withdrawal, or deletion of your personal account data upon graduation or disaffiliation.</span>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">5. Right to Object</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to object to processing where such processing is based on consent or legitimate interests.</span>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                  <strong className="text-emerald-800 dark:text-emerald-300 block text-xs mb-0.5">6. Right to File a Complaint</strong>
                  <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to lodge a complaint with the National Privacy Commission (NPC) if your privacy rights have been violated.</span>
                </div>
              </div>
            </section>
          )}

          {/* 6. Contact Data Protection Officer */}
          {(!q || matches('Data Protection Officer DPO Inquiries College Information Technology email')) && (
            <section id="sec-priv-contact" className="scroll-mt-4">
              <h4 className="font-serif font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-700/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">6</span>
                Data Protection Officer (DPO) Inquiries
              </h4>
              <p className="mt-2 text-stone-600 dark:text-stone-300">
                To exercise any of your data privacy rights or submit inquiries regarding institutional data handling, please contact:
              </p>
              <div className="mt-3 p-4 rounded-xl bg-stone-100/90 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs space-y-1">
                <p className="font-bold text-[#1f3d2e] dark:text-[#d2f7e0] text-sm">
                  Data Protection Desk &bull; College of Information Technology
                </p>
                <p className="text-stone-700 dark:text-stone-300">Southwestern University PHINMA &bull; Cebu City, Philippines</p>
                <p className="pt-2 border-t border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400">Privacy Inquiries:</span>{' '}
                  <a href="mailto:archivio.admin@gmail.com" className="underline hover:text-emerald-800 dark:hover:text-emerald-300 font-medium">
                    archivio.admin@gmail.com
                  </a>
                </p>
              </div>
            </section>
          )}

          {/* No results message */}
          {q && (
            <div className="text-center py-6 text-stone-500 text-xs">
              No matching provisions found for &ldquo;{searchQuery}&rdquo;.
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ml-2 text-emerald-700 dark:text-emerald-400 font-semibold underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* MODAL FOOTER ACTION BAR */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 border-t border-[#e2dac9] dark:border-white/10 bg-white/95 dark:bg-[#1f181c]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
            <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>
              ARCHIVIO is fully aligned with Philippine Republic Act No. 10173 (Data Privacy Act of 2012).
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer flex items-center gap-1.5"
              title="Print Policy"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer"
            >
              Close
            </button>

            {onAccept && (
              <button
                type="button"
                onClick={handleAccept}
                className="px-5 py-2 bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/25 hover:shadow-emerald-900/40 hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>I Understand &amp; Acknowledge</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
