import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { normalizeDepartment } from '../utils/normalizeDepartment';
import {
  trackSearch,
  trackDepartmentFilter,
  trackYearFilter,
  trackBookmark,
  trackCitation
} from '../utils/analytics';
import { useNetworkStatus } from '../components/NetworkStatusPill';

const preloadViewer = () => {
  try {
    import('./ArchivePaperViewer');
  } catch (_) {}
};

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
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [publishedPapers, setPublishedPapers] = useState([]);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.q || '');
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [sortOption, setSortOption] = useState(location.state?.sort || 'Newest First');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState(location.state?.dept ? [normalizeDepartment(location.state.dept)] : []);
  const [selectedCategories, setSelectedCategories] = useState(location.state?.category ? [location.state.category] : []);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);
  const lastTrackedQueryRef = useRef('');
  const [userBookmarks, setUserBookmarks] = useState([]);
  const [previewPaper, setPreviewPaper] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const currentDate = useMemo(() => Date.now(), []);

  const toggleYear = (year) => {
    setSelectedYears(prev => {
      const willInclude = !prev.includes(year);
      if (willInclude) trackYearFilter(year);
      return willInclude ? [...prev, year] : prev.filter(y => y !== year);
    });
    setDisplayLimit(5);
  };

  const toggleAbstract = (id) => {
    setExpandedAbstracts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDepartment = (dept) => {
    const normDept = normalizeDepartment(dept);
    setSelectedDepartments(prev => {
      const isAlready = prev.some(d => normalizeDepartment(d) === normDept);
      if (!isAlready) trackDepartmentFilter(normDept);
      return isAlready
        ? prev.filter(d => normalizeDepartment(d) !== normDept)
        : [...prev, normDept];
    });
    setDisplayLimit(5);
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => {
      const isAlready = prev.some(c => c.toLowerCase().trim() === cat.toLowerCase().trim());
      return isAlready
        ? prev.filter(c => c.toLowerCase().trim() !== cat.toLowerCase().trim())
        : [...prev, cat];
    });
    setDisplayLimit(5);
  };

  const clearAll = () => {
    setSearchQuery('');
    setSortOption('Newest First');
    setSelectedYears([]);
    setSelectedDepartments([]);
    setSelectedCategories([]);
    setDisplayLimit(5);
  };

  useEffect(() => {
    if (location.state?.category) {
      setSelectedCategories([location.state.category]);
      setDisplayLimit(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (location.state?.dept) {
      setSelectedDepartments([location.state.dept]);
      setDisplayLimit(5);
      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (location.state?.sort) {
      setSortOption(location.state.sort);
    }
    if (location.state?.q !== undefined) {
      setSearchQuery(location.state.q);
      setDisplayLimit(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state?.category, location.state?.dept, location.state?.sort, location.state?.q]);

  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setUserBookmarks([]);
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
      Swal.fire({
        title: 'Sign In Required',
        text: 'Please log in with your @phinmaed.com account to like research papers.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#7a2039',
        confirmButtonText: 'Log In Now',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'dark:bg-gray-800 dark:text-gray-100',
          title: 'dark:text-gray-100'
        }
      }).then((res) => {
        if (res.isConfirmed) {
          navigate('/login');
        }
      });
      return;
    }
    const paperRef = doc(db, 'submissions', paper.id);
    const likes = paper.likes || [];
    const userInfo = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      email: currentUser.email || ''
    };
    if (likes.includes(currentUser.uid)) {
      const existingLikedUser = (paper.likedUsers || []).find(u => u.uid === currentUser.uid);
      const updates = { likes: arrayRemove(currentUser.uid) };
      if (existingLikedUser) {
        updates.likedUsers = arrayRemove(existingLikedUser);
      } else {
        updates.likedUsers = arrayRemove(userInfo);
      }
      await updateDoc(paperRef, updates);
    } else {
      await updateDoc(paperRef, { 
        likes: arrayUnion(currentUser.uid),
        likedUsers: arrayUnion(userInfo)
      });
    }
  };

  const handleBookmarkToggle = async (e, paper) => {
    e.preventDefault();

    if (!currentUser) {
      Swal.fire({
        title: 'Sign In Required',
        text: 'Please log in or sign up with your @phinmaed.com account to save research papers to your Bookmarks.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#7a2039',
        confirmButtonText: 'Log In Now',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'dark:bg-gray-800 dark:text-gray-100',
          title: 'dark:text-gray-100'
        }
      }).then((res) => {
        if (res.isConfirmed) {
          navigate('/login');
        }
      });
      return;
    }

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

    trackBookmark(paper, 'add');

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

  const handleViewPaper = (e, paperId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser) {
      Swal.fire({
        title: 'Sign In Required',
        text: 'Please log in or sign up with your @phinmaed.com account to view and read full research manuscripts.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#7a2039',
        confirmButtonText: 'Log In Now',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'dark:bg-gray-800 dark:text-gray-100',
          title: 'dark:text-gray-100'
        }
      }).then((res) => {
        if (res.isConfirmed) {
          navigate('/login', { state: { from: { pathname: `/viewer/${paperId}` } } });
        }
      });
      return;
    }
    navigate(`/viewer/${paperId}`);
  };

  const handleShare = async (paper) => {
    trackCitation(paper, 'Share');
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
    // Attempt instant load from cache if offline
    const cached = localStorage.getItem('archivio_cached_browse_papers');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPublishedPapers(parsed);
          if (!navigator.onLine) {
            setLoading(false);
          }
        }
      } catch (_) {}
    }

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
        const group = groupsList.find(g => 
          (g.id && (g.id === sub.groupId || g.id === sub.id)) ||
          (g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle))) ||
          (sub.groupName && g.groupName === sub.groupName)
        );
        const manuscriptName = sub.documents?.['Final Manuscript']?.name?.replace('.pdf', '');

        return {
          ...sub,
          researchTitle: group?.researchTitle || sub.researchTitle || sub.title || manuscriptName,
          groupName: group?.groupName || sub.groupName,
          adviserName: group?.adviserName || sub.adviserName,
          program: group?.program || sub.program,
          department: group?.department || sub.department,
          category: group?.category || sub.category || 'General',
          authorDisplay: group
            ? [group.leaderName, ...(group.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
            : sub.studentName || 'Unknown Author'
        };
      });

      setPublishedPapers(enrichedPapers);
      if (enrichedPapers.length > 0) {
        try {
          localStorage.setItem('archivio_cached_browse_papers', JSON.stringify(enrichedPapers));
        } catch (_) {}
      }
      setTimeout(() => setLoading(false), 800);
    };

    const handleOfflineFallback = (err) => {
      console.warn("Browse offline fallback triggered:", err);
      const cachedFallback = localStorage.getItem('archivio_cached_browse_papers');
      if (cachedFallback) {
        try {
          setPublishedPapers(JSON.parse(cachedFallback));
        } catch (_) {}
      }
      setLoading(false);
    };

    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      subsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeData();
    }, handleOfflineFallback);

    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      groupsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      computeData();
    }, handleOfflineFallback);

    // Fetch categories created by advisers in real-time
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.name);
      setDbCategories(cats);
    }, (err) => {
      console.warn("Categories fetch error in Browse:", err);
    });

    return () => {
      unsubSubs();
      unsubGroups();
      unsubCats();
    };
  }, []);

  // Dynamic categories aggregated from adviser configurations in DB and published papers
  const availableCategories = useMemo(() => {
    const catMap = new Map();

    // 1. Categories created in DB by advisers
    dbCategories.forEach(c => {
      const name = (c.name || '').trim();
      if (name && !catMap.has(name.toLowerCase())) {
        catMap.set(name.toLowerCase(), {
          name,
          icon: c.icon || '🏷️'
        });
      }
    });

    // 2. Add categories found in published papers
    publishedPapers.forEach(p => {
      const cat = (p.category || '').trim();
      if (cat && !catMap.has(cat.toLowerCase())) {
        catMap.set(cat.toLowerCase(), {
          name: cat,
          icon: '🏷️'
        });
      }
    });

    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCategories, publishedPapers]);

  // Filter & Sort
  const filteredPapers = publishedPapers.filter(paper => {
    const q = (searchQuery || '').trim().toLowerCase();
    const title = (paper.researchTitle || paper.title || '').toLowerCase();
    const author = (paper.authorDisplay || '').toLowerCase();
    const keywords = (paper.keywords || []).join(' ').toLowerCase();
    const program = (paper.program || paper.department || paper.category || '').toLowerCase();
    const matchesSearch = !q || title.includes(q) || author.includes(q) || keywords.includes(q) || program.includes(q);

    // Year filter logic
    const pubYear = new Date(paper.publishedAt || paper.createdAt || currentDate).getFullYear().toString();
    const matchesYear = selectedYears.length === 0 || selectedYears.includes(pubYear);

    // Department filter logic
    const matchesDept = selectedDepartments.length === 0 || selectedDepartments.some(dept => {
      const targetDept = normalizeDepartment(dept).toLowerCase();
      const normPaperDept = normalizeDepartment(paper.program || paper.department).toLowerCase();
      return normPaperDept === targetDept;
    });

    // Category filter logic (Adviser Research Category)
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(cat => {
      const paperCat = (paper.category || '').toLowerCase().trim();
      return paperCat === cat.toLowerCase().trim();
    });

    return matchesSearch && matchesYear && matchesDept && matchesCategory;
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

  // Google Analytics: Track search queries (debounced and de-duplicated to log exactly once)
  useEffect(() => {
    const trimmed = (searchQuery || '').trim();
    if (!trimmed || trimmed.length < 2) return;
    if (loading) return; // Wait until papers have loaded so filteredPapers.length is exact
    if (lastTrackedQueryRef.current.toLowerCase() === trimmed.toLowerCase()) return;

    const timeout = setTimeout(() => {
      lastTrackedQueryRef.current = trimmed;
      trackSearch(trimmed, filteredPapers.length);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [searchQuery, filteredPapers.length, loading]);

  // Calculate popular keywords (Dynamic by Department)
  const getPopularKeywords = () => {
    const counts = {};

    // Filter papers by selected department first if any
    const papersToAnalyze = selectedDepartments.length > 0
      ? publishedPapers.filter(paper => {
        const normPaperDept = normalizeDepartment(paper.program || paper.department || paper.category).toLowerCase();
        return selectedDepartments.some(dept => normalizeDepartment(dept).toLowerCase() === normPaperDept);
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
        if (author.toLowerCase() !== 'unknown author' && author.length > 3) {
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
        <div className="flex items-center gap-3">
          <div className="text-xs text-stone-500 dark:text-gray-400 font-sans hidden md:block">
            Showing {paginatedPapers.length > 0 ? 1 : 0}–{paginatedPapers.length} of {filteredPapers.length} results
          </div>
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
            {/* YEAR PUBLISHED */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">YEAR PUBLISHED</h3>
                <button onClick={() => setSelectedYears([])} className="text-[11px] text-stone-500 hover:text-[#7a2039] cursor-pointer">View All</button>
              </div>
              <div className="space-y-2">
                {['2030', '2029', '2028', '2027', '2026', '2025'].map(year => {
                  const count = publishedPapers.filter(p => new Date(p.publishedAt || p.createdAt || currentDate).getFullYear().toString() === year).length;
                  const isChecked = selectedYears.includes(year);
                  return (
                    <label key={year} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-stone-300 text-[#7a2039] accent-[#7a2039] cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleYear(year)}
                      />
                      <span className={`group-hover:text-[#7a2039] transition ${isChecked ? 'font-semibold text-[#7a2039]' : ''}`}>
                        {year} <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* RESEARCH CATEGORIES (Set by Adviser) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">RESEARCH CATEGORIES</h3>
                <button onClick={() => { setSelectedCategories([]); setDisplayLimit(5); }} className="text-[11px] text-stone-500 hover:text-[#7a2039] cursor-pointer">View All</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-[#7a2039] accent-[#7a2039] cursor-pointer"
                    checked={selectedCategories.length === 0}
                    onChange={() => { setSelectedCategories([]); setDisplayLimit(5); }}
                  />
                  <span className={`group-hover:text-[#7a2039] transition ${selectedCategories.length === 0 ? 'font-semibold text-[#7a2039]' : ''}`}>
                    All Categories <span className="text-stone-400 dark:text-stone-500 font-normal">({publishedPapers.length})</span>
                  </span>
                </label>

                {availableCategories.map(catItem => {
                  const count = publishedPapers.filter(p => (p.category || '').toLowerCase().trim() === catItem.name.toLowerCase().trim()).length;
                  const isChecked = selectedCategories.some(c => c.toLowerCase().trim() === catItem.name.toLowerCase().trim());
                  return (
                    <label key={catItem.name} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-stone-300 text-[#7a2039] accent-[#7a2039] cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleCategory(catItem.name)}
                      />
                      <span className={`group-hover:text-[#7a2039] transition flex items-center gap-1.5 truncate ${isChecked ? 'font-semibold text-[#7a2039]' : ''}`}>
                        <span>{catItem.icon || '🏷️'}</span>
                        <span className="truncate">{catItem.name}</span>
                        <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* DEPARTMENTS */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">DEPARTMENTS</h3>
                <button onClick={() => { setSelectedDepartments([]); setDisplayLimit(5); }} className="text-[11px] text-stone-500 hover:text-[#7a2039] cursor-pointer">View All</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-[#7a2039] accent-[#7a2039] cursor-pointer"
                    checked={selectedDepartments.length === 0}
                    onChange={() => { setSelectedDepartments([]); setDisplayLimit(5); }}
                  />
                  <span className={`group-hover:text-[#7a2039] transition ${selectedDepartments.length === 0 ? 'font-semibold text-[#7a2039]' : ''}`}>
                    All Departments <span className="text-stone-400 dark:text-stone-500 font-normal">({publishedPapers.length})</span>
                  </span>
                </label>

                {['College of Information Technology', 'College of Management', 'College of Engineering'].map(dept => {
                  const count = publishedPapers.filter(p => normalizeDepartment(p.department || p.program).toLowerCase() === normalizeDepartment(dept).toLowerCase()).length;
                  const isChecked = selectedDepartments.some(d => normalizeDepartment(d).toLowerCase() === normalizeDepartment(dept).toLowerCase());
                  return (
                    <label key={dept} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-stone-300 text-[#7a2039] accent-[#7a2039] cursor-pointer"
                        checked={isChecked}
                        onChange={() => toggleDepartment(dept)}
                      />
                      <span className={`group-hover:text-[#7a2039] transition ${isChecked ? 'font-semibold text-[#7a2039]' : ''}`}>
                        {dept} <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                      </span>
                    </label>
                  );
                })}
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
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.7 0-1.357-.315-1.792-.861l-2.012-2.515a4.5 4.5 0 00-3.513-1.69h-.28c-.414 0-.75-.336-.75-.75V11.25c0-.414.336-.75.75-.75h.28z" />
                          </svg>
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
                <div
                  key={paper.id}
                  onMouseEnter={preloadViewer}
                  onTouchStart={preloadViewer}
                  className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-[#7A1F35] flex flex-col md:flex-row gap-6 justify-between items-start"
                >
                  {/* Left Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                      <span className="bg-[#f4e4e5] dark:bg-[#3d1822] text-[#6b142c] dark:text-[#f8a8b8] px-3 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                        <span className="text-[11px]">🏷️</span>
                        {paper.category || 'General'}
                      </span>
                      {paper.department && (
                        <span className="bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-300 px-2.5 py-0.5 rounded-md text-xs font-medium">
                          {normalizeDepartment(paper.department)}
                        </span>
                      )}
                      {new Date(paper.publishedAt || paper.createdAt || 0) > new Date(currentDate - 30*24*60*60*1000) && (
                        <span className="bg-[#107c41] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-stone-400 font-medium">
                        {new Date(paper.publishedAt || paper.createdAt || currentDate).getFullYear()}
                      </span>
                    </div>

                    <h3 
                      onClick={(e) => handleViewPaper(e, paper.id)}
                      className="font-serif font-bold text-xl md:text-2xl text-stone-900 dark:text-gray-100 hover:text-[#6b142c] dark:hover:text-[#f3e5ab] cursor-pointer transition leading-snug mb-2"
                    >
                      <HighlightedText text={paper.researchTitle || 'Untitled Research'} highlight={searchQuery} />
                    </h3>

                    <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mb-3">
                      {paper.authorDisplay} {paper.adviserName && `· Adviser: ${paper.adviserName}`}
                    </p>

                    <p className="text-sm text-stone-600 dark:text-gray-300 font-sans leading-relaxed line-clamp-2 mb-4">
                      <HighlightedText text={paper.abstract || 'No abstract provided.'} highlight={searchQuery} />
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {paper.keywords?.slice(0, 5).map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-[#f7eedc] dark:bg-gray-700 text-stone-700 dark:text-gray-300 rounded-full text-xs font-medium hover:bg-[#ede0c8] cursor-pointer transition">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Action Column */}
                  <div className="w-full md:w-36 shrink-0 flex flex-col items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleViewPaper(e, paper.id)}
                      className="w-full py-2 bg-[#6b142c] hover:bg-[#520f21] text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 cursor-pointer text-center"
                    >
                      View Paper
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleBookmarkToggle(e, paper)}
                      className={`w-full py-1.5 bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-1.5 cursor-pointer ${userBookmarks.includes(paper.id) ? 'text-[#6b142c] border-[#6b142c] font-semibold' : ''}`}
                    >
                      <svg className="w-3.5 h-3.5" fill={userBookmarks.includes(paper.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                      </svg>
                      {userBookmarks.includes(paper.id) ? 'Bookmarked' : 'Bookmark'}
                    </button>

                    <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500 font-sans mt-1">
                      <span 
                        onClick={(e) => handleLike(e, paper)}
                        className="flex items-center gap-1 hover:text-[#6b142c] cursor-pointer transition"
                      >
                        <svg className={`w-3.5 h-3.5 ${paper.likes?.includes(currentUser?.uid) ? 'text-[#6b142c] fill-current' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.7 0-1.357-.315-1.792-.861l-2.012-2.515a4.5 4.5 0 00-3.513-1.69h-.28c-.414 0-.75-.336-.75-.75V11.25c0-.414.336-.75.75-.75h.28z" />
                        </svg>
                        {paper.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c.077-.133.152-.27.228-.404a10.697 10.697 0 0117.472 0c.076.134.151.27.228.404a10.697 10.697 0 01-17.472 0z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {paper.views || 0}
                      </span>
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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-1 bg-[#f4e4e5] dark:bg-[#3d1822] border border-[#a86576]/30 text-[#6b142c] dark:text-[#f8a8b8] rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                    <span>🏷️</span>
                    {previewPaper.category || 'General'}
                  </span>
                  {previewPaper.department && (
                    <span className="px-2.5 py-1 bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-300 rounded text-[10px] font-bold uppercase tracking-wider inline-block">
                      {normalizeDepartment(previewPaper.department)}
                    </span>
                  )}
                </div>
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
            <div className="p-4 sm:p-6 border-t border-stone-200 dark:border-gray-800 bg-stone-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewPaper(null)}
                className="px-6 py-2.5 rounded-lg font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-gray-800 transition active:scale-95 cursor-pointer text-center w-full sm:w-auto order-2 sm:order-1"
              >
                Close
              </button>
              <button
                type="button"
                onMouseEnter={preloadViewer}
                onTouchStart={preloadViewer}
                onClick={(e) => {
                  setPreviewPaper(null);
                  handleViewPaper(e, previewPaper.id);
                }}
                className="px-8 py-2.5 bg-[#7a2039] text-white font-bold rounded-lg shadow-lg hover:bg-[#5a1528] hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto order-1 sm:order-2"
                style={{ touchAction: 'manipulation' }}
              >
                <span>Open Full PDF</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ArchiveBrowse;