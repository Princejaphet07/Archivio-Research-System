import React, { useState } from 'react';
import { Globe, CheckCircle2, ShieldCheck, AlertCircle, X, Loader2, Award, UserCheck } from 'lucide-react';

/**
 * PublishConfirmationModal
 * Implements #6 Error Prevention & #7 Affordance with a pre-flight clearance checklist.
 */
export default function PublishConfirmationModal({ 
  isOpen, 
  item, 
  onClose, 
  onConfirmPublish 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmPublish(item);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = item.researchTitle || item.title || 'Untitled Manuscript';
  const authorDisplay = item.authorDisplay || item.leaderName || 'Research Authors';
  const adviserName = item.adviserName || 'Assigned Adviser';
  const program = item.program || 'Department Research';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with Academic Gradient */}
        <div className="bg-gradient-to-r from-[#590000] to-[#770000] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Globe className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="publish-modal-title" className="font-serif text-lg font-bold">Publish to Public Archive</h2>
              <p className="text-xs text-white/80">Permanent Global Research Indexing</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#590000]/10 text-[#590000] dark:text-[#f8d070] mb-1.5">
              {program}
            </span>
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              By <strong className="text-stone-700 dark:text-stone-300">{authorDisplay}</strong> · Endorsed by <strong className="text-stone-700 dark:text-stone-300">{adviserName}</strong>
            </p>
          </div>

          {/* Pre-Flight Checklist */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 space-y-2.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-stone-500 dark:text-stone-400 block mb-1">
              Pre-Flight Clearance Verification
            </span>
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Institutional Requirements 100% Completed</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Adviser Formal Endorsement Cleared</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Originality Verification Verified</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <Award className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Digital Certificate of Archiving will be generated</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-300 p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-800/40">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Upon publication, the paper becomes accessible to the public and student authors are notified. <strong>You will have 15 seconds to Undo if clicked by mistake.</strong>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing to Archive...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-amber-300" />
                Confirm & Publish Paper
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
