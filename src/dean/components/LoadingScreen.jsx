import React from 'react';
import BookLoader from '../../components/BookLoader';

export default function LoadingScreen({ text = "LOADING DEAN..." }) {
  return (
    <div className="w-full h-screen min-h-screen flex flex-col items-center justify-center bg-[#FDF9ED] dark:bg-stone-900 transition-colors">
      <BookLoader text={text} size="md" />
    </div>
  );
}
