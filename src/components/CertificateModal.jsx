import React, { useRef } from 'react';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';

export default function CertificateModal({ isOpen, onClose, submission, groupData, studentData }) {
  const certificateRef = useRef(null);

  if (!isOpen || !submission) return null;

  // Compute clean values with reliable fallbacks
  const title = submission?.researchTitle || submission?.title || groupData?.researchTitle || studentData?.researchTitle || 'Undergraduate Research Manuscript';
  
  // Resolve authors list
  let authors = [];
  if (groupData?.leaderName) {
    authors.push(groupData.leaderName);
    if (Array.isArray(groupData.members)) {
      groupData.members.forEach(m => {
        const name = typeof m === 'object' ? m?.name : (typeof m === 'string' ? (m.includes('@') ? m.split('@')[0] : m) : '');
        if (name && !authors.includes(name)) authors.push(name);
      });
    }
  } else if (studentData?.displayName) {
    authors.push(studentData.displayName);
    if (Array.isArray(studentData?.groupMembers)) {
      studentData.groupMembers.forEach(m => {
        const name = typeof m === 'object' ? m?.name : (typeof m === 'string' ? (m.includes('@') ? m.split('@')[0] : m) : '');
        if (name && !authors.includes(name)) authors.push(name);
      });
    }
  } else if (submission?.groupName) {
    authors = [submission.groupName];
  } else {
    authors = ['Research Proponents'];
  }
  const authorsString = authors.join(', ');

  const program = submission?.program || groupData?.program || studentData?.course || 'Bachelor of Science in Information Technology';
  const department = submission?.department || groupData?.department || studentData?.department || 'College of Information Technology and Engineering';
  const adviserName = submission?.adviserName || groupData?.adviserName || studentData?.invitedByName || 'Research Adviser';
  const deanName = submission?.deanFeedback?.deanName || submission?.deanName || 'Office of the Dean';

  const rawDate = submission?.publishedAt || submission?.deanApprovedAt || submission?.updatedAt || submission?.createdAt;
  const archivalDate = rawDate 
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const refCode = submission?.id ? `ARCH-SWU-${submission.id.substring(0, 8).toUpperCase()}` : 'ARCH-SWU-2026-RECORD';
  
  // Public verification URL
  const publicVerifyUrl = `https://archivio-public.web.app/verify/${submission.id || ''}`;
  const localVerifyUrl = `/verify/${submission.id || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicVerifyUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicVerifyUrl);
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title: 'Verification link copied!',
      showConfirmButton: false,
      timer: 2000
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      
      {/* MODAL WRAPPER */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden my-auto border border-stone-200 dark:border-stone-800 flex flex-col max-h-[96vh]">
        
        {/* MODAL ACTION BAR (Hidden on Print) */}
        <div className="no-print bg-[#7B1F35] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-serif font-bold text-base leading-tight">Official Certificate of Digital Archival</h3>
              <p className="text-white/75 text-xs">Southwestern University PHINMA • Institutional Repository</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Copy Public Verification Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Link</span>
            </button>

            <a
              href={localVerifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Test verification page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Verify Online</span>
            </a>

            <button
              onClick={handlePrint}
              className="bg-[#c9a227] hover:bg-[#b08d1e] text-[#1A1A1A] text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl font-bold px-2 py-1 transition cursor-pointer ml-1"
              title="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SCROLLABLE CERTIFICATE PREVIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-100 dark:bg-stone-950 flex justify-center items-start">
          
          {/* THE PRINTABLE CERTIFICATE */}
          <div 
            ref={certificateRef}
            className="printable-certificate w-full max-w-[840px] bg-[#FAF8F5] text-[#1A1A1A] p-6 sm:p-10 pb-8 sm:pb-12 rounded-xl shadow-lg border-[8px] border-[#7B1F35] relative font-serif my-auto"
          >
            {/* INNER ACCENT BORDER */}
            <div className="absolute inset-2 sm:inset-3 border-2 border-[#c9a227] pointer-events-none rounded-sm" />

            {/* WATERMARK EMBLEM IN BACKGROUND */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
              <img src={logo} alt="Watermark" className="w-[420px] h-[420px] object-contain" />
            </div>

            {/* CERTIFICATE HEADER */}
            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                <img src={logo} alt="University Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-sm" />
                <div className="text-center">
                  <h1 className="text-[14px] sm:text-[18px] font-bold tracking-wider text-[#7B1F35] uppercase font-serif">
                    Southwestern University PHINMA
                  </h1>
                  <p className="text-[11px] sm:text-[12px] font-sans font-semibold tracking-wide text-stone-700 uppercase">
                    {department}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-sans font-medium text-[#c9a227] tracking-widest uppercase">
                    ARCHIVIO Institutional Digital Repository
                  </p>
                </div>
              </div>

              {/* ORNATE DIVIDER */}
              <div className="w-full max-w-md flex items-center justify-center gap-3 my-3">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#c9a227] to-[#c9a227]" />
                <span className="text-xs text-[#c9a227]">❖</span>
                <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-[#c9a227] to-[#c9a227]" />
              </div>

              {/* CERTIFICATE TITLE */}
              <h2 className="text-[19px] sm:text-[24px] font-extrabold tracking-wider text-[#7B1F35] uppercase font-serif mt-1">
                Certificate of Digital Archival
              </h2>
              <p className="text-[10px] sm:text-[11px] font-sans font-semibold tracking-widest uppercase text-stone-500 mb-4">
                Official Institutional Repository Acceptance Record
              </p>

              {/* BODY STATEMENT */}
              <p className="text-[12px] sm:text-[13px] text-stone-600 font-sans italic max-w-xl mb-2">
                This is to officially certify that the undergraduate capstone and thesis manuscript entitled:
              </p>

              {/* RESEARCH TITLE */}
              <div className="my-2 px-4 py-2.5 max-w-2xl bg-white/60 border-y border-[#c9a227]/40 rounded">
                <h3 className="text-[14px] sm:text-[17px] font-bold text-[#7B1F35] font-serif leading-snug">
                  "{title}"
                </h3>
              </div>

              {/* AUTHORS */}
              <div className="my-2">
                <p className="text-[11px] font-sans text-stone-500 uppercase tracking-wider mb-0.5">Authored and successfully submitted by:</p>
                <p className="text-[13px] sm:text-[15px] font-bold text-[#1A1A1A] font-serif tracking-wide">
                  {authorsString}
                </p>
                <p className="text-[11px] font-sans text-stone-600 font-medium mt-0.5">
                  Degree Program: <span className="font-semibold text-stone-800">{program}</span>
                </p>
              </div>

              <p className="text-[11px] sm:text-[12px] text-stone-600 font-sans leading-relaxed max-w-2xl my-2.5 px-4 text-justify sm:text-center">
                Having successfully satisfied all academic defense requirements, manuscript revisions, and institutional repository formatting guidelines, is hereby officially validated, indexed, and permanently archived in the <strong>ARCHIVIO</strong> digital repository with open academic access.
              </p>
            </div>

            {/* LOWER SECTION: SIGNATURES & QR VERIFICATION */}
            <div className="relative z-10 mt-5 pt-3 border-t border-[#c9a227]/50 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center">
              
              {/* ADVISER SIGNATURE */}
              <div className="text-center flex flex-col items-center">
                <div className="w-36 border-b-2 border-stone-800 mb-1 pt-2">
                  <span className="text-[11px] font-bold font-sans text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 inline-block mb-1">
                    ✓ DIGITALLY ENDORSED
                  </span>
                </div>
                <h4 className="text-[12px] sm:text-[13px] font-bold text-stone-900 font-serif leading-tight">
                  {adviserName}
                </h4>
                <p className="text-[10px] font-sans text-stone-600 font-medium">Research Adviser</p>
                <p className="text-[9px] font-sans text-stone-400">Date: {archivalDate}</p>
              </div>

              {/* CENTER: VERIFICATION QR & SEAL */}
              <div className="flex flex-col items-center justify-center text-center order-last sm:order-none">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-stone-300 inline-block mb-1.5">
                  <img 
                    src={qrUrl} 
                    alt="Verification QR Code" 
                    className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
                  />
                </div>
                <p className="text-[9px] font-sans font-bold text-stone-700 tracking-wider uppercase mb-0.5">
                  Scan to Verify Online
                </p>
                <div className="bg-[#7B1F35]/10 text-[#7B1F35] font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                  {refCode}
                </div>
              </div>

              {/* DEAN SIGNATURE */}
              <div className="text-center flex flex-col items-center">
                <div className="w-36 border-b-2 border-stone-800 mb-1 pt-2">
                  <span className="text-[11px] font-bold font-sans text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 inline-block mb-1">
                    ✓ APPROVED & ARCHIVED
                  </span>
                </div>
                <h4 className="text-[12px] sm:text-[13px] font-bold text-stone-900 font-serif leading-tight">
                  {deanName}
                </h4>
                <p className="text-[10px] font-sans text-stone-600 font-medium">Dean of Academic Studies</p>
                <p className="text-[9px] font-sans text-stone-400">Date: {archivalDate}</p>
              </div>

            </div>

            {/* CERTIFICATE FOOTER METADATA */}
            <div className="relative z-10 mt-5 pt-3 border-t border-stone-200 text-center flex flex-wrap items-center justify-between gap-2 text-[9px] font-sans text-stone-500">
              <span>Security Stamp: SHA-256 Verified Institutional Record</span>
              <span>Repository: archivio-public.web.app</span>
              <span>Archival Status: Permanent Open Access</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
