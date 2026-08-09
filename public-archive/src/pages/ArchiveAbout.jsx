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
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2"><AnimatedCounter target={stats.papers} /></h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Papers Archived</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2"><AnimatedCounter target={stats.authors} /></h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Student Authors</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2"><AnimatedCounter target={stats.advisers} /></h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Faculty Advisers</p>
              </div>
              
              <div className="px-2">
                <h3 className="text-4xl font-bold text-[#d6ad60] mb-2"><AnimatedCounter target={stats.departments} /></h3>
                <p className="text-[10px] font-sans text-stone-200 uppercase tracking-wider">Departments</p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* SYSTEM FEATURES HIGHLIGHT */}
      <div className="py-20 px-4 md:px-16 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-2">Powered by Technology</p>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-gray-100">Premium Features</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-stone-900 dark:text-gray-100 mb-2">AI-Powered Assistant</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">An intelligent chatbot ready to summarize abstracts, suggest topics, and answer research queries instantly.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="font-bold text-stone-900 dark:text-gray-100 mb-2">Secure Viewer</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Advanced anti-screenshot and anti-print measures to protect the intellectual property of student researchers.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">📑</div>
            <h3 className="font-bold text-stone-900 dark:text-gray-100 mb-2">Instant Citations</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Automatically generate accurate APA, MLA, and Chicago citations for any published research paper.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-stone-200 dark:border-gray-700 text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-bold text-stone-900 dark:text-gray-100 mb-2">Advanced Filtering</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 font-sans">Easily find exactly what you need with fast, categorized searching by department, year, and popularity.</p>
          </div>
        </div>
      </div>

      {/* MEET THE DEVELOPERS SECTION */}
      <div className="bg-stone-900 text-white py-20 px-4 md:px-16 border-t border-stone-800">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <p className="text-[#d6ad60] text-xs font-bold tracking-[0.2em] uppercase font-sans mb-2">The Minds Behind The System</p>
            <h2 className="text-3xl md:text-4xl font-bold">Meet The Developers</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 justify-items-center">
            
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-4 flex items-center justify-center text-4xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-300">
                👨‍💻
              </div>
              <h3 className="text-lg font-bold text-[#f3e5ab] mb-1">Prince Japhet Vender</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-wider">Lead Developer / System Architect</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-4 flex items-center justify-center text-4xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-300">
                👩‍💼
              </div>
              <h3 className="text-lg font-bold text-[#f3e5ab] mb-1">Hylla Mae Tejada</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-wider">Project Manager</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-4 flex items-center justify-center text-4xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-300">
                👩‍💻
              </div>
              <h3 className="text-lg font-bold text-[#f3e5ab] mb-1">Andrea Cañete Perote</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-wider">Co-Developer / Programmer</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-4 flex items-center justify-center text-4xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-300">
                👩‍🎨
              </div>
              <h3 className="text-lg font-bold text-[#f3e5ab] mb-1">Jerika Zamoras</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-wider">UI/UX Designer / Researcher</p>
            </div>
            
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveAbout;