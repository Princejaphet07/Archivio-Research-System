import React from 'react';

/**
 * Shimmer overlay — creates a premium sweeping light effect over skeleton blocks.
 */
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

const ListSkeleton = ({ items = 3 }) => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
      <Shimmer />

      {/* Card title area */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60">
        <div className="h-4 w-36 bg-stone-200 dark:bg-stone-700 rounded-full" />
      </div>

      {/* List items */}
      <div className="divide-y divide-stone-100 dark:divide-stone-700/50">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="p-4 flex items-start gap-4" style={{ opacity: 1 - i * 0.15 }}>
            {/* Icon placeholder */}
            <div className="h-10 w-10 rounded-lg bg-stone-200 dark:bg-stone-700 shrink-0" />
            {/* Text lines */}
            <div className="space-y-2 flex-1 pt-0.5">
              <div className="h-3.5 bg-stone-200 dark:bg-stone-700 rounded-full w-full" />
              <div className="h-3 bg-stone-100 dark:bg-stone-700/50 rounded-full w-3/4" />
              <div className="flex gap-3 mt-1">
                <div className="h-2.5 w-16 bg-stone-100 dark:bg-stone-700/40 rounded-full" />
                <div className="h-2.5 w-24 bg-stone-100 dark:bg-stone-700/40 rounded-full" />
              </div>
            </div>
            {/* Right-side action placeholder */}
            <div className="flex gap-2 shrink-0 pt-1">
              <div className="h-7 w-16 bg-stone-100 dark:bg-stone-700/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListSkeleton;
