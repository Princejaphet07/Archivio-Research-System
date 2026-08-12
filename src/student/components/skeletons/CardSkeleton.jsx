import React from 'react';

/**
 * Shimmer overlay — creates a premium sweeping light effect over skeleton blocks.
 */
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

const CardSkeleton = ({ borderTopColor }) => {
  return (
    <div 
      className="relative overflow-hidden bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700 p-5 flex flex-col justify-between h-[130px]"
      style={borderTopColor ? { borderTop: `4px solid ${borderTopColor}` } : {}}
    >
      <Shimmer />
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="h-3 w-20 bg-stone-200 dark:bg-stone-700 rounded-full mb-3" />
          <div className="h-7 w-14 bg-stone-200 dark:bg-stone-700 rounded-lg" />
        </div>
        <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700/60 border border-stone-200 dark:border-stone-600" />
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <div className="h-2.5 w-14 bg-stone-100 dark:bg-stone-700/50 rounded-full" />
        <div className="h-2.5 w-20 bg-stone-100 dark:bg-stone-700/50 rounded-full" />
      </div>
    </div>
  );
};

export default CardSkeleton;
