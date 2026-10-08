import React, { useState, useEffect, useRef } from 'react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

/**
 * Shared agreement checkbox used by every role's signup / activation page.
 *
 * "I agree to the Terms and Conditions of Archivio and Data Privacy Act of 2012."
 * Each link opens its OWN modal. The checkbox unlocks only after BOTH have been agreed to.
 *
 * Props:
 *  - id        : checkbox id (used for scroll-to-error)
 *  - checked   : boolean — the page's agreeTerms value
 *  - onChange  : (bool) => void — called with true once both are agreed, or when toggled
 *  - error     : string — validation error message
 *  - disabled  : boolean
 *  - initiallyAccepted : boolean — restore "both agreed" state if the component remounts
 */
export default function PolicyAgreement({ id = 'agreeTerms', checked, onChange, error, disabled = false, initiallyAccepted = false }) {
  const [termsAccepted, setTermsAccepted] = useState(initiallyAccepted);
  const [privacyAccepted, setPrivacyAccepted] = useState(initiallyAccepted);
  const [openModal, setOpenModal] = useState(null); // 'terms' | 'privacy' | null

  const bothAccepted = termsAccepted && privacyAccepted;

  // Auto-check once both documents are agreed to (only on the transition, not on remount)
  const wasBothAccepted = useRef(bothAccepted);
  useEffect(() => {
    if (bothAccepted && !wasBothAccepted.current) onChange?.(true);
    wasBothAccepted.current = bothAccepted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothAccepted]);

  const openNextPending = () => {
    if (!termsAccepted) setOpenModal('terms');
    else if (!privacyAccepted) setOpenModal('privacy');
  };

  const openLink = (e, which) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenModal(which);
  };

  const pending = [
    !termsAccepted && 'Terms and Conditions',
    !privacyAccepted && 'Data Privacy Act of 2012',
  ].filter(Boolean);

  const linkClass = (accepted) =>
    `font-bold cursor-pointer underline underline-offset-2 decoration-1 hover:decoration-2 transition-colors ${
      accepted ? 'text-emerald-700' : 'text-[#6B0F1A] hover:text-[#4a0a12]'
    }`;

  return (
    <>
      <div
        onClick={(e) => {
          if (!bothAccepted) {
            e.preventDefault();
            openNextPending();
          }
        }}
        className={`flex items-start gap-2.5 p-3.5 rounded-xl border transition-all ${
          error
            ? 'bg-red-50 border-red-300'
            : bothAccepted
              ? 'bg-emerald-50/60 border-emerald-200'
              : 'cursor-pointer bg-amber-50/60 hover:bg-amber-100/60 border-amber-200'
        }`}
      >
        <input
          type="checkbox"
          id={id}
          checked={!!checked && bothAccepted}
          disabled={!bothAccepted || disabled}
          onChange={(e) => {
            if (!bothAccepted) {
              openNextPending();
              return;
            }
            onChange?.(e.target.checked);
          }}
          className={`w-4 h-4 mt-0.5 shrink-0 accent-[#6B0F1A] rounded ${
            !bothAccepted ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={id}
            className={`text-xs sm:text-sm leading-relaxed ${bothAccepted ? 'text-gray-800 font-medium' : 'text-gray-600 cursor-pointer'}`}
          >
            I agree to the{' '}
            <span role="button" tabIndex={0} onClick={(e) => openLink(e, 'terms')} className={linkClass(termsAccepted)}>
              Terms and Conditions{termsAccepted && ' ✓'}
            </span>{' '}
            of Archivio and{' '}
            <span role="button" tabIndex={0} onClick={(e) => openLink(e, 'privacy')} className={linkClass(privacyAccepted)}>
              Data Privacy Act of 2012{privacyAccepted && ' ✓'}
            </span>
            .
          </label>

          {bothAccepted ? (
            <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <span>✓</span> Terms and Conditions and Data Privacy Act of 2012 read and agreed
            </p>
          ) : (
            <p className="text-xs text-amber-800 font-semibold mt-1">
              ⚠️ Please read and agree to the {pending.join(' and ')} before continuing
            </p>
          )}

          {error && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>
      </div>

      {/* Terms and Conditions — its own modal */}
      <PrivacyPolicyModal
        mode="terms"
        isOpen={openModal === 'terms'}
        onClose={() => setOpenModal(null)}
        onAccept={() => setTermsAccepted(true)}
      />

      {/* Data Privacy Act of 2012 — its own modal */}
      <PrivacyPolicyModal
        mode="privacy"
        isOpen={openModal === 'privacy'}
        onClose={() => setOpenModal(null)}
        onAccept={() => setPrivacyAccepted(true)}
      />
    </>
  );
}
