import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

function ArchiveTeam() {
  return (
    <div className="font-serif min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors">
      <Header />

      {/* HERO SECTION */}
      <div className="bg-[#300815] dark:bg-gray-950 text-center py-24 px-4 border-y border-white/10 shadow-inner relative transition-colors">
        <p className="text-[#d6ad60] text-xs font-bold tracking-[0.2em] uppercase font-sans mb-4">
          The Minds Behind The System
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-[#f3e5ab] mb-4 tracking-wide drop-shadow-md">
          Project Proponents
        </h1>
        <p className="text-xl text-stone-300 italic font-light max-w-2xl mx-auto">
          The capstone team that built ARCHIVIO
        </p>
      </div>

      {/* MEET THE DEVELOPERS SECTION */}
      <div className="bg-stone-900 text-white flex-1 py-24 px-4 md:px-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 justify-items-center">
            
            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-6 flex items-center justify-center text-5xl overflow-hidden shadow-2xl group-hover:scale-105 group-hover:border-[#d6ad60] transition-all duration-300">
                👨‍💻
              </div>
              <h3 className="text-xl font-bold text-[#f3e5ab] mb-2 font-serif">Prince Japhet Vender</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-widest">Lead Developer / System Architect</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-6 flex items-center justify-center text-5xl overflow-hidden shadow-2xl group-hover:scale-105 group-hover:border-[#d6ad60] transition-all duration-300">
                👩‍💼
              </div>
              <h3 className="text-xl font-bold text-[#f3e5ab] mb-2 font-serif">Hylla Mae Tejada</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-widest">Project Manager</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-6 flex items-center justify-center text-5xl overflow-hidden shadow-2xl group-hover:scale-105 group-hover:border-[#d6ad60] transition-all duration-300">
                👩‍💻
              </div>
              <h3 className="text-xl font-bold text-[#f3e5ab] mb-2 font-serif">Andrea Cañete Perote</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-widest">Co-Developer / Programmer</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-stone-800 border-4 border-[#7a2039] mb-6 flex items-center justify-center text-5xl overflow-hidden shadow-2xl group-hover:scale-105 group-hover:border-[#d6ad60] transition-all duration-300">
                👩‍🎨
              </div>
              <h3 className="text-xl font-bold text-[#f3e5ab] mb-2 font-serif">Jerika Zamoras</h3>
              <p className="text-xs font-sans text-stone-400 uppercase tracking-widest">UI/UX Designer / Researcher</p>
            </div>
            
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveTeam;

