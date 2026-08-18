import React from 'react';

/**
 * Shimmer overlay — creates a premium sweeping light effect over skeleton blocks.
 */
const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

const TableSkeleton = ({ columns = 5, rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="relative overflow-hidden" style={{ opacity: 1 - i * 0.12 }}>
          {/* Number col */}
          <td className="py-4 px-4 text-center">
            <div className="relative overflow-hidden">
              <Shimmer />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-6 mx-auto" />
            </div>
          </td>

          {/* Title col */}
          <td className="py-4 px-4">
            <div className="relative overflow-hidden space-y-2">
              <Shimmer />
              <div className="h-3.5 bg-stone-200 dark:bg-stone-700 rounded-full w-3/4" />
              <div className="h-2.5 bg-stone-100 dark:bg-stone-700/50 rounded-full w-1/2" />
            </div>
          </td>

          {/* Group col */}
          <td className="py-4 px-4">
            <div className="relative overflow-hidden">
              <Shimmer />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-4/5" />
            </div>
          </td>

          {/* Date / Status col */}
          <td className="py-4 px-4">
            <div className="relative overflow-hidden">
              <Shimmer />
              <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-20" />
            </div>
          </td>

          {/* Action col */}
          <td className="py-4 px-4 text-center">
            <div className="relative overflow-hidden flex gap-2 justify-center">
              <Shimmer />
              <div className="h-7 w-16 bg-stone-100 dark:bg-stone-700/40 rounded-lg" />
              <div className="h-7 w-20 bg-stone-200 dark:bg-stone-700 rounded-lg" />
            </div>
          </td>

          {/* Extra columns if needed */}
          {columns > 5 && Array.from({ length: columns - 5 }).map((_, j) => (
            <td key={j} className="py-4 px-4">
              <div className="relative overflow-hidden">
                <Shimmer />
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full w-16" />
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
