import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

function ArchiveAbout() {
  return (
    <div className="font-serif min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
      <Header />

      {/* HERO SECTION */}
      <div className="bg-[#300815] dark:bg-gray-950 text-center py-24 px-4 border-y border-white/10 shadow-inner relative transition-colors">
        <p className="text-[#d6ad60] text-xs font-bold tracking-[0.2em] uppercase font-sans mb-4">
          SWU PHINMA • Cebu City, Philippines
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-[#f3e5ab] mb-4 tracking-wide drop-shadow-md">
          About ARCHIVIO
        </h1>
        <p className="text-xl text-stone-300 italic font-light max-w-2xl mx-auto">
          A digital home for SWU PHINMA academic research
        </p>
      </div>

      {/* MISSION & VISION SECTION */}
      <div className="max-w-7xl mx-auto w-full px-8 md:px-16 py-16 flex flex-col md:flex-row gap-8">
        
        {/* Mission Card */}
        <div className="flex-1 bg-[#fcfafaf5] dark:bg-gray-800 border border-stone-200 dark:border-gray-700 border-t-4 border-t-[#8c1c38] rounded-b-lg p-8 shadow-sm hover:shadow-md transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Our Mission</h2>
          </div>
          <p className="text-stone-600 dark:text-gray-300 font-sans text-sm leading-relaxed">
            To provide an accessible, secure, and organized digital repository that preserves and promotes the academic research of SWU PHINMA students and faculty — making knowledge freely available to the broader academic community.
          </p>
        </div>

        {/* Vision Card */}
        <div className="flex-1 bg-[#fcfafaf5] dark:bg-gray-800 border border-stone-200 dark:border-gray-700 border-t-4 border-t-[#6b7c93] rounded-b-lg p-8 shadow-sm hover:shadow-md transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔭</span>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Our Vision</h2>
          </div>
          <p className="text-stone-600 dark:text-gray-300 font-sans text-sm leading-relaxed">
            To become the leading academic research archive in Cebu City, recognized for the quality, breadth, and accessibility of its research outputs — empowering evidence-based learning and innovation across all disciplines.
          </p>
        </div>

      </div>

      {/* INFO & STATS SECTION */}
      <div className="bg-[#faf7f0] dark:bg-gray-800 px-8 md:px-16 py-20 border-t border-[#e8e2d3] dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          
          {/* Left Side: Text Details */}
          <div className="flex-1">
            <p className="text-[#d6ad60] text-xs font-bold tracking-[0.15em] uppercase font-sans mb-2">
              What is ARCHIVIO
            </p>
            <h2 className="text-4xl font-bold text-stone-900 dark:text-gray-100 mb-6">The Research Archive</h2>
            <div className="space-y-4 text-stone-600 dark:text-gray-400 font-sans text-sm leading-relaxed">
              <p>
                ARCHIVIO is the official digital research archive of Southwestern University PHINMA (SWU PHINMA), Cebu City, Philippines. Built as a capstone project by BSIT students, it addresses the institution's need for a centralized, accessible, and secure repository of academic research.
              </p>
              <p>
                Every paper in this archive has passed through a structured workflow — student submission, faculty adviser review, and dean approval — ensuring quality and academic integrity. ARCHIVIO is committed to open knowledge-sharing while protecting intellectual property through view-only access controls for the public.
              </p>
            </div>
          </div>

          {/* Right Side: Stats Box */}
          <div className="flex-1 w-full max-w-md">
            <div className="bg-[#7a2039] rounded-xl p-10 shadow-lg grid grid-cols-2 gap-y-10 gap-x-4 text-center divide-x divide-white/10">
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2">1,248</h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Papers Archived</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2">342</h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Student Authors</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2">89</h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Faculty Advisers</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2">14</h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Departments</p>
              </div>

            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveAbout;