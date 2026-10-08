import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Destructive Action',
  description,
  confirmWord = '', // If provided, user must type this exact string (e.g. "DELETE")
  confirmButtonText = 'Confirm & Delete',
  severity = 'danger', // 'danger' | 'warning' | 'info'
  affectedItemsCount = 0,
  loading = false
}) {
  const [typedInput, setTypedInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedInput('');
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmWord 
    ? typedInput.trim().toUpperCase() === confirmWord.trim().toUpperCase()
    : true;

  const severityStyles = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />,
      badgeBg: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900',
      btn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm shadow-red-600/20'
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-sm shadow-amber-600/20'
    },
    info: {
      icon: <ShieldAlert className="w-6 h-6 text-[#801e38] dark:text-[#ff8ca3]" aria-hidden="true" />,
      badgeBg: 'bg-[#801e38]/10 border-[#801e38]/20',
      btn: 'bg-[#801e38] hover:bg-[#68182d] text-white focus:ring-[#801e38]'
    }
  }[severity] || {
    icon: <AlertCircle className="w-6 h-6 text-stone-600" aria-hidden="true" />,
    badgeBg: 'bg-stone-50 border-stone-200',
    btn: 'bg-[#801e38] text-white hover:bg-[#601328]'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${severityStyles.badgeBg}`}>
            {severityStyles.icon}
          </div>
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
              {title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={loading}
            aria-label="Close modal"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Impact Warning Banner (if multiple items affected) */}
        {affectedItemsCount > 1 && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>This action will affect <strong>{affectedItemsCount}</strong> selected records.</span>
          </div>
        )}

        {/* Typed Safeguard Input */}
        {confirmWord && (
          <div className="px-6 py-2">
            <label htmlFor="confirm-keyword-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Type <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400 select-all font-bold">{confirmWord}</span> to confirm:
            </label>
            <input
              id="confirm-keyword-input"
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type "${confirmWord}" to proceed`}
              disabled={loading}
              className="w-full px-3.5 py-2 bg-stone-50 dark:bg-[#252525] border border-stone-300 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-red-500 transition"
              autoFocus
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 pt-4 bg-stone-50/70 dark:bg-[#171717] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed || loading}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${severityStyles.btn}`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
