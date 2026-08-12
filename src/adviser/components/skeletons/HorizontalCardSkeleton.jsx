import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

const HorizontalCardSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Shimmer />
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="w-12 h-12 bg-stone-200 dark:bg-stone-700 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1 min-w-[200px]">
              <div className="h-4 w-3/4 bg-stone-200 dark:bg-stone-700 rounded-full" />
              <div className="h-3 w-1/2 bg-stone-100 dark:bg-stone-700/60 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto mt-4 sm:mt-0">
            <div className="h-8 w-24 bg-stone-200 dark:bg-stone-700 rounded-lg" />
            <div className="h-8 w-24 bg-stone-200 dark:bg-stone-700 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default HorizontalCardSkeleton;
