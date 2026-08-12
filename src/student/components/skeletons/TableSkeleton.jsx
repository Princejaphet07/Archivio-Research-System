import React from 'react';

/**
 * Shimmer overlay — creates a premium sweeping light effect over skeleton blocks.
 */
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
      <Shimmer />

      {/* Header row */}
      <div className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700 px-5 py-3.5 flex gap-6">
        {[80, 120, 72, 56, 64, 48].map((w, i) => (
          <div key={i} className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Body rows */}
      <div className="divide-y divide-stone-100 dark:divide-stone-700/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-5" style={{ opacity: 1 - i * 0.12 }}>
            {/* Avatar */}
            <div className="h-9 w-9 bg-stone-200 dark:bg-stone-700 rounded-full shrink-0" />

            {/* Name col */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-3.5 bg-stone-200 dark:bg-stone-700 rounded-full w-3/5" />
              <div className="h-2.5 bg-stone-100 dark:bg-stone-700/50 rounded-full w-2/5" />
            </div>

            {/* Email col */}
            <div className="hidden sm:block flex-1">
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-4/5" />
            </div>

            {/* Badge col */}
            <div className="w-20">
              <div className="h-5 bg-stone-200 dark:bg-stone-700 rounded-full w-16" />
            </div>

            {/* Status col */}
            <div className="w-16">
              <div className="h-4 bg-stone-100 dark:bg-stone-700/40 rounded-full w-14" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <div className="h-7 w-16 bg-stone-100 dark:bg-stone-700/40 rounded-lg" />
              <div className="h-7 w-20 bg-stone-200 dark:bg-stone-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
