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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 rounded bg-white border border-stone-200 outline-none focus:border-[#7a2039] text-sm text-stone-700 shadow-sm"
            />
          </div>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-white border border-stone-200 rounded px-4 py-2.5 text-sm text-stone-600 outline-none shadow-sm cursor-pointer hidden md:block"
          >
            <option>Sort: Newest First</option>
            <option>Sort: Most Viewed</option>
            <option>Sort: A-Z</option>
          </select>
        </div>
        <div className="text-xs text-stone-500 font-sans hidden md:block">
          Showing {filteredPapers.length} out of {publishedPapers.length} results
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
            <div>
              <h3 className="font-bold text-stone-800 text-sm mb-3 uppercase tracking-wider">Access Type</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer group">
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
              <h3 className="font-bold text-stone-800 text-sm mb-3 uppercase tracking-wider">Publication Year</h3>
              <div className="space-y-2">
                {['2026', '2025', '2024', '2023'].map(year => (
                  <label key={year} className="flex items-center gap-3 text-sm text-stone-700 cursor-pointer group">
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
              <div className="text-center py-20 text-stone-500">Loading archives...</div>
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-20 text-stone-500 border-2 border-dashed border-stone-300 rounded-2xl bg-white">
                <p className="text-lg font-bold text-stone-700">No results found.</p>
                <p className="text-sm mt-2">Try adjusting your search or filters.</p>
              </div>
            ) : (
              filteredPapers.map((paper) => (
                <div key={paper.id} className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-stone-200 transition-all border-l-4 border-[#7a2e46]`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-stone-100 border border-stone-200 text-stone-600 rounded text-xs font-medium">
                        {paper.program || 'Research'}
                      </span>
                      <span className="text-xs text-stone-400 font-medium">
                        Published: {new Date(paper.publishedAt || Date.now()).getFullYear()}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-stone-900 mb-2 leading-tight">
                    {paper.researchTitle || 'Untitled Research'}
                  </h3>
                  
                  <p className="text-sm text-[#7a2039] font-medium mb-3">
                    {paper.authorDisplay} • Adviser: {paper.adviserName || 'Unknown'}
                  </p>
                  
                  <p className="text-sm text-stone-600 mb-4 line-clamp-3 leading-relaxed">
                    {paper.abstract || 'No abstract provided.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {paper.keywords?.slice(0, 4).map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-[#fcfbf7] border border-stone-200 text-stone-500 rounded-full text-xs hover:bg-stone-100 cursor-pointer transition">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-stone-100 pt-4">
                    <div className="flex gap-4 text-xs font-medium text-stone-500">
                      <span 
                        onClick={(e) => handleLike(e, paper)} 
                        className="flex items-center gap-1.5 text-red-700 hover:scale-110 cursor-pointer transition-transform"
                      >
                        {paper.likes?.includes(currentUser?.uid) ? '❤️' : '🤍'} {paper.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1.5 cursor-default"><span className="text-stone-400">👁</span> {paper.views || 0}</span>
                      <span className="flex items-center gap-1.5 hover:text-[#7a2039] cursor-pointer transition"><span className="text-stone-400">↗</span> Share</span>
                    </div>
                    <Link to={`/viewer/${paper.id}`} className="px-5 py-2 bg-white border border-[#7a2039] text-[#7a2039] text-sm font-medium rounded hover:bg-[#7a2039] hover:text-white transition cursor-pointer">
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
                <button className="w-10 h-10 rounded border border-stone-200 bg-white text-stone-400 hover:bg-stone-50">‹</button>
                <button className="w-10 h-10 rounded bg-[#7a2039] text-white font-bold">1</button>
                <button className="w-10 h-10 rounded border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-medium">2</button>
                <button className="w-10 h-10 rounded border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-medium">3</button>
                <span className="w-10 h-10 flex items-center justify-center text-stone-400">...</span>
                <button className="w-10 h-10 rounded border border-stone-200 bg-white text-stone-400 hover:bg-stone-50">›</button>
              </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default ArchiveBrowse;