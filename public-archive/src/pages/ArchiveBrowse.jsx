import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function ArchiveBrowse() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Newest First');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { currentUser } = useAuth();

  const handleLike = async (e, paper) => {
    e.preventDefault();
    if (!currentUser) {
      Swal.fire('Login Required', 'Please log in to like a research paper.', 'info');
      return;
    }
    const paperRef = doc(db, 'submissions', paper.id);
    const likes = paper.likes || [];
    if (likes.includes(currentUser.uid)) {
      await updateDoc(paperRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(paperRef, { likes: arrayUnion(currentUser.uid) });
    }
  };

  useEffect(() => {
    const qSubs = query(
      collection(db, 'submissions'),
      where('reviewStatus', '==', 'published')
    );
    const qGroups = query(collection(db, 'groups'));

    let subsList = [];
    let groupsList = [];

    const computeData = () => {
      if (!subsList.length) {
        setLoading(false);
        return;
      }

      const enrichedPapers = subsList.map(sub => {
        const group = groupsList.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.researchTitle || sub.title)));
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

      setPublishedPapers(enrichedPapers);
      setLoading(false);
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

  // Filter & Sort
  const filteredPapers = publishedPapers.filter(paper => {
    const q = searchQuery.toLowerCase();
    const title = (paper.researchTitle || paper.title || '').toLowerCase();
    const author = (paper.studentName || '').toLowerCase();
    const keywords = (paper.keywords || []).join(' ').toLowerCase();
    return title.includes(q) || author.includes(q) || keywords.includes(q);
  }).sort((a, b) => {
    if (sortOption === 'Newest First') {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    }
    if (sortOption === 'A-Z') {
      const titleA = a.researchTitle || a.title || '';
      const titleB = b.researchTitle || b.title || '';
      return titleA.localeCompare(titleB);
    }
    return 0; // Most Viewed would require an analytics field, placeholder for now
  });

  const totalPages = Math.max(1, Math.ceil(filteredPapers.length / ITEMS_PER_PAGE));
  const paginatedPapers = filteredPapers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0] dark:bg-gray-900 transition-colors">
      <Header />

      {/* TOP SEARCH BAR SECTION */}
      <div className="bg-[#f2ead3] dark:bg-gray-800 px-8 py-4 border-b border-stone-300 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-10 transition-colors">
        <div className="flex gap-4 w-full md:w-auto flex-1 font-sans">
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search title, author, keywords..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 rounded bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 outline-none focus:border-[#7a2039] text-sm text-stone-700 dark:text-gray-200 shadow-sm transition-colors"
            />
          </div>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded px-4 py-2.5 text-sm text-stone-600 dark:text-gray-300 outline-none shadow-sm cursor-pointer hidden md:block transition-colors"
          >
            <option>Sort: Newest First</option>
            <option>Sort: Most Viewed</option>
            <option>Sort: A-Z</option>
          </select>
        </div>
        <div className="text-xs text-stone-500 dark:text-gray-400 font-sans hidden md:block">
          Showing {paginatedPapers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPapers.length)} of {filteredPapers.length} results
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        
        {/* SIDEBAR FILTERS */}
        <aside className="w-64 bg-[#efe9d9] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 hidden md:block font-sans flex-shrink-0 transition-colors">
          <div className="bg-[#7a2039] text-white px-6 py-4 flex justify-between items-center">
            <span className="font-bold text-sm">Refine Results</span>
            <button className="text-xs text-stone-300 hover:text-white cursor-pointer">Clear all</button>
          </div>

          <div className="p-6 space-y-8">
            <div>
              <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider">Access Type</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm text-stone-700 dark:text-gray-300 cursor-pointer group">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#7a2039] cursor-pointer" />
                  <span className="group-hover:text-[#7a2039] transition">Open Access</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 accent-[#7a2039] cursor-pointer" />
                  <span className="group-hover:text-[#7a2039] transition">Restricted (SWU Only)</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider">Publication Year</h3>
              <div className="space-y-2">
                {['2026', '2025', '2024', '2023'].map(year => (
                  <label key={year} className="flex items-center gap-3 text-sm text-stone-700 dark:text-gray-300 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 accent-[#7a2039] cursor-pointer" />
                    <span className="group-hover:text-[#7a2039] transition">{year}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS FEED */}
        <main className="flex-1 p-6 md:p-10 font-sans max-w-4xl">
          <div className="space-y-6">
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Archives...</p>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="py-20 text-center text-stone-500 dark:text-gray-400">
                <span className="text-4xl mb-4 block">📄</span>
                <p>No research papers match your filters.</p>
              </div>
            ) : (
              paginatedPapers.map((paper) => (
                <div key={paper.id} className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-6 sm:p-8 hover:shadow-lg hover:border-stone-300 dark:hover:border-gray-600 transition-all border-l-4 border-l-[#7a2e46]">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-600 dark:text-gray-300 rounded text-xs font-medium">
                        {paper.program || 'Research'}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-gray-500 font-medium">
                        Published: {new Date(paper.publishedAt || Date.now()).getFullYear()}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-stone-900 dark:text-gray-100 mb-2 leading-tight">
                    {paper.researchTitle || 'Untitled Research'}
                  </h3>
                  
                  <p className="text-sm text-[#7a2039] dark:text-[#f3e5ab] font-medium mb-3">
                    {paper.authorDisplay} • Adviser: {paper.adviserName || 'Unknown'}
                  </p>
                  
                  <p className="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                    {paper.abstract || 'No abstract provided.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {paper.keywords?.slice(0, 4).map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-[#fcfbf7] dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-500 dark:text-gray-300 rounded-full text-xs hover:bg-stone-100 dark:hover:bg-gray-600 cursor-pointer transition">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-stone-100 dark:border-gray-700 pt-4 gap-4 sm:gap-0">
                    <div className="flex gap-4 text-xs font-medium text-stone-500 dark:text-gray-400">
                      <span 
                        onClick={(e) => handleLike(e, paper)} 
                        className="flex items-center gap-1.5 text-red-700 cursor-pointer transition-transform"
                      >
                        {paper.likes?.includes(currentUser?.uid) ? '❤️' : '🤍'} {paper.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1.5 cursor-default"><span className="text-stone-400 dark:text-gray-500">👁</span> {paper.views || 0}</span>
                      <span className="flex items-center gap-1.5 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] cursor-pointer transition"><span className="text-stone-400 dark:text-gray-500">↗</span> Share</span>
                    </div>
                    <Link to={`/viewer/${paper.id}`} className="px-5 py-2 bg-white dark:bg-gray-800 border border-[#7a2039] dark:border-[#f3e5ab] text-[#7a2039] dark:text-[#f3e5ab] text-sm font-medium rounded hover:bg-[#7a2039] hover:text-white dark:hover:bg-[#f3e5ab] dark:hover:text-gray-900 transition cursor-pointer text-center sm:text-left w-full sm:w-auto">
                      Read Full Text
                    </Link>
                  </div>
                </div>
              ))
            )}

          </div>

          {/* Pagination Placeholder */}
          {!loading && filteredPapers.length > 0 && (
             <div className="flex justify-center mt-12 gap-2 font-sans">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded font-medium transition-colors ${
                      currentPage === page 
                        ? 'bg-[#7a2039] text-white font-bold border-none' 
                        : 'border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700'
                    }`}
                  >{page}</button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >›</button>
             </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveBrowse;