import React from 'react';

/**
 * BookLoader component
 * A thematic maroon book with continuously flipping pages.
 * Perfect for uploads, approvals, invitations, and waiting states across Archivio.
 *
 * Props:
 * - text: primary message (e.g. "Uploading manuscript...", "Processing Approval...", "Sending Invitation...")
 * - subtext: optional secondary detail
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - fullScreen: boolean - renders fixed overlay with backdrop blur
 * - overlay: boolean - renders absolute overlay over parent container
 * - className: additional Tailwind classes
 */
export default function BookLoader({
  text = 'Loading...',
  subtext,
  size = 'md',
  fullScreen = false,
  overlay = false,
  className = ''
}) {
  // Scale mapping
  const scaleClass = {
    sm: 'scale-75',
    md: 'scale-100',
    lg: 'scale-125'
  }[size] || 'scale-100';

  const content = (
    <div className={`flex flex-col items-center justify-center p-4 select-none ${className}`}>
      {/* 3D Flipping Book */}
      <div className={`relative mb-4 ${scaleClass}`}>
        <div className="archivio-book-loader">
          {/* Hardcover left & right */}
          <div className="archivio-book-cover-left" />
          <div className="archivio-book-cover-right" />
          
          {/* Static paper stacks */}
          <div className="archivio-book-page-stack-left">
            <span className="archivio-book-line" />
            <span className="archivio-book-line" />
            <span className="archivio-book-line" />
          </div>
          <div className="archivio-book-page-stack-right">
            <span className="archivio-book-line" />
            <span className="archivio-book-line" />
            <span className="archivio-book-line" />
          </div>

          {/* Spine */}
          <div className="archivio-book-spine" />

          {/* 4 Staggered Flipping Pages */}
          <div className="archivio-flipping-page page-1">
            <span className="archivio-page-rule" />
            <span className="archivio-page-rule" />
          </div>
          <div className="archivio-flipping-page page-2">
            <span className="archivio-page-rule" />
            <span className="archivio-page-rule" />
          </div>
          <div className="archivio-flipping-page page-3">
            <span className="archivio-page-rule" />
            <span className="archivio-page-rule" />
          </div>
          <div className="archivio-flipping-page page-4">
            <span className="archivio-page-rule" />
            <span className="archivio-page-rule" />
          </div>
        </div>
      </div>

      {/* Primary Message */}
      {text && (
        <p className="text-[#6B0F1A] dark:text-[#f8d070] font-serif text-sm sm:text-base font-bold tracking-wide text-center">
          {text}
        </p>
      )}

      {/* Subtext */}
      {subtext && (
        <p className="text-gray-500 dark:text-stone-400 text-xs text-center mt-1 max-w-xs">
          {subtext}
        </p>
      )}

      {/* Animated Subtle Pulse Dots */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B0F1A] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B0F1A] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B0F1A] animate-bounce" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-[#fdfaf4] dark:bg-stone-900 border border-[#ddd5c8] dark:border-stone-700 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center">
          {content}
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#fdfaf4]/85 dark:bg-stone-900/85 backdrop-blur-xs rounded-xl p-4">
        {content}
      </div>
    );
  }

  return content;
}
