import React from 'react';
import { Link } from 'react-router-dom'; // <-- GI-IMPORT ANG LINK DINHI
import Header from '../components/Header';
import Footer from '../components/Footer';

function ArchiveBrowse() {
  const papers = [
    {
      id: 1,
      category: "Web Development",
      isNew: true,
      year: "2026",
      title: "ARCHIVIO: A Web-Based Research Archive Management System for SWU PHINMA",
      authors: "Zamoras, J.M. • Perote, A.C • Tejada H.M • Vender P.J. • Adviser: Dr. Cendana C.",
      abstract: "This study developed a web-based Research Archive Management System enabling advisers, deans, and students to manage manuscripts through a structured digital workflow with role-based access control...",
      tags: ["Archive System", "AI", "SWU PHINMA"],
      likes: 128,
      views: 1042,
      borderColor: "border-green-600"
    },
    {
      id: 2,
      category: "Mental Health",
      isNew: false,
      year: "2024",
      title: "Mental Health Literacy and Help-Seeking Behavior Among Filipino Nursing Students",
      authors: "Villanueva, C.A. • Tan, M.R. • Ong, S.L. • Adviser: Dr. Lim, S.J.",
      abstract: "Cross-sectional study examining mental health literacy and its relationship to help-seeking behavior among nursing students, revealing significant correlations...",
      tags: ["Nursing Education", "Quantitative"],
      likes: 89,
      views: 721,
      borderColor: "border-teal-500"
    },
    {
      id: 3,
      category: "Digital",
      isNew: false,
      year: "2024",
      title: "The Mediating Role of Digital Transformation on SME Performance in Cebu City",
      authors: "Go, A.M. • Lim, J.T. • Adviser: Dr. Soriano, B.R.",
      abstract: "Using structural equation modeling, investigates how digital transformation mediates the relationship between organizational agility and business performance among SMEs...",
      tags: ["Digital Transformation", "SME", "Cebu", "SEM"],
      likes: 54,
      views: 432,
      borderColor: "border-purple-500"
    },
    {
      id: 4,
      category: "Education",
      isNew: false,
      year: "2024",
      title: "Effectiveness of Gamified Learning Environments on Academic Engagement in Philippine K-12",
      authors: "Bautista, L.C. • Ramos, A.J. • Cruz, P.M. • Adviser: Dr. Santos, E.",
      abstract: "Quasi-experimental research on gamification impact on student engagement in K-12 classrooms, with results indicating statistically significant improvement in motivation...",
      tags: ["Gamification", "K-12", "EdTech"],
      likes: 71,
      views: 589,
      borderColor: "border-red-700"
    }
  ];

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0]">
      <Header />

      {/* TOP SEARCH BAR SECTION */}
      <div className="bg-[#f2ead3] px-8 py-4 border-b border-stone-300 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-10">
        <div className="flex gap-4 w-full md:w-auto flex-1 font-sans">
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search title, author, keywords..." 
              className="w-full py-2.5 pl-10 pr-4 rounded bg-white border border-stone-200 outline-none focus:border-[#7a2039] text-sm text-stone-700 shadow-sm"
            />
          </div>
          <select className="bg-white border border-stone-200 rounded px-4 py-2.5 text-sm text-stone-600 outline-none shadow-sm cursor-pointer hidden md:block">
            <option>Sort: Newest First</option>
            <option>Sort: Most Viewed</option>
            <option>Sort: A-Z</option>
          </select>
          <button className="bg-[#7a2039] text-white px-8 py-2.5 rounded font-medium text-sm hover:bg-[#5a1528] transition cursor-pointer shadow-sm">
            Search
          </button>
        </div>
        <div className="text-xs text-stone-500 font-sans hidden md:block">
          Showing 10 out of 1,248 results
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        
        {/* SIDEBAR FILTERS */}
        <aside className="w-64 bg-[#efe9d9] border-r border-stone-300 hidden md:block font-sans flex-shrink-0">
          <div className="bg-[#7a2039] text-white px-6 py-4 flex justify-between items-center">
            <span className="font-bold text-sm">Refine Results</span>
            <button className="text-xs text-stone-300 hover:text-white cursor-pointer">Clear all</button>
          </div>

          <div className="p-6 space-y-8">
            {/* Year Published */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold tracking-widest text-stone-700">YEAR PUBLISHED</h3>
                <span className="text-[10px] text-stone-500 cursor-pointer hover:text-stone-800">View All</span>
              </div>
              <div className="space-y-3 text-sm text-stone-600">
                <label className="flex items-center gap-3 cursor-pointer text-[#7a2039] font-medium"><input type="checkbox" defaultChecked className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2030 (48)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2029 (312)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2028 (287)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2027 (241)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2026 (186)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> 2025 & Earlier (174)</label>
              </div>
            </div>

            <hr className="border-stone-300" />

            {/* Categories */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold tracking-widest text-stone-700">CATEGORIES</h3>
                <span className="text-[10px] text-stone-500 cursor-pointer hover:text-stone-800">View All</span>
              </div>
              <div className="space-y-3 text-sm text-stone-600">
                <label className="flex items-center gap-3 cursor-pointer text-[#7a2039] font-medium"><input type="checkbox" defaultChecked className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> All Categories (248)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> Health (89)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> Educational (72)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> Web Development (55)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> Artificial Intelligence (55)</label>
                <label className="flex items-center gap-3 cursor-pointer hover:text-stone-900"><input type="checkbox" className="accent-[#7a2039] w-4 h-4 cursor-pointer" /> History (55)</label>
              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS LIST */}
        <main className="flex-1 p-6 md:p-8 flex flex-col gap-6">
          {papers.map((paper) => (
            <div key={paper.id} className={`bg-[#fdfbf7] border border-stone-200 border-l-4 ${paper.borderColor} shadow-sm flex flex-col md:flex-row justify-between p-6 gap-6`}>
              
              <div className="flex-1 font-sans">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 bg-[#f2ead3] border border-[#e5d4a6] text-stone-700 text-[10px] rounded">{paper.category}</span>
                  {paper.isNew && <span className="px-2 py-1 bg-green-700 text-white font-bold text-[9px] rounded">NEW</span>}
                  <span className="text-xs text-stone-500">{paper.year}</span>
                </div>
                
                <h2 className="text-xl font-bold text-stone-900 mb-2 leading-snug font-serif">{paper.title}</h2>
                <p className="text-xs text-stone-500 mb-3">{paper.authors}</p>
                <p className="text-sm text-stone-600 mb-4 leading-relaxed">{paper.abstract}</p>
                
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {paper.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-[#f5f1e6] border border-[#e8dfc8] text-[#8c7435] rounded-full">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end justify-between md:w-40 flex-shrink-0 gap-4">
                <div className="flex flex-col gap-2 w-full font-sans">
                  
                  {/* GI-UPDATE NGA LINK PADULONG SA VIEWER */}
                  <Link to="/viewer" className="w-full py-2 bg-[#7a2039] text-white text-xs text-center rounded hover:bg-[#5a1528] transition cursor-pointer flex items-center justify-center">
                    View Paper
                  </Link>
                  
                  <button className="w-full py-2 bg-white border border-stone-300 text-stone-700 text-xs rounded hover:bg-stone-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                    <span>📌</span> Bookmark
                  </button>
                </div>
                <div className="flex gap-4 text-xs font-medium text-stone-500 font-sans">
                  <span className="text-red-600 flex items-center gap-1">👍 {paper.likes}</span>
                  <span className="flex items-center gap-1">👁️ {paper.views}</span>
                </div>
              </div>

            </div>
          ))}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveBrowse;