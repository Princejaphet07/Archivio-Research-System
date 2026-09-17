import React from 'react';

export default function LoadingScreen({ text = "LOADING ADVISER..." }) {
  return (
    <div className="w-full h-screen min-h-screen flex flex-col items-center justify-center bg-[#FDF9ED] dark:bg-stone-900 transition-colors">
      <div className="w-12 h-12 border-4 border-[#7B1F35]/30 dark:border-[#f8d070]/30 border-t-[#7B1F35] dark:border-t-[#f8d070] rounded-full animate-spin mb-4"></div>
      <p className="text-[#7B1F35] dark:text-[#f8d070] font-serif text-sm font-semibold tracking-wider uppercase">
        {text}
      </p>
    </div>
  );
}
