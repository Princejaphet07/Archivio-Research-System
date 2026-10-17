import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, FileText, Shield, ArrowRight } from 'lucide-react';

/**
 * mode:
 *  - 'terms'   → standalone Terms and Conditions modal
 *  - 'privacy' → standalone Data Privacy Act of 2012 modal
 *  - 'both'    → legacy two-tab modal (requires agreeing to both)
 */
export default function PrivacyPolicyModal({ isOpen, onClose, onAccept, initialTab = 'terms', mode = 'both' }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'terms');
  const isSingle = mode === 'terms' || mode === 'privacy';
  const currentTab = isSingle ? mode : activeTab;
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'terms');
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialTab, mode]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const handleAgreeTerms = () => {
    setTermsAgreed(true);
    switchTab('privacy');
  };

  const handleAgreePrivacy = () => {
    setPrivacyAgreed(true);
  };

  const handleCompleteBoth = () => {
    if (termsAgreed && privacyAgreed && onAccept) {
      onAccept();
      onClose();
    }
  };

  const handleAcceptSingle = () => {
    if (onAccept) onAccept(mode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-fade-in-up">
      <div className="bg-[#fcfaf5] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#c1b49a] max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#d2c9b6] bg-white/75 backdrop-blur-sm">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#7a1f3d] flex items-center gap-2">
                {currentTab === 'terms'
                  ? <><FileText className="w-5 h-5 shrink-0" /> Terms and Conditions</>
                  : <><Shield className="w-5 h-5 shrink-0" /> Privacy Policy</>}
              </h2>
              <p className="text-xs text-[#8c7a6b] font-medium mt-0.5">
                Archivio — Research Archiving System • Southwestern University PHINMA
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="text-[#8c7a6b] hover:text-[#7a1f3d] transition-colors focus:outline-none p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs with Status Badges (only in combined mode) */}
          {!isSingle && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={() => switchTab('terms')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                activeTab === 'terms'
                  ? 'bg-[#7a1f3d] text-white border-[#7a1f3d] shadow-sm'
                  : 'bg-stone-100 text-[#5c4a40] border-stone-200 hover:bg-stone-200'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Terms &amp; Conditions</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold ${
                termsAgreed 
                  ? activeTab === 'terms' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  : activeTab === 'terms' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {termsAgreed ? '✓ Agreed' : 'Required'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('privacy')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer border ${
                activeTab === 'privacy'
                  ? 'bg-[#7a1f3d] text-white border-[#7a1f3d] shadow-sm'
                  : 'bg-stone-100 text-[#5c4a40] border-stone-200 hover:bg-stone-200'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Data Privacy Policy</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold ${
                privacyAgreed 
                  ? activeTab === 'privacy' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  : activeTab === 'privacy' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {privacyAgreed ? '✓ Agreed' : 'Required'}
              </span>
            </button>
          </div>
          )}
        </div>

        {/* Content Body */}
        <div 
          ref={contentRef}
          className="p-5 sm:p-6 overflow-y-auto flex-1 prose prose-stone max-w-none text-sm text-[#5c4a40]"
        >
          
          {/* ============================================================ */}
          {/* TAB 1: TERMS AND CONDITIONS (FIRST) */}
          {/* ============================================================ */}
          {currentTab === 'terms' && (
            <div>
              <div className="mb-6 pb-4 border-b border-[#d2c9b6]/70">
                <h3 className="text-xl font-serif font-bold text-[#2d1b11] mt-0 mb-1">
                  TERMS AND CONDITIONS
                </h3>
                <p className="font-semibold text-[#8c7a6b] uppercase tracking-wider text-xs mb-1">
                  Archivio — Research Archiving System
                </p>
                <p className="text-xs text-[#8c7a6b]">
                  Effective Date: October 2026 | College of Information Technology • Southwestern University PHINMA
                </p>
              </div>

              {/* 1. Acceptance of Terms */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mt-0 mb-1.5">
                1. Acceptance of Terms
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                By creating an account and using Archivio, you agree to be bound by these Terms and Conditions. If you do not agree, you must stop using the system immediately.
              </p>

              {/* 2. Who Can Use Archivio */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                2. Who Can Use Archivio
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Access to Archivio is strictly limited to authorized users of the College of Information Technology of Southwestern University PHINMA. You may only create an account if you have received an official email invitation from an authorized role within the system. Authorized users include Students, Research Advisers, and Deans.
              </p>

              {/* 3. User Accounts */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                3. User Accounts
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                You are responsible for keeping your account credentials confidential and must not share them with anyone else. You must use your official SWU-PHINMA institutional email address to register, and any activity performed under your account is your sole responsibility. If you suspect unauthorized access to your account, report it to the System Administrator immediately.
              </p>

              {/* 4. Acceptable Use */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                4. Acceptable Use
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                When using Archivio, you agree to use the system only for its intended academic purpose, submit only authentic and original research work, provide accurate and truthful information in your account and submissions, respect the intellectual property rights of other researchers, and follow the academic policies and guidelines of SWU-PHINMA.
              </p>

              {/* 5. Prohibited Activities */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                5. Prohibited Activities
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                The following are strictly prohibited within Archivio:
              </p>
              <ul className="list-disc pl-5 mb-2 space-y-1 text-xs sm:text-sm leading-relaxed">
                <li>submitting plagiarized, falsified, or fraudulent research;</li>
                <li>attempting to access accounts, data, or files you are not authorized to view;</li>
                <li>sharing, distributing, or reproducing published research without proper authorization;</li>
                <li>using the system for any purpose unrelated to academic research archiving;</li>
                <li>attempting to disrupt, hack, or compromise the system or its data; and</li>
                <li>impersonating another user or misrepresenting your identity or role.</li>
              </ul>
              <p className="mb-4 text-xs font-semibold text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
                ⚠️ Violation of any of the above may result in suspension or permanent removal of your account.
              </p>

              {/* 6. Role-Specific Responsibilities */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                6. Role-Specific Responsibilities
              </h4>
              <div className="space-y-3 mb-4 text-xs sm:text-sm leading-relaxed">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
                  <strong className="text-[#7a1f3d] block mb-1">👩‍🎓 Students:</strong>
                  Students are expected to submit only complete and accurate research manuscripts and required documents, respond to adviser feedback and resubmit revised work promptly, track the status of their submission through the student portal, and ensure all group members are properly registered before submission.
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
                  <strong className="text-[#7a1f3d] block mb-1">👨‍🏫 Research Advisers:</strong>
                  Research Advisers are expected to review and evaluate student submissions with fairness and academic integrity, provide clear and constructive feedback when returning submissions for revision, endorse only research that meets the required academic standards, and manage student group invitations responsibly.
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
                  <strong className="text-[#7a1f3d] block mb-1">🏛️ Deans:</strong>
                  Deans are expected to use the dashboard and reporting features solely for academic monitoring and oversight, publish only research that has been properly reviewed and endorsed by the adviser, and manage Research Adviser accounts within their department responsibly.
                </div>
              </div>

              {/* 7. Intellectual Property */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                7. Intellectual Property
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                All research manuscripts submitted to Archivio remain the intellectual property of the respective authors. By submitting research through the system, you grant the College of Information Technology of SWU-PHINMA a non-exclusive right to archive, display, and make the research accessible to authorized users within the system for academic purposes.
              </p>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Published research may be viewed by authorized SWU community members but may not be reproduced, distributed, or used commercially without the explicit consent of the author.
              </p>

              {/* 8. Privacy */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                8. Privacy
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                The collection and processing of your personal information is governed by the Archivio Privacy Policy, which is incorporated into these Terms and Conditions by reference. By agreeing to these Terms, you also acknowledge and accept the Privacy Policy.
              </p>

              {/* 9. System Availability */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                9. System Availability
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Archivio is provided on an as-available basis. While we aim to maintain consistent access, the system may occasionally be unavailable due to maintenance, updates, or technical issues. We are not liable for any inconvenience or loss caused by temporary system downtime.
              </p>

              {/* 10. Limitation of Liability */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                10. Limitation of Liability
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                The College of Information Technology of SWU-PHINMA shall not be held liable for:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1 text-xs sm:text-sm leading-relaxed">
                <li>Any loss or damage resulting from unauthorized access to your account due to your failure to keep your credentials secure</li>
                <li>Any inaccuracies in research content submitted by users</li>
                <li>Any interruption or unavailability of the system beyond our reasonable control</li>
              </ul>

              {/* 11. Suspension and Termination */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                11. Suspension and Termination
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                We reserve the right to suspend or terminate any user account that:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1 text-xs sm:text-sm leading-relaxed">
                <li>Violates these Terms and Conditions</li>
                <li>Engages in prohibited activities within the system</li>
                <li>Provides false information during registration or submission</li>
                <li>Is no longer an active member of the College of Information Technology of SWU-PHINMA</li>
              </ul>

              {/* 12. Changes to These Terms */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                12. Changes to These Terms
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                These Terms and Conditions may be updated from time to time. Users will be notified of any significant changes through the system. Continued use of Archivio after any update constitutes acceptance of the revised terms.
              </p>

              {/* 13. Contact */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                13. Contact
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                For any questions or concerns regarding these Terms and Conditions, please contact:
              </p>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 text-xs sm:text-sm leading-relaxed mb-6">
                <p className="font-bold text-[#2d1b11]">System Administrator</p>
                <p>College of Information Technology</p>
                <p>Southwestern University PHINMA</p>
                <p>Cebu City, Philippines</p>
                <p className="mt-1.5 pt-1.5 border-t border-stone-200/60 font-medium text-stone-700">
                  <strong className="text-[#670319]">Contact Email:</strong>{' '}
                  <a href="mailto:archivio.admin@gmail.com" className="text-[#670319] underline hover:text-[#520214] font-semibold">
                    archivio.admin@gmail.com
                  </a>
                </p>
              </div>

              {/* Agreement Action for Tab 1 */}
              {!isSingle && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <p className="font-bold mb-0.5">Step 1 of 2: Terms &amp; Conditions</p>
                  <p className="text-[11px] text-amber-800">
                    {termsAgreed ? '✅ You have agreed to the Terms & Conditions.' : 'Click below to accept and continue to the Data Privacy Policy.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAgreeTerms}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                    termsAgreed
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-[#7a1f3d] hover:bg-[#5c172e] text-white'
                  }`}
                >
                  <span>{termsAgreed ? '✓ Terms Agreed — View Privacy Policy' : 'I Agree to Terms & Proceed to Privacy Policy'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: DATA PRIVACY POLICY (EXACT USER SPECIFICATION) */}
          {/* ============================================================ */}
          {currentTab === 'privacy' && (
            <div>
              <div className="mb-6 pb-4 border-b border-[#d2c9b6]/70">
                <h3 className="text-xl font-serif font-bold text-[#2d1b11] mt-0 mb-1">
                  DATA PRIVACY POLICY
                </h3>
                <p className="font-semibold text-[#8c7a6b] uppercase tracking-wider text-xs mb-1">
                  Archivio — Research Archiving System
                </p>
                <p className="text-xs text-[#8c7a6b]">
                  College of Information Technology | Southwestern University PHINMA
                </p>
                <p className="text-xs text-[#7a1f3d] font-semibold mt-1">
                  In compliance with Republic Act No. 10173 — Data Privacy Act of 2012
                </p>
              </div>

              {/* What We Collect */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mt-0 mb-1.5">
                What We Collect
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                When you create an account in Archivio, we collect the following information:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1 text-xs sm:text-sm leading-relaxed">
                <li>Full name and institutional email address</li>
                <li>Course, year level, and department</li>
                <li>Research group details and membership</li>
                <li>Submitted manuscript files and required documents</li>
                <li>Submission activity and logs within the system</li>
              </ul>

              {/* Why We Collect It */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                Why We Collect It
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Your information is collected solely to support the academic functions of the system. This includes verifying your identity, granting you access based on your assigned role, processing research submissions and approvals, and making published research accessible to authorized users. We do not collect information beyond what is necessary to operate Archivio.
              </p>

              {/* How We Protect It */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                How We Protect It
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Your data is stored securely through Google Firebase services. Access to your information is restricted based on your role, and all passwords are encrypted through Firebase Authentication. Data transmission within the system is protected through secure HTTPS connections, and file access is controlled to prevent unauthorized viewing.
              </p>

              {/* Who Can Access It */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                Who Can Access It
              </h4>
              <p className="mb-4 text-xs sm:text-sm leading-relaxed">
                Only authorized roles within the system can access your information. The System Admin handles account and system management. The Dean oversees departmental research records. Research Advisers monitor the progress and submissions of their assigned student groups. Students can only view their own records and published research within the system. Your information will not be shared with any unauthorized party.
              </p>

              {/* Your Rights */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                Your Rights
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                Under the Data Privacy Act of 2012, you have the right to:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1.5 text-xs sm:text-sm leading-relaxed">
                <li><strong>Be informed</strong> — know what data we collect and why</li>
                <li><strong>Access</strong> — request a copy of your personal data</li>
                <li><strong>Correct</strong> — request correction of inaccurate information</li>
                <li><strong>Erase</strong> — request deletion of your data when no longer needed</li>
                <li><strong>Object</strong> — object to certain types of data processing</li>
                <li><strong>File a complaint</strong> — raise concerns with the National Privacy Commission</li>
              </ul>

              {/* Contact */}
              <h4 className="text-base font-serif font-bold text-[#2d1b11] mb-1.5">
                Contact
              </h4>
              <p className="mb-2 text-xs sm:text-sm leading-relaxed">
                For any privacy-related concerns, please contact:
              </p>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 text-xs sm:text-sm leading-relaxed mb-6">
                <p className="font-bold text-[#2d1b11]">Data Privacy Officer</p>
                <p>College of Information Technology</p>
                <p>Southwestern University PHINMA</p>
                <p>Cebu City, Philippines</p>
                <p className="mt-1.5 pt-1.5 border-t border-stone-200/60 font-medium text-stone-700">
                  <strong className="text-[#670319]">Contact Email:</strong>{' '}
                  <a href="mailto:archivio.admin@gmail.com" className="text-[#670319] underline hover:text-[#520214] font-semibold">
                    archivio.admin@gmail.com
                  </a>
                </p>
              </div>

              {/* Agreement Action for Tab 2 */}
              {!isSingle && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-emerald-950">
                  <p className="font-bold mb-0.5">Step 2 of 2: Data Privacy Policy</p>
                  <p className="text-[11px] text-emerald-800">
                    {privacyAgreed ? '✅ You have agreed to the Data Privacy Policy.' : 'Click below to accept the Data Privacy Policy.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAgreePrivacy}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                    privacyAgreed
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-[#7a1f3d] hover:bg-[#5c172e] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{privacyAgreed ? 'Data Privacy Policy Agreed ✓' : 'I Agree to Data Privacy Policy'}</span>
                </button>
              </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#d2c9b6] bg-white/85 flex flex-col sm:flex-row items-center justify-between gap-3">
          {isSingle && onAccept ? (
            <div className="flex items-center gap-2.5 w-full justify-end">
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl border border-[#d2c9b6] text-[#5c4a40] font-bold text-xs sm:text-sm hover:bg-[#f4eee1] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button"
                onClick={handleAcceptSingle} 
                className="px-5 py-2.5 rounded-xl font-bold transition-all shadow-md text-xs sm:text-sm flex items-center gap-1.5 bg-[#7a1f3d] text-white hover:bg-[#5c172e] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{mode === 'terms' ? 'I Agree to the Terms and Conditions' : 'I Agree to the Privacy Policy'}</span>
              </button>
            </div>
          ) : onAccept && !isSingle ? (
            <>
              {/* Dual Agreement Status Badges */}
              <div className="flex items-center gap-2 text-xs flex-wrap w-full sm:w-auto">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  termsAgreed 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {termsAgreed ? '✓' : '⏳'} 1. Terms: {termsAgreed ? 'Agreed' : 'Pending'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  privacyAgreed 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {privacyAgreed ? '✓' : '⏳'} 2. Privacy: {privacyAgreed ? 'Agreed' : 'Pending'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button 
                  type="button"
                  onClick={onClose} 
                  className="px-4 py-2 rounded-xl border border-[#d2c9b6] text-[#5c4a40] font-bold text-xs hover:bg-[#f4eee1] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button 
                  type="button"
                  disabled={!termsAgreed || !privacyAgreed}
                  onClick={handleCompleteBoth} 
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-md text-xs sm:text-sm flex items-center gap-1.5 ${
                    termsAgreed && privacyAgreed
                      ? 'bg-[#7a1f3d] text-white hover:bg-[#5c172e] cursor-pointer shadow-lg'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60 shadow-none border border-stone-300'
                  }`}
                  title={!termsAgreed || !privacyAgreed ? "You must read and agree to BOTH Terms & Conditions and Data Privacy Policy" : "Confirm agreement to both"}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {termsAgreed && privacyAgreed 
                      ? 'Confirm & Agree to Both ✓' 
                      : 'Agree to Both to Proceed'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <button 
              type="button"
              onClick={onClose} 
              className="bg-[#7a1f3d] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5c172e] transition-colors shadow-md text-sm ml-auto cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
