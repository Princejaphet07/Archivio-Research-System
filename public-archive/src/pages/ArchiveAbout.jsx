import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    if (target === 0) return;
    const increment = target / (duration / 16);
    
    const animate = () => {
      start += increment;
      if (start < target) {
        setCount(Math.ceil(start));
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target]);

  return <>{count.toLocaleString()}</>;
};

function ArchiveAbout() {
  const [stats, setStats] = useState({ papers: 0, authors: 0, advisers: 0, departments: 0 });

  useEffect(() => {
    const qSubs = query(collection(db, 'submissions'), where('reviewStatus', '==', 'published'));
    
    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      const papers = snapshot.docs.map(d => d.data());
      
      const uniqueAuthors = new Set();
      const uniqueAdvisers = new Set();
      const uniqueDepartments = new Set();

      papers.forEach(p => {
        if (p.studentUid) uniqueAuthors.add(p.studentUid);
        else if (p.studentName) uniqueAuthors.add(p.studentName);

        if (p.adviserName) uniqueAdvisers.add(p.adviserName);
        if (p.program || p.category) uniqueDepartments.add(p.program || p.category);
      });

      setStats({
        papers: papers.length,
        authors: uniqueAuthors.size || 0,
        advisers: uniqueAdvisers.size || 0,
        departments: uniqueDepartments.size || 0
      });
    });

    return () => unsubSubs();
  }, []);

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0] dark:bg-gray-900 transition-colors">
      <Header />

      {/* HERO SECTION */}
      <div className="bg-[#6b142c] dark:bg-gray-950 text-center py-24 px-4 border-y border-white/10 shadow-inner relative transition-colors">
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

      {/* MISSION & VISION SECTION - PREMIUM REDESIGN */}
      <div className="max-w-7xl mx-auto w-full px-8 md:px-16 py-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32">
          
          {/* Mission */}
          <div className="relative group">
            {/* Background Accent */}
            <div className="absolute -top-10 -left-6 text-9xl font-serif font-black text-stone-100 dark:text-gray-800/50 -z-10 select-none transition-transform duration-700 group-hover:scale-105 group-hover:text-stone-200 dark:group-hover:text-gray-800">
              M
            </div>
            <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#8c1c38]/10 text-[#8c1c38] transition-transform duration-500 group-hover:scale-110">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <p className="text-[#8c1c38] text-xs font-bold tracking-[0.2em] uppercase font-sans mb-4 flex items-center gap-3">
              <span className="w-10 h-[1px] bg-[#8c1c38]"></span> The Purpose
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#8c1c38] dark:text-[#c25975] mb-8 font-serif">
              Our Mission
            </h2>
            <p className="text-stone-600 dark:text-gray-300 font-sans text-lg md:text-xl leading-relaxed font-light">
              To provide an accessible, secure, and organized digital repository that preserves and promotes the academic research of SWU PHINMA students and faculty — <span className="font-normal text-stone-800 dark:text-gray-100">making knowledge freely available</span> to the broader academic community.
            </p>
          </div>

          {/* Vision */}
          <div className="relative group lg:mt-32">
            {/* Background Accent */}
            <div className="absolute -top-10 -left-6 text-9xl font-serif font-black text-stone-100 dark:text-gray-800/50 -z-10 select-none transition-transform duration-700 group-hover:scale-105 group-hover:text-stone-200 dark:group-hover:text-gray-800">
              V
            </div>
            <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6b7c93]/10 text-[#6b7c93] transition-transform duration-500 group-hover:scale-110">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"/><path d="m13.56 11.747 4.332-.924"/><path d="m16 21-3.105-6.21"/><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"/><path d="m6.158 8.633 1.114 4.456"/><path d="m8 21 3.105-6.21"/><circle cx="12" cy="13" r="2"/></svg>
            </div>
            <p className="text-[#6b7c93] text-xs font-bold tracking-[0.2em] uppercase font-sans mb-4 flex items-center gap-3">
              <span className="w-10 h-[1px] bg-[#6b7c93]"></span> The Future
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#8c1c38] dark:text-[#c25975] mb-8 font-serif">
              Our Vision
            </h2>
            <p className="text-stone-600 dark:text-gray-300 font-sans text-lg md:text-xl leading-relaxed font-light">
              To become the leading academic research archive in Cebu City, recognized for the quality, breadth, and accessibility of its research outputs — <span className="font-normal text-stone-800 dark:text-gray-100">empowering evidence-based learning</span> and innovation across all disciplines.
            </p>
          </div>

        </div>
      </div>

      {/* INFO & STATS SECTION - PREMIUM REDESIGN */}
      <div className="bg-white dark:bg-gray-800 px-8 md:px-16 py-32 border-t border-[#e8e2d3] dark:border-gray-700 transition-colors relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-[#d6ad60] opacity-5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          
          {/* Left Side: Text Details */}
          <div className="flex-1 lg:pr-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] w-12 bg-[#d6ad60]"></div>
              <span className="text-[#d6ad60] text-xs font-bold tracking-[0.2em] uppercase font-sans">
                What is ARCHIVIO
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#8c1c38] dark:text-[#c25975] mb-8 font-serif leading-tight tracking-tight">
              The Research Archive
            </h2>
            <div className="space-y-6 text-stone-600 dark:text-gray-300 font-sans text-lg font-light leading-relaxed">
              <p>
                <strong className="font-medium text-stone-800 dark:text-gray-100">ARCHIVIO</strong> is the official digital research archive of Southwestern University PHINMA (SWU PHINMA), Cebu City, Philippines. Built as a capstone project by BSIT students, it addresses the institution's need for a centralized, accessible, and secure repository of academic research.
              </p>
              <p>
                Every paper in this archive has passed through a structured workflow — student submission, faculty adviser review, and dean approval — ensuring quality and academic integrity. ARCHIVIO is committed to open knowledge-sharing while protecting intellectual property through view-only access controls for the public.
              </p>
            </div>
          </div>

          {/* Right Side: Stats Box */}
          <div className="flex-1 w-full max-w-lg lg:ml-auto">
            <div className="relative group">
              {/* Accent border behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#d6ad60] to-[#7B1F35] rounded-2xl transform translate-x-3 translate-y-3 opacity-60 dark:opacity-40 blur-md transition-transform duration-500 group-hover:translate-x-4 group-hover:translate-y-4"></div>
              
              <div className="relative bg-gradient-to-br from-[#801e38] to-[#6b142c] rounded-2xl p-10 md:p-14 shadow-2xl overflow-hidden border border-white/10">
                {/* Subtle noise/texture overlay or watermark */}
                <div className="absolute -bottom-8 -right-4 text-[12rem] text-white/5 font-serif font-black pointer-events-none select-none leading-none">
                  A
                </div>
                
                <div className="grid grid-cols-2 gap-y-12 gap-x-8 relative z-10">
                  
                  <div className="flex flex-col items-start border-l-2 border-[#d6ad60]/40 pl-5 transition-colors hover:border-[#d6ad60]">
                    <h3 className="text-5xl font-serif font-bold text-[#f3e5ab] mb-2"><AnimatedCounter target={stats.papers} /></h3>
                    <p className="text-[10px] font-sans text-stone-300 uppercase tracking-[0.2em] font-medium leading-relaxed">Papers<br/>Archived</p>
                  </div>
                  
                  <div className="flex flex-col items-start border-l-2 border-[#d6ad60]/40 pl-5 transition-colors hover:border-[#d6ad60]">
                    <h3 className="text-5xl font-serif font-bold text-[#f3e5ab] mb-2"><AnimatedCounter target={stats.authors} /></h3>
                    <p className="text-[10px] font-sans text-stone-300 uppercase tracking-[0.2em] font-medium leading-relaxed">Student<br/>Authors</p>
                  </div>
                  
                  <div className="flex flex-col items-start border-l-2 border-[#d6ad60]/40 pl-5 transition-colors hover:border-[#d6ad60]">
                    <h3 className="text-5xl font-serif font-bold text-[#f3e5ab] mb-2"><AnimatedCounter target={stats.advisers} /></h3>
                    <p className="text-[10px] font-sans text-stone-300 uppercase tracking-[0.2em] font-medium leading-relaxed">Faculty<br/>Advisers</p>
                  </div>
                  
                  <div className="flex flex-col items-start border-l-2 border-[#d6ad60]/40 pl-5 transition-colors hover:border-[#d6ad60]">
                    <h3 className="text-5xl font-serif font-bold text-[#f3e5ab] mb-2"><AnimatedCounter target={stats.departments} /></h3>
                    <p className="text-[10px] font-sans text-stone-300 uppercase tracking-[0.2em] font-medium leading-relaxed">Departments</p>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CORE VALUES SECTION */}
      <div className="py-24 px-8 md:px-16 bg-[#faf7f0] dark:bg-gray-900 transition-colors relative">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-20">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] w-8 bg-[#8c1c38]"></div>
              <span className="text-[#8c1c38] text-xs font-bold tracking-[0.2em] uppercase font-sans">
                Pillars of ARCHIVIO
              </span>
              <div className="h-[1px] w-8 bg-[#8c1c38]"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#8c1c38] dark:text-[#c25975] font-serif tracking-tight">
              Our Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Value 1: Academic Integrity */}
            <div className="group p-10 bg-white dark:bg-gray-800/50 rounded-2xl border border-[#e8e2d3] dark:border-gray-700/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#801e38] opacity-5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:opacity-10 transition-opacity"></div>
              <div className="w-14 h-14 mb-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-stone-100 dark:border-gray-700 flex items-center justify-center text-[#8c1c38]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#8c1c38] dark:text-[#c25975] mb-4">Academic Integrity</h3>
              <p className="text-stone-600 dark:text-gray-400 font-sans leading-relaxed text-sm font-light">
                Ensuring every piece of research is rigorously reviewed, properly attributed, and preserved with the highest institutional standards.
              </p>
            </div>

            {/* Value 2: Open Accessibility */}
            <div className="group p-10 bg-white dark:bg-gray-800/50 rounded-2xl border border-[#e8e2d3] dark:border-gray-700/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d6ad60] opacity-5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:opacity-10 transition-opacity"></div>
              <div className="w-14 h-14 mb-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-stone-100 dark:border-gray-700 flex items-center justify-center text-[#d6ad60]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#8c1c38] dark:text-[#c25975] mb-4">Open Accessibility</h3>
              <p className="text-stone-600 dark:text-gray-400 font-sans leading-relaxed text-sm font-light">
                Breaking down barriers to knowledge by providing a secure, seamless, and centralized platform for discovering published studies.
              </p>
            </div>

            {/* Value 3: Technological Innovation */}
            <div className="group p-10 bg-white dark:bg-gray-800/50 rounded-2xl border border-[#e8e2d3] dark:border-gray-700/50 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#6b7c93] opacity-5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:opacity-10 transition-opacity"></div>
              <div className="w-14 h-14 mb-8 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-stone-100 dark:border-gray-700 flex items-center justify-center text-[#6b7c93]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#8c1c38] dark:text-[#c25975] mb-4">Technological Innovation</h3>
              <p className="text-stone-600 dark:text-gray-400 font-sans leading-relaxed text-sm font-light">
                Continuously utilizing modern web capabilities, AI tools, and secure digital rights management to elevate the research experience.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* SYSTEM FEATURES HIGHLIGHT */}
      <div className="py-20 px-4 md:px-16 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-2">Powered by Technology</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#8c1c38] dark:text-[#c25975]">Premium Features</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-[#8c1c38] dark:text-[#c25975] mb-2">AI-Powered Assistant</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">An intelligent chatbot ready to summarize abstracts, suggest topics, and answer research queries instantly.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="font-bold text-[#8c1c38] dark:text-[#c25975] mb-2">Secure Viewer</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Advanced anti-screenshot and anti-print measures to protect the intellectual property of student researchers.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">📑</div>
            <h3 className="font-bold text-[#8c1c38] dark:text-[#c25975] mb-2">Instant Citations</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Automatically generate accurate APA, MLA, and Chicago citations for any published research paper.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-bold text-[#8c1c38] dark:text-[#c25975] mb-2">Advanced Filtering</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Easily find exactly what you need with fast, categorized searching by department, year, and popularity.</p>
          </div>
        </div>
      </div>



      <Footer />
    </div>
  );
}

export default ArchiveAbout;