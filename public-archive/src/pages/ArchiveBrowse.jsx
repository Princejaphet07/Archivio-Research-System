import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const HighlightedText = ({ text, highlight }) => {
  if (!highlight.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[#d6ad60]/30 text-[#6b142c] dark:bg-[#d6ad60]/40 dark:text-[#f3e5ab] font-bold px-1 rounded-sm">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

function ArchiveBrowse() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.q || '');
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [sortOption, setSortOption] = useState('Newest First');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState(location.state?.dept ? [location.state.dept] : []);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [userBookmarks, setUserBookmarks] = useState([]);
  const [previewPaper, setPreviewPaper] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const toggleYear = (year) => {
    setSelectedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
    setDisplayLimit(5);
  };

  const toggleAbstract = (id) => {
    setExpandedAbstracts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
    setDisplayLimit(5);
  };

  const clearAll = () => {
    setSearchQuery('');
    setSortOption('Newest First');
    setSelectedYears([]);
    setSelectedDepartments([]);
    setDisplayLimit(5);
  };

  useEffect(() => {
    if (location.state?.dept) {
      setSelectedDepartments([location.state.dept]);
      setDisplayLimit(5);
      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state?.dept]);

  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      try {
        const localBookmarks = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
        setUserBookmarks(localBookmarks);
      } catch (e) {
        setUserBookmarks([]);
      }
      return;
    }

    const unsub = onSnapshot(doc(db, 'user_bookmarks', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserBookmarks(docSnap.data().bookmarks || []);
      } else {
        setUserBookmarks([]);
      }
    });

    return () => unsub();
  }, [currentUser]);

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

  const handleBookmarkToggle = async (e, paper) => {
    e.preventDefault();
    const isBookmarked = userBookmarks.includes(paper.id);

    if (isBookmarked) {
      Swal.fire({
        title: 'Already Saved',
        text: 'This paper is already in your bookmarks.',
        icon: 'info',
        confirmButtonColor: '#7a2039'
      });
      return;
    }

    if (!currentUser) {
      // Guest logic
      try {
        let localBookmarks = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
        if (!localBookmarks.includes(paper.id)) {
          localBookmarks.push(paper.id);
          localStorage.setItem('guest_bookmarks', JSON.stringify(localBookmarks));
          setUserBookmarks(localBookmarks);
        }
        Swal.fire({ title: 'Saved!', text: 'Paper saved to your offline Library.', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error('Guest bookmark error:', err);
      }
      return;
    }

    // Authenticated logic
    try {
      const bookmarkRef = doc(db, 'user_bookmarks', currentUser.uid);
      await setDoc(bookmarkRef, { bookmarks: arrayUnion(paper.id) }, { merge: true });
      Swal.fire({ title: 'Saved!', text: 'Paper saved to your Bookmarks.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error('Bookmark error:', err);
      Swal.fire('Error', 'Failed to update bookmarks', 'error');
    }
  };

  const handleShare = async (paper) => {
    const url = `${window.location.origin}/viewer/${paper.id}`;
    const title = paper.researchTitle || paper.title || 'ARCHIVIO Research Paper';
    const text = `Check out this research paper on ARCHIVIO: ${title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: 'Link copied to clipboard!',
        showConfirmButton: false,
        timer: 2000
      });
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

  const paginatedPapers = filteredPapers.slice(0, displayLimit);

  // Calculate popular keywords (Dynamic by Department)
  const getPopularKeywords = () => {
    const counts = {};
    
    // Filter papers by selected department first if any
    const papersToAnalyze = selectedDepartments.length > 0 
      ? publishedPapers.filter(paper => {
          return selectedDepartments.some(dept => {
            const p = (paper.program || paper.category || '').toLowerCase();
            return p.includes(dept.toLowerCase());
          });
        })
      : publishedPapers;

    papersToAnalyze.forEach(paper => {
      let kws = [];
      if (Array.isArray(paper.keywords)) {
        kws = paper.keywords;
      } else if (typeof paper.keywords === 'string') {
        kws = paper.keywords.split(',').map(k => k.trim());
      }
      
      kws.forEach(kw => {
        const k = kw?.trim().toLowerCase();
        if (k) counts[k] = (counts[k] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12) // Top 12 keywords
      .map(([keyword, count]) => ({ keyword, count }));
  };
  const popularKeywords = getPopularKeywords();

  // Calculate Top Researchers
  const getTopResearchers = () => {
    const counts = {};
    publishedPapers.forEach(paper => {
      const authors = (paper.authorDisplay || '').split(',').map(a => a.trim()).filter(a => a);
      authors.forEach(author => {
        if(author.toLowerCase() !== 'unknown author' && author.length > 3) {
          counts[author] = (counts[author] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  };
  const topResearchers = getTopResearchers();

  // Calculate Trending Papers
  const getTrendingPapers = () => {
    return [...publishedPapers]
      .sort((a, b) => {
        const scoreA = (a.views || 0) + ((a.likes?.length || 0) * 5);
        const scoreB = (b.views || 0) + ((b.likes?.length || 0) * 5);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  };
  const trendingPapers = getTrendingPapers();

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0] dark:bg-gray-900 transition-colors">
      <Header />

      {/* TOP SEARCH BAR SECTION */}
      <div className="bg-[#f2ead3] dark:bg-gray-800 px-4 md:px-8 py-4 border-b border-stone-300 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm z-10 transition-colors">
        <div className="flex gap-3 md:gap-4 w-full md:w-auto flex-1 font-sans">
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
          {/* FILTER BUTTON FOR MOBILE */}
          <button 
            onClick={() => setIsMobileFiltersOpen(true)}
            className="md:hidden bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 p-2.5 rounded text-stone-600 dark:text-gray-300 shadow-sm hover:bg-stone-50 dark:hover:bg-gray-600 transition flex items-center justify-center cursor-pointer"
            aria-label="Refine Results"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
          </button>
          
          <select 
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setDisplayLimit(5); }}
            className="bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded px-4 py-2.5 text-sm text-stone-600 dark:text-gray-300 outline-none shadow-sm cursor-pointer hidden md:block transition-colors"
          >
            <option value="Newest First">Sort: Newest First</option>
            <option value="Most Viewed">Sort: Most Viewed</option>
            <option value="Most Liked">Sort: Most Liked</option>
            <option value="A-Z">Sort: A-Z</option>
          </select>
        </div>
        <div className="text-xs text-stone-500 dark:text-gray-400 font-sans hidden md:block">
          Showing {paginatedPapers.length > 0 ? 1 : 0}–{paginatedPapers.length} of {filteredPapers.length} results
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full relative">
        
        {/* Mobile Filter Overlay */}
        {isMobileFiltersOpen && (
          <div className="md:hidden fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileFiltersOpen(false)}></div>
        )}

        {/* SIDEBAR FILTERS */}
        <aside className={`w-72 md:w-64 bg-[#efe9d9] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 font-sans flex-shrink-0 transition-transform duration-300 z-40 fixed md:static top-[57px] left-0 h-[calc(100dvh-57px)] md:h-auto overflow-y-auto md:overflow-visible ${isMobileFiltersOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:block`}>
          <div className="bg-[#7a2039] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <span className="font-bold text-sm">Refine Results</span>
            <div className="flex items-center gap-4">
              <button onClick={clearAll} className="text-xs text-stone-300 hover:text-white cursor-pointer">Clear all</button>
              <button onClick={() => setIsMobileFiltersOpen(false)} className="md:hidden text-white hover:text-stone-300 cursor-pointer p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
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
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
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

            {/* TOP RESEARCHERS */}
            {topResearchers.length > 0 && (
              <div>
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#7a2039] dark:text-[#d6ad60]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Top Researchers
                </h3>
                <div className="flex flex-col gap-2">
                  {topResearchers.map((author, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(author.name);
                        setDisplayLimit(5);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-md hover:border-[#7a2039] dark:hover:border-[#d6ad60] transition-colors cursor-pointer group text-left shadow-sm"
                    >
                      <span className="text-sm font-medium text-stone-700 dark:text-gray-200 group-hover:text-[#7a2039] dark:group-hover:text-[#d6ad60] truncate pr-2">{author.name}</span>
                      <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 px-2 py-0.5 rounded">{author.count} papers</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TRENDING PAPERS */}
            {trendingPapers.length > 0 && (
              <div>
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Trending Now
                </h3>
                <div className="flex flex-col gap-4">
                  {trendingPapers.map((paper) => (
                    <div 
                      key={paper.id}
                      onClick={() => setPreviewPaper(paper)}
                      className="group cursor-pointer bg-white/50 dark:bg-gray-700/50 p-3 rounded-lg border border-stone-100 dark:border-gray-600 hover:border-orange-200 dark:hover:border-orange-900 transition-colors shadow-sm"
                    >
                      <h4 className="text-sm font-bold text-stone-700 dark:text-gray-300 group-hover:text-[#7a2039] dark:group-hover:text-[#f3e5ab] line-clamp-2 leading-snug transition-colors">
                        {paper.researchTitle || paper.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-500 dark:text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                          {paper.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                          {paper.likes?.length || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KEYWORD CLOUD */}
            <div>
              <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm mb-3 uppercase tracking-wider">Popular Keywords ☁️</h3>
              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((item, idx) => {
                  // Calculate font size dynamically based on count (min 10px, max 16px)
                  const fontSize = Math.max(10, Math.min(16, 9 + item.count * 1.5));
                  const isSelected = searchQuery.toLowerCase() === item.keyword.toLowerCase();
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(isSelected ? '' : item.keyword);
                        setDisplayLimit(5);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-1 border rounded-full text-stone-600 dark:text-gray-300 hover:bg-[#7a2039] hover:text-white dark:hover:bg-[#7a2039] transition cursor-pointer shadow-sm capitalize ${isSelected ? 'bg-[#7a2039] text-white border-[#7a2039]' : 'bg-white dark:bg-gray-700 border-stone-200 dark:border-gray-600'}`}
                      style={{ fontSize: fontSize + 'px' }}
                      title={`${item.count} papers`}
                    >
                      {item.keyword}
                    </button>
                  );
                })}
                {popularKeywords.length === 0 && (
                  <span className="text-xs text-stone-400">No keywords found</span>
                )}
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
                  <div key={n} className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-6 sm:p-8 border-l-4 border-l-gray-200 dark:border-l-gray-600">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-6 rounded w-24 animate-shimmer"></div>
                      <div className="h-4 rounded w-32 animate-shimmer"></div>
                    </div>
                    <div className="h-8 rounded w-3/4 mb-3 animate-shimmer"></div>
                    <div className="h-4 rounded w-1/2 mb-6 animate-shimmer"></div>
                    <div className="space-y-2 mb-8">
                      <div className="h-3 rounded w-full animate-shimmer"></div>
                      <div className="h-3 rounded w-5/6 animate-shimmer"></div>
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex gap-4">
                        <div className="h-5 w-10 rounded animate-shimmer"></div>
                        <div className="h-5 w-10 rounded animate-shimmer"></div>
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
                <div key={paper.id} className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/80 dark:border-gray-700/60 rounded-xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(122,32,57,0.15)] dark:hover:shadow-[0_20px_40px_rgba(243,229,171,0.1)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.01] border-l-4 border-l-[#7a2039] dark:border-l-[#f3e5ab] group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7a2039]/5 to-transparent dark:from-[#f3e5ab]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-600 dark:text-gray-300 rounded text-xs font-medium">
                        {paper.program || 'Research'}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-gray-500 font-medium">
                        Published: {new Date(paper.publishedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-stone-900 dark:text-gray-100 mb-2 leading-tight">
                    <HighlightedText text={paper.researchTitle || 'Untitled Research'} highlight={searchQuery} />
                  </h3>
                  
                  <p className="text-sm text-[#7a2039] dark:text-[#f3e5ab] font-medium mb-3">
                    {paper.authorDisplay} • Adviser: {paper.adviserName || 'Unknown'}
                  </p>
                  
                  <div className="mb-4">
                    <p className={`text-sm text-stone-600 dark:text-gray-400 leading-relaxed ${expandedAbstracts[paper.id] ? '' : 'line-clamp-3'}`}>
                      <HighlightedText text={paper.abstract || 'No abstract provided.'} highlight={searchQuery} />
                    </p>
                    {(paper.abstract || '').length > 180 && (
                      <button 
                        onClick={() => toggleAbstract(paper.id)}
                        className="text-[11px] font-bold text-[#7a2039] dark:text-[#f3e5ab] hover:underline mt-1 focus:outline-none uppercase tracking-wide"
                      >
                        {expandedAbstracts[paper.id] ? 'View Less' : 'View More'}
                      </button>
                    )}
                  </div>
                  
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
                      <span onClick={() => handleShare(paper)} className="flex items-center gap-1.5 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] cursor-pointer transition"><span className="text-stone-400 dark:text-gray-500">↗</span> Share</span>
                      <span 
                        onClick={(e) => handleBookmarkToggle(e, paper)} 
                        className={`flex items-center gap-1.5 cursor-pointer transition ${userBookmarks.includes(paper.id) ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'hover:text-[#7a2039] dark:hover:text-[#f3e5ab] text-stone-500 dark:text-gray-400'}`}
                      >
                        {userBookmarks.includes(paper.id) ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        )}
                        Save
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button onClick={() => setPreviewPaper(paper)} className="px-5 py-2 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-700 dark:text-gray-200 text-sm font-medium rounded hover:bg-stone-200 dark:hover:bg-gray-600 transition cursor-pointer text-center sm:text-left w-full sm:w-auto">
                        Quick Preview
                      </button>
                      <Link to={`/viewer/${paper.id}`} className="px-5 py-2 bg-white dark:bg-gray-800 border border-[#7a2039] dark:border-[#f3e5ab] text-[#7a2039] dark:text-[#f3e5ab] text-sm font-medium rounded hover:bg-[#7a2039] hover:text-white dark:hover:bg-[#f3e5ab] dark:hover:text-gray-900 transition cursor-pointer text-center sm:text-left w-full sm:w-auto">
                        Read Full Text
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}

          </div>

          {/* Pagination Placeholder */}
          {!loading && filteredPapers.length > 0 && displayLimit < filteredPapers.length && (
             <div className="flex justify-center mt-12 font-sans">
                <button 
                  onClick={() => setDisplayLimit(p => p + 5)}
                  className="px-8 py-3 rounded-full bg-white dark:bg-gray-800 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(122,32,57,0.15)] hover:-translate-y-1 transition-all duration-300 border border-stone-200 dark:border-gray-700 cursor-pointer flex items-center gap-2"
                >
                  Load More Papers 
                  <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </button>
             </div>
          )}
        </main>
      </div>

      {/* QUICK PREVIEW MODAL */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setPreviewPaper(null)}></div>
          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 dark:border-gray-800 flex justify-between items-start bg-white/50 dark:bg-gray-800/50">
              <div>
                <span className="px-2.5 py-1 bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-300 rounded text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">
                  {previewPaper.program || 'Research'}
                </span>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white font-serif leading-tight">
                  <HighlightedText text={previewPaper.researchTitle || 'Untitled Research'} highlight={searchQuery} />
                </h2>
                <p className="text-[#7a2039] dark:text-[#f3e5ab] font-medium mt-2 text-sm">
                  {previewPaper.authorDisplay} • Adviser: {previewPaper.adviserName || 'Unknown'}
                </p>
              </div>
              <button onClick={() => setPreviewPaper(null)} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-white bg-white/50 dark:bg-gray-800 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700 transition cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <h3 className="font-bold text-stone-800 dark:text-gray-200 uppercase text-xs tracking-wider mb-3">Abstract</h3>
              <p className="text-stone-600 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                <HighlightedText text={previewPaper.abstract || 'No abstract provided.'} highlight={searchQuery} />
              </p>
              
              <div className="mt-8">
                <h3 className="font-bold text-stone-800 dark:text-gray-200 uppercase text-xs tracking-wider mb-3">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {previewPaper.keywords?.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-300 rounded-full text-xs shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-stone-200 dark:border-gray-800 bg-stone-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button onClick={() => setPreviewPaper(null)} className="px-6 py-2.5 rounded font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-gray-800 transition cursor-pointer">
                Close
              </button>
              <Link to={`/viewer/${previewPaper.id}`} className="px-8 py-2.5 bg-[#7a2039] text-white font-bold rounded shadow-lg hover:bg-[#5a1528] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 cursor-pointer">
                Open Full PDF
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ArchiveBrowse;