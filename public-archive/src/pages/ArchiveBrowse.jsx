import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function ArchiveBrowse() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.q || '');
  const [sortOption, setSortOption] = useState('Newest First');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const toggleYear = (year) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
    setCurrentPage(1);
  };

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
    setCurrentPage(1);
  };

  const clearAll = () => {
    setSearchQuery('');
    setSortOption('Newest First');
    setSelectedYears([]);
    setSelectedDepartments([]);
    setCurrentPage(1);
  };

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
        setPublishedPapers([]);
        setTimeout(() => setLoading(false), 800);
        return;
      }

      const enrichedPapers = subsList.map(sub => {
        const group = groupsList.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
        const manuscriptName = sub.documents?.['Final Manuscript']?.name?.replace('.pdf', '');

        return {
          ...sub,
          researchTitle: group?.researchTitle || sub.researchTitle || sub.title || manuscriptName,
          groupName: group?.groupName || sub.groupName,
          adviserName: group?.adviserName || sub.adviserName,
          program: group?.program || sub.program,
          authorDisplay: group 
            ? [group.leaderName, ...(group.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
            : sub.studentName || 'Unknown Author'
        };
      });

      setPublishedPapers(enrichedPapers);
      setTimeout(() => setLoading(false), 800);
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
    const author = (paper.authorDisplay || '').toLowerCase();
    const keywords = (paper.keywords || []).join(' ').toLowerCase();
    const matchesSearch = title.includes(q) || author.includes(q) || keywords.includes(q);
    
    // Year filter logic
    const pubYear = new Date(paper.publishedAt || paper.createdAt || Date.now()).getFullYear().toString();
    const matchesYear = selectedYears.length === 0 || selectedYears.includes(pubYear);
    
    // Department filter logic
    const matchesDept = selectedDepartments.length === 0 || selectedDepartments.some(dept => {
      const p = (paper.program || paper.category || '').toLowerCase();
      return p.includes(dept.toLowerCase());
    });
    
    return matchesSearch && matchesYear && matchesDept;
  }).sort((a, b) => {
    if (sortOption === 'Newest First') {
      return new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0);
    }
    if (sortOption === 'A-Z') {
      const titleA = a.researchTitle || a.title || '';
      const titleB = b.researchTitle || b.title || '';
      return titleA.localeCompare(titleB);
    }
    if (sortOption === 'Most Viewed') {
      return (b.views || 0) - (a.views || 0);
    }
    if (sortOption === 'Most Liked') {
      return (b.likes?.length || 0) - (a.likes?.length || 0);
    }
    return 0;
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
            <span className="absolute left-3 top-2.5 text-stone-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
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
            onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
            className="bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded px-4 py-2.5 text-sm text-stone-600 dark:text-gray-300 outline-none shadow-sm cursor-pointer hidden md:block transition-colors"
          >
            <option value="Newest First">Sort: Newest First</option>
            <option value="Most Viewed">Sort: Most Viewed</option>
            <option value="Most Liked">Sort: Most Liked</option>
            <option value="A-Z">Sort: A-Z</option>
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
            <button onClick={clearAll} className="text-xs text-stone-300 hover:text-white cursor-pointer">Clear all</button>
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
                {['2026', '2025', '2024', '2023', '2022'].map(year => (
                  <label key={year} className="flex items-center gap-3 text-sm text-stone-700 dark:text-gray-300 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-[#7a2039] cursor-pointer"
                      checked={selectedYears.includes(year)}
                      onChange={() => toggleYear(year)}
                    />
                    <span className="group-hover:text-[#7a2039] transition">{year}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider">Department</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {['Computer Science', 'Information Technology', 'Nursing', 'Business', 'Education', 'Engineering', 'Architecture', 'Pharmacy'].map(dept => (
                  <label key={dept} className="flex items-center gap-3 text-sm text-stone-700 dark:text-gray-300 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-[#7a2039] cursor-pointer"
                      checked={selectedDepartments.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                    />
                    <span className="group-hover:text-[#7a2039] transition">{dept}</span>
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
              <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-6 sm:p-8 border-l-4 border-l-gray-200 dark:border-l-gray-600 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                    <div className="space-y-2 mb-8">
                      <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-5/6"></div>
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex gap-4">
                        <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="h-10 w-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                ))}
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
                        className="flex items-center gap-1.5 text-stone-500 hover:text-rose-500 cursor-pointer transition-transform"
                      >
                        {paper.likes?.includes(currentUser?.uid) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-500"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        )}
                        {paper.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1.5 cursor-default">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-stone-400 dark:text-gray-500"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                        {paper.views || 0}
                      </span>
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