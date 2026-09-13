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

const TEAM_MEMBERS = [
  {
    name: 'Prince Japhet Vender',
    role: 'Lead Programmer',
    tagline: 'System Architect & Full-Stack Developer',
    description: 'Spearheaded the overall architectural design, database systems, AI assistant integration, and full-stack implementation of ARCHIVIO.',
    avatarGradient: 'from-[#6b142c] via-[#8c1c38] to-[#3a0815]',
    ringColor: 'ring-[#d6ad60]/50 dark:ring-[#d6ad60]/40',
    iconEmoji: '💻',
    badgeStyle: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60',
    accentGradient: 'bg-gradient-to-r from-[#8c1c38] via-[#a82446] to-[#d6ad60]',
    github: 'https://github.com/Princejaphet07',
    email: 'mailto:japhetvender00@gmail.com'
  },
  {
    name: 'Jerika Zamoras',
    role: 'UI/UX Designer',
    tagline: 'User Experience & Creative Design',
    description: 'Crafted the aesthetic design language, responsive interface layouts, user journeys, and visual experiences across all portal interfaces.',
    avatarGradient: 'from-[#db2777] via-[#e11d48] to-[#831843]',
    ringColor: 'ring-pink-400/50 dark:ring-pink-400/40',
    iconEmoji: '🎨',
    badgeStyle: 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300/80 dark:border-rose-700/60',
    accentGradient: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400',
    github: 'https://github.com/Princejaphet07',
    email: 'mailto:japhetvender00@gmail.com'
  },
  {
    name: 'Hylla Mae Tejada',
    role: 'Project Manager',
    tagline: 'Project Coordination & Quality Assurance',
    description: 'Managed project milestones, feature specifications, timeline adherence, and overall institutional alignment with stakeholders.',
    avatarGradient: 'from-[#7c3aed] via-[#6366f1] to-[#4338ca]',
    ringColor: 'ring-purple-400/50 dark:ring-purple-400/40',
    iconEmoji: '📋',
    badgeStyle: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300/80 dark:border-purple-700/60',
    accentGradient: 'bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400',
    github: 'https://github.com/Princejaphet07',
    email: 'mailto:japhetvender00@gmail.com'
  },
  {
    name: 'Andrea Cañete Perote',
    role: 'Assistant Programmer',
    tagline: 'Assistant Developer & Research Lead',
    description: 'Assisted in core feature engineering, data structuring, system testing, and documentation alignment for research submissions.',
    avatarGradient: 'from-[#059669] via-[#0d9488] to-[#047857]',
    ringColor: 'ring-emerald-400/50 dark:ring-emerald-400/40',
    iconEmoji: '🚀',
    badgeStyle: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60',
    accentGradient: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400',
    github: 'https://github.com/Princejaphet07',
    email: 'mailto:japhetvender00@gmail.com'
  }
];

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

      {/* DEVELOPMENT TEAM SECTION */}
      <div className="py-24 px-6 md:px-16 bg-[#f4efe4] dark:bg-gray-950/80 border-t border-[#e8e2d3] dark:border-gray-800 transition-colors relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#8c1c38]/5 dark:bg-[#8c1c38]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#d6ad60]/5 dark:bg-[#d6ad60]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-[1px] w-8 bg-[#8c1c38]"></div>
              <span className="text-[#8c1c38] dark:text-[#f3e5ab] text-xs font-bold tracking-[0.25em] uppercase font-sans">
                The Minds Behind ARCHIVIO
              </span>
              <div className="h-[1px] w-8 bg-[#8c1c38]"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#8c1c38] dark:text-[#f3e5ab] font-serif tracking-tight mb-4">
              Meet the Development Team
            </h2>
            <p className="text-stone-600 dark:text-gray-300 font-sans text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed">
              The dedicated BSIT innovators from Southwestern University PHINMA who conceptualized, designed, and engineered the ARCHIVIO Research Management System.
            </p>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {TEAM_MEMBERS.map((member, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-stone-200/90 dark:border-gray-700 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden group h-full"
              >
                {/* Top Accent Gradient Bar */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${member.accentGradient}`}></div>

                {/* Crisp Vector Profile Avatar */}
                <div className={`w-24 h-24 mb-5 rounded-full p-1 bg-gradient-to-br ${member.avatarGradient} flex items-center justify-center shadow-lg relative group-hover:scale-105 transition-all duration-300 ring-4 ${member.ringColor}`}>
                  <div className="w-full h-full rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-xs flex items-center justify-center border border-white/25">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white/95 drop-shadow-sm">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Role Icon Badge */}
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-stone-200 dark:border-gray-700 shadow-md flex items-center justify-center text-sm" title={member.role}>
                    {member.iconEmoji}
                  </span>
                </div>

                {/* Member Name */}
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-gray-100 mb-1.5 group-hover:text-[#8c1c38] dark:group-hover:text-[#f3e5ab] transition-colors h-7 flex items-center justify-center">
                  {member.name}
                </h3>

                {/* Role Pill Badge */}
                <div className="h-8 flex items-center justify-center mb-2">
                  <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-bold font-sans tracking-wide uppercase border ${member.badgeStyle}`}>
                    {member.role}
                  </span>
                </div>

                {/* Tagline */}
                <div className="h-10 flex items-center justify-center mb-3">
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 tracking-wide font-sans line-clamp-2">
                    {member.tagline}
                  </p>
                </div>

                {/* Bio / Responsibilities */}
                <div className="pt-3 border-t border-stone-100 dark:border-gray-700/60 w-full flex-1 flex items-center justify-center min-h-[76px]">
                  <p className="text-xs text-stone-600 dark:text-gray-300 font-sans leading-relaxed font-light">
                    {member.description}
                  </p>
                </div>

                {/* Contact & Social Action Buttons / Baseline Footer */}
                <div className="pt-4 mt-auto flex items-center justify-center gap-3 w-full border-t border-stone-100/90 dark:border-gray-700/60 h-14">
                  {/* GitHub Button - Official Color */}
                  <a 
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-[#24292f] dark:text-white shadow-sm border border-stone-200 dark:border-gray-600 hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
                    title={`Visit GitHub for ${member.name}`}
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </a>

                  {/* Email Button - Colorful Gmail SVG */}
                  <a 
                    href={member.email}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-stone-200 dark:border-gray-600 hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
                    title={`Send email regarding ${member.name}`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 6L12 13L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 6L12 13L22 6" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6" stroke="#FBBC05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 2"/>
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Institutional Capstone Footer Notice */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-6 py-3 rounded-full border border-stone-200 dark:border-gray-700 shadow-sm text-xs font-sans text-stone-600 dark:text-stone-300">
              <span className="text-base">🎓</span>
              <span>
                <strong>Southwestern University PHINMA</strong> • College of Information Technology • BSIT Capstone Team 2026
              </span>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveAbout;