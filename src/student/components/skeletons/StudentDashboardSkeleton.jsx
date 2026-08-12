import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

export default function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      {/* What's Next Card Skeleton */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 relative overflow-hidden shadow-sm flex items-center gap-6">
        <Shimmer />
        <div className="w-[60px] h-[60px] bg-stone-200 dark:bg-stone-700 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded-full" />
          <div className="h-6 w-64 bg-stone-200 dark:bg-stone-700 rounded-lg" />
          <div className="h-4 w-80 bg-stone-100 dark:bg-stone-700/50 rounded-full" />
        </div>
        <div className="h-10 w-36 bg-stone-200 dark:bg-stone-700 rounded-full shrink-0" />
      </div>

      {/* Your Progress Card Skeleton */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-8 relative overflow-hidden shadow-sm">
        <Shimmer />
        <div className="flex justify-between items-end mb-8">
          <div className="h-7 w-40 bg-stone-200 dark:bg-stone-700 rounded-lg" />
          <div className="h-5 w-24 bg-stone-200 dark:bg-stone-700 rounded-full" />
        </div>
        <div className="relative pt-2 pb-6 px-4">
          <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full" />
        </div>
      </div>

      {/* Bottom Grid Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl relative overflow-hidden shadow-sm flex flex-col h-[250px]">
            <Shimmer />
            <div className="bg-stone-50 dark:bg-stone-800/50 px-6 py-4 flex justify-between items-center border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-stone-200 dark:bg-stone-700 rounded-full" />
                <div className="h-5 w-32 bg-stone-200 dark:bg-stone-700 rounded-lg" />
              </div>
              <div className="h-6 w-24 bg-stone-200 dark:bg-stone-700 rounded-full" />
            </div>
            <div className="p-6 flex flex-col flex-1 space-y-4">
              <div className="h-5 w-48 bg-stone-200 dark:bg-stone-700 rounded-lg" />
              <div className="h-4 w-64 bg-stone-100 dark:bg-stone-700/50 rounded-full" />
              <div className="mt-auto flex items-center gap-3">
                <div className="h-10 w-32 bg-stone-200 dark:bg-stone-700 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
