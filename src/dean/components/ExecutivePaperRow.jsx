import React, { useState } from 'react';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Eye,
  Users,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

/**
 * ExecutivePaperRow
 * Implements #1 User-Centric Design, #3 Simplicity, and #7 Affordance.
 * Progressive disclosure row for evaluating endorsed research manuscripts.
 */
export default function ExecutivePaperRow({ 
  item, 
  onPublish, 
  onRequestRevision, 
  onViewPdf,
  onCheckSimilarity 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const title = item.researchTitle || item.title || 'Untitled Manuscript';
  const authorDisplay = item.authorDisplay || item.leaderName || 'Research Authors';
  const adviserName = item.adviserName || 'Unknown Adviser';
  const program = item.program || 'BSIT';
  const completionPercent = item.completionPercent || 100;

  return (
    <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-700 shadow-xs hover:shadow-sm overflow-hidden mb-3">
      {/* Primary Row Header (Level 1 Progressive Disclosure) */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#590000]/10 text-[#590000] dark:text-[#f8d070]">
              {program}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Endorsed by Adviser
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {completionPercent}% Reqs Complete
            </span>
          </div>

          <h3 
            onClick={() => onViewPdf(item)}
            className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 hover:text-[#590000] dark:hover:text-[#f8d070] cursor-pointer transition-colors leading-snug"
            title="Click to preview manuscript"
          >
            {title}
          </h3>

          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Group: <strong className="text-stone-700 dark:text-stone-300">{item.groupName}</strong></span>
            <span>•</span>
            <span>Authors: <strong className="text-stone-700 dark:text-stone-300">{authorDisplay}</strong></span>
            <span>•</span>
            <span>Adviser: <strong className="text-stone-700 dark:text-stone-300">{adviserName}{item.isSelf ? ' (You)' : ''}</strong></span>
          </p>
        </div>

        {/* Action Controls (#7 Affordance) */}
        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => onViewPdf(item)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            title="Inspect manuscript PDF document"
          >
            <Eye className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">View PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestRevision(item)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 transition-colors cursor-pointer"
            title="Return to adviser for revision"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Request Revision</span>
          </button>

          <button
            type="button"
            onClick={() => onPublish(item)}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#770000] hover:bg-[#590000] active:scale-95 shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Publish manuscript to live archive"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Publish</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse paper details" : "Expand paper details"}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="Toggle abstract and details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progressive Disclosure Panel (Level 2 Details) */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Executive Abstract Preview */}
            <div className="md:col-span-2 space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                Executive Abstract
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed text-justify line-clamp-4">
                {item.abstract || 'No abstract text entered in the submission metadata. You can view the full abstract in the uploaded manuscript PDF.'}
              </p>
            </div>

            {/* Adviser Endorsement Notes */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/70 space-y-2 shadow-xs">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Adviser Sign-off
              </span>
              <p className="text-xs italic text-stone-600 dark:text-stone-300 leading-snug">
                "{item.adviserNotes || 'Cleared after defense panel revisions. Endorsed for institutional archiving.'}"
              </p>
              <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800 font-mono">
                Adviser: {adviserName}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200/70 dark:border-stone-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                Team: <strong className="text-stone-700 dark:text-stone-300">{item.groupName}</strong>
              </span>
              {item.leaderEmail && (
                <span className="hidden sm:inline text-stone-400">({item.leaderEmail})</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onCheckSimilarity(item)}
              className="text-[#590000] dark:text-[#f8d070] hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Run AI Similarity Scan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
