import React, { useEffect, useState } from 'react';
import { Undo2, X, CheckCircle2 } from 'lucide-react';

/**
 * UndoPublishBanner
 * Implements #5 Feedback & #6 Error Prevention (15-second Grace Period).
 * Allows the Dean to undo an accidental publication to the Public Archive.
 */
export default function UndoPublishBanner({ 
  publishedItem, 
  onUndo, 
  onDismiss, 
  duration = 15 
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(duration);

  useEffect(() => {
    if (!publishedItem) return;

    setSecondsRemaining(duration);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [publishedItem, duration, onDismiss]);

  if (!publishedItem) return null;

  const percentProgress = ((duration - secondsRemaining) / duration) * 100;

  return (
    <aside 
      aria-label="Publication confirmation and undo option"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-stone-900/95 dark:bg-stone-950/95 backdrop-blur-md border border-stone-700 shadow-2xl text-white p-4">
        {/* Visual Progress Bar (#5 Feedback) */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#B8860B] to-[#7B1F35] transition-all duration-1000 ease-linear"
          style={{ width: `${percentProgress}%` }}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-100 truncate">
                Published to Public Archive!
              </p>
              <p className="text-xs text-stone-400 truncate">
                "{publishedItem.researchTitle || publishedItem.title || 'Research Manuscript'}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onUndo(publishedItem)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-xs font-bold text-amber-300 border border-amber-400/40 transition-all cursor-pointer shadow-sm hover:shadow"
              title="Click to revert publication immediately"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo ({secondsRemaining}s)
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss undo banner"
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
