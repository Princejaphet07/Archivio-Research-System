import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import logo from '../assets/logo.png';

export default function ArchiveTerms() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('terms');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // If user navigated to /privacy or state was set
    if (location.pathname === '/privacy' || location.state?.tab === 'privacy') {
      setActiveTab('privacy');
    } else {
      setActiveTab('terms');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.state]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#120d0f] text-stone-800 dark:text-stone-200 font-sans flex flex-col selection:bg-[#7a2039]/20">
      <Header />

      {/* HERO BANNER */}
      <div className="relative bg-gradient-to-b from-[#3a0815] via-[#541223] to-[#24060d] text-white pt-24 pb-16 px-6 sm:px-12 border-b-4 border-[#7a2039] overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#7a2039]/30 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <img
              src={logo}
              alt="SWU PHINMA Seal"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md bg-white/10 p-2 rounded-2xl backdrop-blur-sm border border-white/20"
            />
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold tracking-wider uppercase text-[#f3e5ab] mb-2">
                <span>Institutional Regulatory Framework</span>
                <span>&bull;</span>
                <span>SWU PHINMA</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
                ARCHIVIO Terms &amp; Archival Governance
              </h1>
              <p className="mt-2 text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Official terms of use, intellectual property protection, academic integrity mandates, and compliance with the Philippine Data Privacy Act of 2012 for the Southwestern University PHINMA Research Repository.
              </p>
            </div>
          </div>

          {/* Quick Stats / Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Governing Office</span>
              <span className="font-semibold text-stone-200">College of Information Tech</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Effective Period</span>
              <span className="font-semibold text-stone-200">Academic Year 2025–2026</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Copyright Law</span>
              <span className="font-semibold text-stone-200">R.A. 8293 Protected</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Data Privacy</span>
              <span className="font-semibold text-stone-200">R.A. 10173 Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 w-full flex-1">
        
        {/* NAV CONTROLS */}
        <div className="bg-white dark:bg-[#1a1416] p-3 sm:p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sticky top-20 z-30 backdrop-blur-md bg-white/95 dark:bg-[#1a1416]/95">
          
          {/* Tabs Switcher */}
          <div className="flex items-center gap-2 p-1 bg-stone-100 dark:bg-black/30 rounded-xl border border-stone-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-[#7a2039] text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Terms and Conditions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-[#7a2039] text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Data Privacy Policy</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Policy</span>
            </button>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7a2039] hover:bg-[#8b2440] text-white shadow-sm transition"
            >
              Go to Portal &rarr;
            </Link>
          </div>

        </div>

        {/* POLICY BODY */}
        <div className="mt-8 bg-white dark:bg-[#1a1416] p-6 sm:p-10 rounded-2xl shadow-sm border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 text-sm leading-relaxed space-y-8">
          
          {activeTab === 'terms' && (
            <div className="space-y-8">
              
              <div className="border-b border-stone-200 dark:border-white/10 pb-6">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#64182e] dark:text-[#f3e5ab]">
                  Institutional Terms and Conditions of Archival Use
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Southwestern University PHINMA &bull; College of Information Technology &bull; Document Reference: ARCH-SWU-TOS-2026
                </p>
              </div>

              {/* 1. Acceptance */}
              <section id="page-sec-acceptance">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">1</span>
                  Acceptance of Terms &amp; Scope of Application
                </h3>
                <p>
                  By accessing, browsing, searching, registering an account, or interacting with any services provided by <strong>ARCHIVIO</strong>, you agree to be bound by these Terms and Conditions. These terms constitute a legally binding agreement between you and Southwestern University PHINMA (SWU PHINMA). They govern access across all user categories, including undergraduate students, faculty advisers, external researchers, and general public visitors. If you do not agree with any portion of these terms, you must cease using this system immediately.
                </p>
              </section>

              {/* 2. Purpose */}
              <section id="page-sec-purpose">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">2</span>
                  Institutional Archival &amp; Academic Mandate
                </h3>
                <p>
                  ARCHIVIO is established solely to preserve, index, catalog, and disseminate academic capstone projects, theses, and scholarly output created by the SWU PHINMA community. The repository is dedicated to non-commercial academic research, curriculum enrichment, and institutional accreditation. Commercial exploitation, reselling, or unauthorized bulk aggregation of materials hosted on ARCHIVIO is strictly prohibited.
                </p>
              </section>

              {/* 3. Intellectual Property */}
              <section id="page-sec-ip">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">3</span>
                  Intellectual Property &amp; Moral Rights (Republic Act No. 8293)
                </h3>
                <p>
                  In compliance with Republic Act No. 8293 (Intellectual Property Code of the Philippines):
                </p>
                <ul className="mt-2.5 list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Author Ownership:</strong> Student authors and faculty co-advisers retain copyright and moral rights over their original theses, manuscripts, and software documentation.
                  </li>
                  <li>
                    <strong>Institutional Non-Exclusive License:</strong> Proponents grant SWU PHINMA a perpetual, royalty-free institutional license to preserve, format, abstract, index, and display their manuscripts for non-commercial educational, accreditation, and archival purposes.
                  </li>
                  <li>
                    <strong>Mandatory Academic Citation:</strong> Any quote, excerpt, or literature review utilizing studies indexed on ARCHIVIO must conform to academic attribution standards (APA 7th, IEEE, or MLA).
                  </li>
                </ul>

                <div className="mt-4 p-4 rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 font-mono text-xs">
                  <p className="font-sans font-bold text-[#7a2039] dark:text-[#f3e5ab] mb-1">Standard Citation Example (APA 7th):</p>
                  <code>Proponent, A. B. (2026). Title of Capstone Project [Undergraduate Research, Southwestern University PHINMA]. ARCHIVIO Institutional Repository. Record ARCH-SWU-XXXXXX.</code>
                </div>
              </section>

              {/* 4. Anti-Plagiarism */}
              <section id="page-sec-plagiarism">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">4</span>
                  Zero-Tolerance Anti-Plagiarism Policy
                </h3>
                <p>
                  Plagiarism in any form—including verbatim copying without quotation, paraphrasing without attribution, unauthorized code reproduction, or submitting another author&apos;s capstone work as your own—is strictly forbidden. SWU PHINMA vigorously enforces ethical research standards.
                </p>
                <div className="mt-3 p-4 rounded-xl bg-rose-50 dark:bg-[#2e141a] border border-rose-200 dark:border-rose-900/60 text-xs text-rose-950 dark:text-rose-200 flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <strong className="block font-bold mb-0.5">Disciplinary Sanctions &amp; Legal Liability</strong>
                    Violations will result in immediate archive expulsion, cancellation of academic credentials, and formal referral to the University Student Disciplinary Board and College Academic Integrity Committee, with potential civil or criminal liability under Philippine intellectual property and cybercrime laws.
                  </div>
                </div>
              </section>

              {/* 5. Document Protection */}
              <section id="page-sec-protection">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">5</span>
                  Document Security &amp; Anti-Circumvention (R.A. 10175)
                </h3>
                <p>
                  ARCHIVIO manuscripts are protected by dynamic tamper-evident session watermarks, right-click restrictions, clipboard copy disabling, canvas shielding, and controlled download protocols. Any attempt to disable, bypass, decompile, reverse-engineer, screen-scrape, or manipulate these technical protections is illegal under the <strong>Cybercrime Prevention Act of 2012 (Republic Act No. 10175)</strong>.
                </p>
              </section>

              {/* 6. User Conduct */}
              <section id="page-sec-conduct">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">6</span>
                  User Conduct &amp; Prohibited Activities
                </h3>
                <p>
                  Users agree to maintain authentic credentials, safeguard account details, and never share authentication tokens. The use of automated scraping bots, vulnerability scanners, or denial-of-service scripts is strictly prohibited and subject to immediate IP blacklisting.
                </p>
              </section>

              {/* 7. Disclaimers */}
              <section id="page-sec-disclaimer">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">7</span>
                  System Availability &amp; Limitation of Liability
                </h3>
                <p>
                  ARCHIVIO is provided &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo;. SWU PHINMA is not liable for temporary service interruptions, scheduled maintenance, or network downtime. Research opinions and conclusions expressed in student manuscripts reflect the perspectives of the authors at the time of publication and do not necessarily represent the official views of Southwestern University PHINMA.
                </p>
              </section>

              {/* 8. Contact */}
              <section id="page-sec-contact" className="pt-4 border-t border-stone-200 dark:border-white/10">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#5a1428] dark:text-[#f3e5ab] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7a2039]/10 dark:bg-white/10 text-[#7a2039] dark:text-[#f3e5ab] inline-flex items-center justify-center text-xs font-sans font-bold">8</span>
                  Institutional Inquiries &amp; Administration
                </h3>
                <p>
                  For copyright queries, citation permissions, or institutional validation requests, please contact:
                </p>
                <div className="mt-3 p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs">
                  <p className="font-bold text-[#64182e] dark:text-[#f3e5ab] text-sm">Office of the System Administrator</p>
                  <p>College of Information Technology &bull; Southwestern University PHINMA</p>
                  <p>Urgello St., Sambag 1, Cebu City 6000, Philippines</p>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Email: <a href="mailto:archivio.admin@gmail.com" className="text-[#7a2039] dark:text-[#f3e5ab] font-bold underline">archivio.admin@gmail.com</a>
                  </p>
                </div>
              </section>

            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-8">
              
              <div className="border-b border-stone-200 dark:border-white/10 pb-6">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-emerald-900 dark:text-emerald-300">
                  Data Privacy Policy (Republic Act No. 10173 Compliance)
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  National Privacy Commission (NPC) Aligned &bull; Southwestern University PHINMA &bull; College of Information Technology
                </p>
              </div>

              {/* 1. Statutory Mandate */}
              <section>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">1</span>
                  Statutory Mandate &amp; Privacy Commitment
                </h3>
                <p>
                  Southwestern University PHINMA is committed to protecting the privacy and personal data of all users in accordance with <strong>Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012</strong>. We process personal data solely for legitimate educational, research archiving, and account authorization functions.
                </p>
              </section>

              {/* 2. Data Collected */}
              <section>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">2</span>
                  Categories of Data Processed
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                    <strong className="block text-stone-900 dark:text-stone-100 text-sm mb-1">User Account Credentials</strong>
                    <ul className="text-xs text-stone-600 dark:text-stone-400 list-disc pl-4 space-y-1">
                      <li>Full name and profile display name</li>
                      <li>Institutional email address (<code>@phinmaed.com</code>)</li>
                      <li>Encrypted authentication credentials</li>
                      <li>Department and degree program affiliation</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                    <strong className="block text-stone-900 dark:text-stone-100 text-sm mb-1">Scholarly Interaction Data</strong>
                    <ul className="text-xs text-stone-600 dark:text-stone-400 list-disc pl-4 space-y-1">
                      <li>Personal saved reading lists and bookmarks</li>
                      <li>Search queries and browse filter preferences</li>
                      <li>Certificate verification lookup logs</li>
                      <li>Aggregate document view metrics</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Purpose */}
              <section>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">3</span>
                  Purpose of Data Processing
                </h3>
                <p>
                  Personal data collected through ARCHIVIO is used exclusively to:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-300">
                  <li>Authenticate registered student and faculty researchers;</li>
                  <li>Provide personalized bookmarks, reading lists, and certificate validations;</li>
                  <li>Generate aggregate academic research metrics for institutional accreditation;</li>
                  <li>Maintain tamper-evident audit logs and defend against unauthorized automated scraping.</li>
                </ul>
                <p className="mt-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  ARCHIVIO never sells, rents, monetizes, or shares user information with commercial advertising entities.
                </p>
              </section>

              {/* 4. Security */}
              <section>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">4</span>
                  Security Infrastructure &amp; Technical Safeguards
                </h3>
                <p>
                  Data is housed securely on Google Firebase / Google Cloud platform utilizing AES-256 encryption at rest and TLS 1.3 transport encryption. Granular security rules enforce least-privilege role-based access control.
                </p>
              </section>

              {/* 5. Statutory Rights */}
              <section>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">5</span>
                  Your Statutory Rights under Republic Act No. 10173
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">1. Right to Be Informed</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">Know how, why, and to what extent your personal data is collected and processed.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">2. Right to Access</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">Obtain a copy of personal information maintained in your repository record.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">3. Right to Rectification</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">Dispute and correct inaccurate, outdated, or erroneous data.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">4. Right to Erasure / Blocking</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">Request deletion or blocking of personal data when no longer required for academic archiving.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">5. Right to Object</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">Object to processing of personal data where applicable under the Act.</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200/80 dark:border-white/10">
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs mb-0.5">6. Right to File a Complaint</strong>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">File a complaint with the National Privacy Commission (NPC) for violations of data privacy rights.</span>
                  </div>
                </div>
              </section>

              {/* 6. DPO Contact */}
              <section className="pt-4 border-t border-stone-200 dark:border-white/10">
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 inline-flex items-center justify-center text-xs font-sans font-bold">6</span>
                  Data Protection Officer (DPO) Contact
                </h3>
                <p>
                  To exercise your statutory rights or submit privacy inquiries, please contact:
                </p>
                <div className="mt-3 p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs">
                  <p className="font-bold text-emerald-950 dark:text-emerald-300 text-sm">Data Protection Officer &bull; College of Information Technology</p>
                  <p>Southwestern University PHINMA &bull; Cebu City, Philippines</p>
                  <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Official Inquiries: <a href="mailto:archivio.admin@gmail.com" className="text-emerald-800 dark:text-emerald-300 font-bold underline">archivio.admin@gmail.com</a>
                  </p>
                </div>
              </section>

            </div>
          )}

        </div>

      </div>

      <Footer />
    </div>
  );
}
