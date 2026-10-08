import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, Loader2, Send } from 'lucide-react';

/**
 * RevisionDirectiveModal
 * Implements #6 Error Prevention & #1 User-Centric Design by ensuring
 * that revision feedback from the Dean is clear, categorized, and actionable.
 */
export default function RevisionDirectiveModal({
  isOpen,
  item,
  onClose,
  onSubmitRevision
}) {
  const [category, setCategory] = useState('Formatting & APA Citations');
  const [comments, setComments] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync initial state when item opens
  React.useEffect(() => {
    if (item) {
      setComments(item.deanComments || '');
      setCategory(item.deanFeedback?.category || 'Formatting & APA Citations');
      setUrgency(item.deanFeedback?.urgency || 'normal');
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError('Please provide specific feedback directives for the adviser and student authors.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRevision({
        item,
        category,
        comments: comments.trim(),
        urgency
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send revision feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Formatting & APA Citations',
    'Executive Abstract & Keywords',
    'Methodology & Analysis Details',
    'Originality & Citation Incompleteness',
    'Document Clarity & Appendices'
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revision-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <RotateCcw className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 id="revision-modal-title" className="font-serif text-lg font-bold">Return for Revision</h2>
              <p className="text-xs text-white/80">Directive will be dispatched to Adviser</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
              {item.researchTitle || item.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Adviser: <strong className="text-stone-700 dark:text-stone-300">{item.adviserName}</strong> · Group: {item.groupName}
            </p>
          </div>

          {/* Feedback Category */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Primary Revision Focus Area
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                    category === cat
                      ? 'bg-amber-500/10 border-amber-500/80 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority / Urgency */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Priority Level
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  urgency === 'normal'
                    ? 'bg-stone-100 dark:bg-stone-800 border-stone-400 text-stone-800 dark:text-stone-100'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500'
                }`}
              >
                Normal Routine Revision
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  urgency === 'urgent'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500'
                }`}
              >
                🚨 Urgent Revision Required
              </button>
            </div>
          </div>

          {/* Specific Comments */}
          <div>
            <label htmlFor="dean-revision-comments" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Dean's Specific Directives & Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="dean-revision-comments"
              rows={4}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                if (error) setError('');
              }}
              placeholder="Specify the exact pages, sections, or documentation items requiring revision before final publication..."
              className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition"
            />
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Directive...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Revision Directive
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
