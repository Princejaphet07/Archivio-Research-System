import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // <-- GI-IMPORT ANG LINK DINHI
import Header from '../components/Header';
import Footer from '../components/Footer';

function ArchiveBookmarks() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Recently Bookmarked');

  const sortOptions = [
    'Recently Bookmarked',
    'Oldest Bookmarked',
    'Title (A-Z)',
    'Title (Z-A)',
    'Most Viewed',
    'Most Liked'
  ];

  const bookmarkedPapers = [
    {
      id: 1,
      category: "Information Technology",
      dateSaved: "Saved May 22, 2026",
      title: "ARCHIVIO: A Web-Based Research Archive Management System for SWU PHINMA",
      authors: "Zamoras, J.M. • Perote, A.C • Tejada H.M • Vender P.J",
      tags: ["Web Development", "Archive System", "Laravel"],
    },
    {
      id: 2,
      category: "Nursing",
      dateSaved: "Saved May 10, 2025",
      title: "Mental Health Literacy and Help-Seeking Behavior Among Filipino Nursing Students",
      authors: "Villanueva, C.A. • Tan, M.R. • Ong, S.L.",
      tags: ["Mental Health", "Nursing Education", "Quantitative"],
    },
    {
      id: 3,
      category: "Education",
      dateSaved: "Saved Apr 28, 2025",
      title: "Effectiveness of Gamified Learning Environments on Academic Engagement",
      authors: "Bautista, L.C. • Ramos, A.J. • Cruz, P.M.",
      tags: ["Gamification", "K-12", "Student Engagement"],
    }
  ];

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0]">
      <Header />

      {/* PAGE HEADER SECTION */}
      <div className="bg-[#6b142c] text-white px-8 md:px-16 py-10 shadow-inner">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#d6ad60] text-xs font-bold tracking-widest uppercase font-sans mb-1">
            My Library
          </p>
          <h1 className="text-4xl font-bold tracking-wide">My Bookmarks</h1>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        
        <div className="flex justify-between items-end border-b border-stone-300 mb-6 pb-2 font-sans relative">
          <div className="flex gap-6">
            <button className="text-[#7a2039] border-b-2 border-[#7a2039] pb-2 px-1 font-bold text-sm translate-y-[9px]">
              All ({bookmarkedPapers.length})
            </button>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-sm text-stone-600 bg-white border border-stone-200 px-3 py-1.5 rounded shadow-sm hover:bg-stone-50 transition cursor-pointer"
            >
              <span>⏱️</span>
              <span>{selectedSort}</span>
              <span className="text-[10px] text-stone-400">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-stone-200 rounded-md shadow-lg z-50 flex flex-col overflow-hidden text-xs font-sans">
                {sortOptions.map((option, index) => {
                  const isSelected = selectedSort === option;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedSort(option);
                        setIsDropdownOpen(false);
                      }}
                      className={`text-left px-4 py-3 border-b border-stone-100 last:border-b-0 flex items-center gap-2 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f5ebed] text-[#7a2039] font-medium'
                          : 'text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <span className="w-3 text-[#7a2039] font-bold">
                        {isSelected ? '✓' : ''}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* BOOKMARKS LIST */}
        <div className="flex flex-col gap-4">
          {bookmarkedPapers.map((paper) => (
            <div key={paper.id} className="bg-[#fdfbf7] border border-stone-200 shadow-sm flex flex-col md:flex-row justify-between p-6 gap-6 rounded hover:shadow-md transition">
              
              <div className="flex-1 font-sans">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-[#f2ead3] border border-[#e5d4a6] text-[#7a2039] font-medium text-[10px] rounded">
                    {paper.category}
                  </span>
                  <span className="text-xs text-stone-400">{paper.dateSaved}</span>
                </div>
                
                <h2 className="text-lg font-bold text-stone-900 mb-1 leading-snug font-serif">
                  {paper.title}
                </h2>
                <p className="text-xs text-stone-500 mb-4">{paper.authors}</p>
                
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {paper.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end justify-center md:w-36 flex-shrink-0 gap-3 font-sans">
                
                {/* GI-UPDATE NGA VIEW PAPER BUTTON PADULONG SA /viewer */}
                <Link 
                  to="/viewer" 
                  className="w-full py-2 bg-[#7a2039] text-white text-xs font-medium rounded hover:bg-[#5a1528] transition cursor-pointer shadow-sm flex items-center justify-center"
                >
                  View Paper
                </Link>
                
                <button className="w-full py-2 bg-white border border-stone-200 text-stone-500 text-xs rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex items-center justify-center gap-1 cursor-pointer">
                  Remove 📌
                </button>
              </div>

            </div>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}

export default ArchiveBookmarks;