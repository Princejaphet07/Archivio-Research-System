import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import heroBg from '../assets/Hero.png'; 
import Header from '../components/Header';
import Footer from '../components/Footer'; 
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

function ArchiveHome() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const [stats, setStats] = useState({
    papers: 0,
    authors: 0,
    departments: 0,
    advisers: 0
  });

  useEffect(() => {
    // Fetch published submissions
    const qSubs = query(
      collection(db, 'submissions'),
      where('reviewStatus', '==', 'published')
    );

    // Fetch groups
    const qGroups = query(collection(db, 'groups'));

    let subsList = [];
    let groupsList = [];

    const computeData = () => {
      if (!subsList.length) return;

      const enrichedPapers = subsList.map(sub => {
        const group = groupsList.find(g => g.leaderUid === sub.studentUid);
        return {
          ...sub,
          researchTitle: group?.researchTitle || sub.researchTitle || sub.title,
          groupName: group?.groupName || sub.groupName,
          adviserName: group?.adviserName || sub.adviserName,
          program: group?.program || sub.program,
          authorDisplay: group 
            ? `${group.leaderName}${group.members && group.members.length > 0 ? ` & ${group.members.length} other(s)` : ''}`
            : sub.studentName || 'Unknown Author'
        };
      });

      // Sort newest first client-side
      const sortedPapers = enrichedPapers.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      setPublishedPapers(sortedPapers);

      // Compute stats
      const uniqueAuthors = new Set();
      const uniqueAdvisers = new Set();
      const uniqueDepartments = new Set();

      enrichedPapers.forEach(p => {
        if (p.studentUid) uniqueAuthors.add(p.studentUid);
        if (p.adviserName) uniqueAdvisers.add(p.adviserName);
        if (p.program) uniqueDepartments.add(p.program);
      });

      setStats({
        papers: enrichedPapers.length,
        authors: uniqueAuthors.size,
        departments: uniqueDepartments.size || 1, // Fallback to at least 1 if program missing
        advisers: uniqueAdvisers.size
      });
    };

    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      subsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeData();
    });

    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      groupsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeData();
    });

    return () => {
      unsubSubs();
      unsubGroups();
    };
  }, []);

  const categories = [
    { name: "Web Development", papers: "12 papers" },
    { name: "Health & Wellness", papers: "8 papers" },
    { name: "Artificial Intelligence", papers: "5 papers" },
    { name: "Information Technology", papers: "14 papers" },
    { name: "Business", papers: "9 papers" },
  ];

  return (
    <div className="font-serif min-h-screen bg-[#faf7f0]">
      <Header />

      {/* HERO SECTION */}
      <div className="relative h-[550px] flex flex-col items-center justify-center text-center px-4"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 space-y-4">
          <p className="text-amber-200 tracking-[0.2em] text-xs font-sans uppercase">SWU PHINMA • Research Archive</p>
          <h1 className="text-7xl font-bold tracking-widest text-[#f3e5ab] mt-2 mb-4 drop-shadow-lg">ARCHIVIO</h1>
          <h2 className="text-xl text-amber-100 italic">Research Archive Management System</h2>
          <p className="text-sm text-stone-200 max-w-2xl mx-auto font-sans leading-relaxed mt-4 drop-shadow-md">
            Discover peer-reviewed research, theses, and academic manuscripts from SWU PHINMA students and faculty.
          </p>
          <div className="flex bg-white rounded-md p-1 mt-8 max-w-3xl mx-auto shadow-2xl font-sans w-full">
            <div className="flex items-center px-4 text-stone-400">🔍</div>
            <input type="text" placeholder="Search by title, author, keywords, department..." className="w-full py-3 px-2 outline-none text-stone-700" />
            <button className="bg-[#6b142c] text-white px-8 py-2 rounded hover:bg-[#4a0d1e] transition font-medium cursor-pointer">Search</button>
          </div>
          <div className="flex justify-center items-center space-x-3 mt-6 text-xs font-sans">
            <span className="text-stone-300">Popular:</span>
            {['Computer Science', 'Business', 'Nursing', 'Education', 'Engineering'].map(tag => (
              <span key={tag} className="px-3 py-1 border border-amber-200/40 text-amber-100 rounded-full cursor-pointer hover:bg-amber-200/20 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* STATS RIBBON */}
      <div className="bg-[#6b142c] text-white py-10 px-12 grid grid-cols-4 text-center divide-x divide-white/10 shadow-inner">
        <div><h3 className="text-4xl font-bold text-[#f3e5ab] mb-2">{stats.papers}</h3><p className="text-xs font-sans text-stone-300 uppercase tracking-wider">Papers Archived</p></div>
        <div><h3 className="text-4xl font-bold text-[#f3e5ab] mb-2">{stats.authors}</h3><p className="text-xs font-sans text-stone-300 uppercase tracking-wider">Student Authors</p></div>
        <div><h3 className="text-4xl font-bold text-[#f3e5ab] mb-2">{stats.departments}</h3><p className="text-xs font-sans text-stone-300 uppercase tracking-wider">Departments</p></div>
        <div><h3 className="text-4xl font-bold text-[#f3e5ab] mb-2">{stats.advisers}</h3><p className="text-xs font-sans text-stone-300 uppercase tracking-wider">Faculty Advisers</p></div>
      </div>

      {/* LATEST RESEARCH */}
      <div className="px-16 py-16 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-1">Recently Approved</p>
            <h2 className="text-3xl font-bold text-[#3d0c1b]">Latest Research</h2>
          </div>
          <Link to="/browse" className="px-5 py-2 border border-[#3d0c1b] text-[#3d0c1b] text-sm font-sans rounded hover:bg-[#3d0c1b] hover:text-white transition inline-block">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {publishedPapers.slice(0, 3).map((paper, idx) => (
            <div key={paper.id} className="bg-[#f2ead3] rounded-xl p-6 shadow-md border border-[#e5d4a6] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 text-xs text-stone-600">
                  <span className="px-2 py-1 border border-stone-300 rounded bg-[#e8debe] truncate max-w-[150px]">
                    {paper.program || 'Research'}
                  </span>
                  <span>{new Date(paper.publishedAt || Date.now()).getFullYear()}</span>
                </div>
                <h3 className="font-bold text-lg text-stone-900 mb-2 leading-snug line-clamp-3" title={paper.researchTitle || 'Untitled Research'}>
                  {paper.researchTitle || 'Untitled Research'}
                </h3>
                <p className="text-xs text-stone-600 mb-1 line-clamp-1" title={paper.authorDisplay}>{paper.authorDisplay}</p>
                <p className="text-[11px] text-stone-500 italic">Adviser: {paper.adviserName || 'Unknown'}</p>
                <div className="flex gap-2 mt-4 text-[10px] flex-wrap">
                  {paper.keywords?.slice(0, 3).map(kw => (
                    <span key={kw} className="px-2 py-1 bg-stone-200/50 rounded-full border border-stone-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center mt-8">
                <div className="text-xs text-stone-500 flex gap-3 font-medium">
                  <span className="text-red-700">❤️ {Math.floor(Math.random() * 50) + 10}</span> 
                  <span>👁️ {Math.floor(Math.random() * 500) + 100}</span>
                </div>
                <Link to={`/viewer/${paper.id}`} className="px-5 py-2 bg-[#3d0c1b] text-white text-xs rounded hover:bg-[#24050f] transition cursor-pointer inline-block">
                  View Paper
                </Link>
              </div>
            </div>
          ))}

          {publishedPapers.length === 0 && (
            <div className="col-span-3 text-center py-12 text-stone-500">
              No published research available yet.
            </div>
          )}
        </div>
      </div>

      {/* BROWSE CATEGORIES SECTION */}
      <div className="bg-[#f2ead3] px-8 md:px-16 py-16 border-t border-[#e5d4a6]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
            <div>
              <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-1">Explore by Category</p>
              <h2 className="text-3xl font-bold text-[#3d0c1b] border-b-2 border-[#d6ad60] inline-block pb-1">Browse Categories</h2>
            </div>
            <Link to="/browse" className="text-sm text-[#3d0c1b] hover:text-[#8c7435] font-sans font-medium transition mb-1 md:ml-4">
              All Department ↓
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 font-sans snap-x">
            {categories.map((cat, index) => (
              <Link to="/browse" key={index} className="min-w-[200px] h-24 bg-[#fcfbf7] shadow-sm hover:shadow-md border border-stone-200 border-l-4 border-l-[#6b142c] rounded-r-lg p-4 flex flex-col justify-between cursor-pointer transition-all snap-start block">
                <h3 className="font-bold text-stone-800 text-sm">{cat.name}</h3>
                <div className="flex justify-between items-center text-xs text-stone-500">
                  <span>{cat.papers}</span>
                  <span className="text-[#8c7435]">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveHome;