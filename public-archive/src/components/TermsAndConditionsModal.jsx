import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.png';

/**
 * TermsAndConditionsModal
 * Professional institutional Terms and Conditions and Data Privacy Policy modal
 * for ARCHIVIO - Research Archive Management System at Southwestern University PHINMA.
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {function} onAccept - Optional callback when user accepts the terms (e.g., during registration)
 * @param {string} initialTab - 'terms' | 'privacy' (default: 'terms')
 */
export default function TermsAndConditionsModal({
  isOpen,
  onClose,
  onAccept,
  initialTab = 'terms'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'terms');
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'terms');
      setSearchQuery('');
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialTab]);

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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
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
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-[#7a2039] dark:text-[#f3e5ab] font-sans">
                    SWU PHINMA • College of Information Technology
                  </span>
                  <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
                    Official Institutional Policy
                  </span>
                </div>
                <h2
                  id="terms-modal-title"
                  className="text-lg sm:text-2xl font-serif font-bold text-[#4a1220] dark:text-[#f7edd2] tracking-tight leading-tight mt-0.5"
                >
                  ARCHIVIO Governance &amp; Legal Framework
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Academic Archival Agreement &bull; R.A. 8293 &amp; R.A. 10173 Compliance &bull; Effective A.Y. 2025–2026
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

          {/* TAB CONTROLS & SEARCH BAR */}
          <div className="mt-4 pt-3 border-t border-[#ede6d9] dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-black/30 rounded-xl border border-stone-200 dark:border-white/10 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setActiveTab('terms'); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-[#7a2039] text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Terms and Conditions</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('privacy'); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#7a2039] text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Data Privacy Policy</span>
              </button>
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
                placeholder="Search within policy..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7a2039]/50 transition"
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
          {activeTab === 'terms' && (
            <div className="hidden sm:flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-[11px] text-stone-500 dark:text-stone-400 scrollbar-hide">
              <span className="font-semibold text-stone-700 dark:text-stone-300 shrink-0">Jump to:</span>
              <button type="button" onClick={() => scrollToSection('sec-acceptance')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">1. Acceptance</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-purpose')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">2. Purpose</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-ip')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0 font-medium text-[#7a2039] dark:text-[#f3e5ab]">3. Intellectual Property</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-plagiarism')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0 font-medium text-[#7a2039] dark:text-[#f3e5ab]">4. Plagiarism</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-protection')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">5. Watermark &amp; Security</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-conduct')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">6. Conduct</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-disclaimer')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">7. Disclaimers</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-contact')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">8. Contact</button>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="hidden sm:flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-[11px] text-stone-500 dark:text-stone-400 scrollbar-hide">
              <span className="font-semibold text-stone-700 dark:text-stone-300 shrink-0">Jump to:</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-scope')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">1. Statutory Scope</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-data')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">2. Data Collected</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-purpose')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">3. Purpose of Processing</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-security')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">4. Security</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-rights')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0 font-medium text-[#7a2039] dark:text-[#f3e5ab]">5. Data Subject Rights</button>
              <span>&bull;</span>
              <button type="button" onClick={() => scrollToSection('sec-priv-contact')} className="hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:underline shrink-0">6. DPO Contact</button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* MODAL BODY (SCROLLABLE POLICY CONTENT) */}
        {/* ============================================================ */}
        <div
          ref={contentRef}
          className="p-5 sm:p-7 overflow-y-auto flex-1 font-sans text-xs sm:text-sm leading-relaxed space-y-6 text-stone-700 dark:text-stone-300 selection:bg-[#7a2039]/20"
        >
          {/* TAB 1: TERMS AND CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              
              {/* Document Overview Header */}
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-amber-50/80 to-stone-50 dark:from-[#251a1e] dark:to-[#1a1416] border border-amber-200/60 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl">🏛️</span>
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab]">
                      Institutional Archival Use Agreement
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                      Welcome to <strong>ARCHIVIO</strong>, the official Research Archive Management System of <strong>Southwestern University PHINMA (SWU PHINMA)</strong>. ARCHIVIO operates under the institutional mandate of the College of Information Technology and the University Research Office to catalog, preserve, and showcase undergraduate capstone projects, theses, and scholarly dissertations.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      <span className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-white/10 text-stone-700 dark:text-stone-300">
                        Version 2.4 (Institutional)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-white/10 text-stone-700 dark:text-stone-300">
                        Governing Law: Republic of the Philippines
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Acceptance of Terms */}
              <section id="sec-acceptance" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">1</span>
                  Acceptance of Terms &amp; Scope of Application
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  By accessing, browsing, searching, creating an account, or interacting with any services provided on the ARCHIVIO public portal, you signify that you have read, understood, and agreed to be legally bound by these Terms and Conditions. This agreement applies to all users without distinction, including enrolled students, faculty members, thesis advisers, academic evaluators, guest researchers, and public visitors. If you do not agree with any provision herein, you must immediately discontinue your use of this platform.
                </p>
              </section>

              {/* 2. Institutional & Academic Purpose */}
              <section id="sec-purpose" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">2</span>
                  Academic &amp; Research Mandate
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  ARCHIVIO is established exclusively for non-commercial academic research, pedagogical review, curriculum development, and institutional accreditation purposes. Users are granted a limited, revocable, non-exclusive license to view abstracts, metadata, and authorized manuscript previews for personal scholarly evaluation. Commercial exploitation, reselling of research manuscripts, automated bulk downloading, or packaging of content into third-party commercial databases is strictly forbidden.
                </p>
              </section>

              {/* 3. Intellectual Property Rights (R.A. 8293) */}
              <section id="sec-ip" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">3</span>
                  Intellectual Property &amp; Authorship Rights (Republic Act No. 8293)
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  All research papers, capstone projects, software artifacts, system architectures, and scholarly manuscripts hosted on ARCHIVIO are protected under the <strong>Intellectual Property Code of the Philippines (Republic Act No. 8293)</strong> and university intellectual property guidelines:
                </p>
                <ul className="mt-2.5 list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-300">
                  <li>
                    <strong>Author Copyright Retention:</strong> Student proponents and co-authors retain moral rights and copyright ownership of their original manuscripts.
                  </li>
                  <li>
                    <strong>Institutional Archival License:</strong> By submitting manuscripts to SWU PHINMA through ARCHIVIO, authors grant the University a non-exclusive, perpetual, royalty-free institutional license to preserve, catalog, index, display, and make available the work for scholarly, educational, and accreditation reference.
                  </li>
                  <li>
                    <strong>Mandatory Citation:</strong> Any academic reference, excerpt, or literature review utilizing findings hosted on ARCHIVIO must provide full attribution conforming to recognized standards (APA 7th, IEEE, or MLA).
                  </li>
                </ul>

                {/* Citation Callout Card */}
                <div className="mt-3 p-3.5 rounded-lg bg-stone-100/80 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-mono text-stone-700 dark:text-stone-300">
                  <div className="flex items-center justify-between text-[11px] font-sans font-bold text-[#7a2039] dark:text-[#f3e5ab] mb-1">
                    <span>Standard Repository Citation Format (APA 7th):</span>
                    <span className="uppercase text-[10px] tracking-wider text-stone-500">Required Attribution</span>
                  </div>
                  <code>Author(s). (Year). Research Title [Undergraduate Thesis/Capstone, Southwestern University PHINMA]. ARCHIVIO Institutional Repository. Record ARCH-SWU-XXXXXX.</code>
                </div>
              </section>

              {/* 4. Anti-Plagiarism & Academic Integrity Alert */}
              <section id="sec-plagiarism" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">4</span>
                  Strict Anti-Plagiarism &amp; Academic Integrity Policy
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  Southwestern University PHINMA enforces a strict zero-tolerance policy against academic dishonesty and plagiarism in all forms. Users are strictly prohibited from:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                  <li>Copying, duplicating, or reproducing student manuscripts without explicit authorization;</li>
                  <li>Paraphrasing substantial findings, methodology, or code without proper scholarly citation;</li>
                  <li>Submitting any manuscript or component found in ARCHIVIO as one&apos;s own academic work, thesis, or coursework;</li>
                  <li>Distributing, licensing, or publishing archived content on commercial homework mills or essay-sharing websites.</li>
                </ul>

                {/* Plagiarism Warning Banner */}
                <div className="mt-3 p-3.5 rounded-xl bg-rose-50 dark:bg-[#2b1419] border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <strong className="block text-rose-950 dark:text-rose-100 font-semibold mb-0.5">
                      Institutional Enforcement &amp; Sanctions
                    </strong>
                    Any unauthorized duplication, plagiarized reuse, or intellectual theft of ARCHIVIO research will be treated as a grave offense, subject to immediate account termination, referral to the SWU PHINMA Student Disciplinary Board and Academic Integrity Committee, and potential civil or criminal litigation under Philippine copyright and cybercrime statutes.
                  </div>
                </div>
              </section>

              {/* 5. Document Protection Measures & Anti-Circumvention */}
              <section id="sec-protection" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">5</span>
                  Document Security &amp; Anti-Circumvention Measures (R.A. 10175)
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  To safeguard author intellectual property and enforce institutional integrity, ARCHIVIO incorporates multiple layers of technical document protection within its secure reader:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-1">🛡️ Dynamic Watermarking</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">
                      All rendered pages embed dynamic, tamper-evident digital watermarks containing reader identifiers, timestamps, and institutional archive seals.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-1">🚫 Clipboard &amp; Copy Disabling</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">
                      Right-click context menus, clipboard extraction, text selection, and unauthorized print shortcuts are programmatically restricted.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-1">🔒 Download Access Control</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">
                      Direct raw PDF downloads are restricted. Manuscript viewing occurs strictly within the authorized sandbox reader environment.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-1">📜 Tamper-Proof Certificates</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">
                      Archival endorsements feature cryptographically verifiable QR codes and SHA-256 verification hashes validated on public records.
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-stone-600 dark:text-stone-400 text-xs">
                  Any attempt to disable, bypass, decompile, reverse-engineer, screen-scrape, or manipulate these technical protections constitutes a violation of these Terms and the <strong>Cybercrime Prevention Act of 2012 (Republic Act No. 10175)</strong>.
                </p>
              </section>

              {/* 6. User Accounts & Acceptable Conduct */}
              <section id="sec-conduct" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">6</span>
                  User Accounts, Authentication &amp; Acceptable Conduct
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  When creating an account or browsing ARCHIVIO, you agree to:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                  <li>Provide truthful, authentic, and accurate registration information;</li>
                  <li>Use official SWU PHINMA institutional emails (<code>@phinmaed.com</code>) where applicable for institutional roles;</li>
                  <li>Maintain the strict confidentiality of your authentication credentials;</li>
                  <li>Take full responsibility for all activities, bookmarks, and sessions carried out under your account;</li>
                  <li>Never attempt account-sharing, proxying, identity impersonation, or unauthorized access to administrative or adviser privileges.</li>
                </ul>
              </section>

              {/* 7. Prohibited System Activities */}
              <section className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">7</span>
                  Prohibited Technical Activities
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  The following technical activities are strictly forbidden and will result in immediate IP banning and legal action:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                  <li>Deploying web scrapers, spiders, headless browsers, or automated crawlers against the archive;</li>
                  <li>Attempting Denial of Service (DoS/DDoS) or flooding repository search infrastructure;</li>
                  <li>Injecting malicious scripts, payloads, or attempting database injection attacks;</li>
                  <li>Falsifying or altering archival certificate verification records or QR payloads.</li>
                </ul>
              </section>

              {/* 8. Disclaimers & Limitation of Liability */}
              <section id="sec-disclaimer" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">8</span>
                  System Availability &amp; Limitation of Liability
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  ARCHIVIO is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. Southwestern University PHINMA and the College of Information Technology make no representations or warranties that system operation will be uninterrupted or error-free. Scheduled maintenance, software upgrades, and network outages may temporarily affect availability without incurring university liability.
                </p>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  Research findings, experimental data, and conclusions documented in archived manuscripts reflect the intellectual work of the individual student proponents and advisers at the time of publication and do not necessarily constitute an official institutional endorsement by SWU PHINMA.
                </p>
              </section>

              {/* 9. Contact & Governance */}
              <section id="sec-contact" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">9</span>
                  Administrative Contact &amp; Inquiries
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  For questions regarding copyright permissions, archival certification verification, academic citations, or reports of intellectual property infringement, please reach out to:
                </p>
                <div className="mt-3 p-4 rounded-xl bg-stone-100/90 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs space-y-1">
                  <p className="font-bold text-[#4a1220] dark:text-[#f3e5ab] text-sm">
                    Office of the System Administrator &amp; Research Coordinator
                  </p>
                  <p className="text-stone-700 dark:text-stone-300">College of Information Technology &bull; Southwestern University PHINMA</p>
                  <p className="text-stone-600 dark:text-stone-400">Urgello St., Sambag 1, Cebu City 6000, Philippines</p>
                  <p className="pt-2 border-t border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                    <span className="font-semibold text-[#7a2039] dark:text-[#f3e5ab]">Official Email:</span>{' '}
                    <a href="mailto:archivio.admin@gmail.com" className="underline hover:text-[#7a2039] dark:hover:text-[#f3e5ab] font-medium">
                      archivio.admin@gmail.com
                    </a>
                  </p>
                </div>
              </section>

            </div>
          )}

          {/* TAB 2: DATA PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">

              {/* Statutory Framework Banner */}
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

              {/* 1. Statutory Scope */}
              <section id="sec-priv-scope" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">1</span>
                  Statutory Scope &amp; Processing Principles
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  Personal data collected through ARCHIVIO is processed in accordance with the fundamental principles of <strong>transparency, legitimate purpose, and proportionality</strong>. We collect only what is strictly necessary to deliver institutional research archiving, certificate verification, and user account management.
                </p>
              </section>

              {/* 2. Personal Information Collected */}
              <section id="sec-priv-data" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">2</span>
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

              {/* 3. Purpose of Processing */}
              <section id="sec-priv-purpose" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">3</span>
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
                <p className="mt-2 font-medium text-[#7a2039] dark:text-[#f3e5ab]">
                  We never monetize, sell, lease, or distribute your personal information to third-party commercial advertisers or data brokers.
                </p>
              </section>

              {/* 4. Security & Firebase Infrastructure */}
              <section id="sec-priv-security" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">4</span>
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

              {/* 5. Statutory Rights under R.A. 10173 */}
              <section id="sec-priv-rights" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">5</span>
                  Your Statutory Rights as a Data Subject
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  Under Chapter III of Republic Act No. 10173, you possess the following enforceable rights:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">1. Right to Be Informed</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to know how, why, and to what extent your personal data is collected and processed.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">2. Right to Access</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You may request reasonable access to personal data held about you within the system.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">3. Right to Rectification</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to dispute and request the correction of inaccurate, erroneous, or outdated information.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">4. Right to Erasure / Blocking</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You may request the suspension, withdrawal, or deletion of your personal account data upon graduation or disaffiliation.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">5. Right to Object</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to object to processing where such processing is based on consent or legitimate interests.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-[#7a2039] dark:text-[#f3e5ab] block text-xs mb-0.5">6. Right to File a Complaint</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">You have the right to lodge a complaint with the National Privacy Commission (NPC) if your privacy rights have been violated.</span>
                  </div>
                </div>
              </section>

              {/* 6. Contact Data Protection Officer */}
              <section id="sec-priv-contact" className="scroll-mt-4">
                <h4 className="font-serif font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">6</span>
                  Data Protection Officer (DPO) Inquiries
                </h4>
                <p className="mt-2 text-stone-600 dark:text-stone-300">
                  To exercise any of your data privacy rights or submit inquiries regarding institutional data handling, please contact:
                </p>
                <div className="mt-3 p-4 rounded-xl bg-stone-100/90 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs space-y-1">
                  <p className="font-bold text-[#4a1220] dark:text-[#f3e5ab] text-sm">
                    Data Protection Desk &bull; College of Information Technology
                  </p>
                  <p className="text-stone-700 dark:text-stone-300">Southwestern University PHINMA &bull; Cebu City, Philippines</p>
                  <p className="pt-2 border-t border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                    <span className="font-semibold text-[#7a2039] dark:text-[#f3e5ab]">Privacy Inquiries:</span>{' '}
                    <a href="mailto:archivio.admin@gmail.com" className="underline hover:text-[#7a2039] dark:hover:text-[#f3e5ab] font-medium">
                      archivio.admin@gmail.com
                    </a>
                  </p>
                </div>
              </section>

            </div>
          )}

        </div>

        {/* ============================================================ */}
        {/* MODAL FOOTER ACTION BAR */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 border-t border-[#e2dac9] dark:border-white/10 bg-white/95 dark:bg-[#1f181c]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
            <svg className="w-4 h-4 text-[#7a2039] dark:text-[#f3e5ab] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              By using ARCHIVIO, you agree to uphold SWU PHINMA academic research integrity.
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
                className="px-5 py-2 bg-gradient-to-r from-[#7a2039] to-[#541223] hover:from-[#8b2440] hover:to-[#631529] text-white rounded-xl text-xs font-bold shadow-md shadow-[#7a2039]/25 hover:shadow-[#7a2039]/40 hover:brightness-105 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>I Understand &amp; Agree</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
