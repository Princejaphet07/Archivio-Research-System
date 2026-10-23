import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { normalizeDepartment, areDepartmentsEqual } from '../utils/normalizeDepartment';
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
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlightId = searchParams.get('highlight') || searchParams.get('study') || searchParams.get('id') || location.state?.highlight || '';
  const highlightTitle = searchParams.get('title') || location.state?.title || '';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || location.state?.q || '');
  const [expandedAbstracts, setExpandedAbstracts] = useState({});
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || location.state?.sort || 'Newest First');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState(
    searchParams.get('dept') 
      ? [normalizeDepartment(searchParams.get('dept'))] 
      : location.state?.dept 
      ? [normalizeDepartment(location.state.dept)] 
      : []
  );
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get('category') 
      ? [searchParams.get('category')] 
      : location.state?.category 
      ? [location.state.category] 
      : []
  );
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
      const isAlready = prev.some(d => areDepartmentsEqual(d, dept));
      if (!isAlready) trackDepartmentFilter(normDept);
      return isAlready
        ? prev.filter(d => !areDepartmentsEqual(d, dept))
        : [...prev, dept];
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

  // URL search params sync & highlight auto-scroll
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get('q');
    if (qParam !== null && qParam !== undefined) {
      setSearchQuery(qParam);
    }
    const catParam = params.get('category');
    if (catParam) {
      setSelectedCategories([catParam]);
    }
    const deptParam = params.get('dept');
    if (deptParam) {
      setSelectedDepartments([normalizeDepartment(deptParam)]);
    }
    const sortParam = params.get('sort');
    if (sortParam) {
      setSortOption(sortParam);
    }
  }, [location.search]);

  // Handle direct study highlight from Dean Research Records
  useEffect(() => {
    if (!highlightId && !highlightTitle) return;
    if (publishedPapers.length === 0) return;

    const targetIdx = publishedPapers.findIndex(p => {
      if (highlightId && (p.id === highlightId || p.submissionId === highlightId || p.groupId === highlightId)) {
        return true;
      }
      if (highlightTitle && (p.researchTitle || p.title)) {
        const pTitle = (p.researchTitle || p.title).toLowerCase().trim();
        const hTitle = highlightTitle.toLowerCase().trim();
        return pTitle === hTitle || pTitle.includes(hTitle) || hTitle.includes(pTitle);
      }
      return false;
    });

    if (targetIdx !== -1) {
      setDisplayLimit(prev => Math.max(prev, targetIdx + 5));

      const timer = setTimeout(() => {
        const targetPaper = publishedPapers[targetIdx];
        const el = document.getElementById(`paper-${targetPaper.id}`) ||
                   document.querySelector(`[data-paper-id="${targetPaper.id}"]`) ||
                   document.querySelector('[data-highlighted-study="true"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [highlightId, highlightTitle, publishedPapers]);

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
    const likes = Array.isArray(paper?.likes) ? paper.likes : [];
    const isCurrentlyLiked = likes.includes(currentUser.uid);
    const userInfo = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      email: currentUser.email || ''
    };

    // Optimistic UI update in papers state
    setPublishedPapers(prev => prev.map(p => {
      if (p.id !== paper.id) return p;
      const updatedLikes = isCurrentlyLiked
        ? (p.likes || []).filter(uid => uid !== currentUser.uid)
        : [...(p.likes || []), currentUser.uid];
      return { ...p, likes: updatedLikes };
    }));

    try {
      if (isCurrentlyLiked) {
        const existingLikedUser = (paper?.likedUsers || []).find(u => u?.uid === currentUser.uid);
        const updates = { likes: arrayRemove(currentUser.uid) };
        if (existingLikedUser) {
          updates.likedUsers = arrayRemove(existingLikedUser);
        } else {
          updates.likedUsers = arrayRemove(userInfo);
        }
        try {
          await updateDoc(paperRef, updates);
        } catch (fullErr) {
          console.warn("Full like remove failed, fallback to likes array:", fullErr.message);
          await updateDoc(paperRef, { likes: arrayRemove(currentUser.uid) });
        }
      } else {
        try {
          await updateDoc(paperRef, { 
            likes: arrayUnion(currentUser.uid),
            likedUsers: arrayUnion(userInfo)
          });
        } catch (fullErr) {
          console.warn("Full like add failed, fallback to likes array:", fullErr.message);
          await updateDoc(paperRef, { likes: arrayUnion(currentUser.uid) });
        }
      }
    } catch (finalErr) {
      console.error("Like toggle error:", finalErr.message);
      // Revert optimistic update
      setPublishedPapers(prev => prev.map(p => {
        if (p.id !== paper.id) return p;
        return { ...p, likes };
      }));
      Swal.fire({
        title: 'Action Failed',
        text: 'Unable to update like at this time. Please try again.',
        icon: 'error',
        confirmButtonColor: '#7a2039'
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

  // Dynamic categories aggregated strictly from published papers (with icons/names enhanced by adviser configs)
  const availableCategories = useMemo(() => {
    const catMap = new Map();

    publishedPapers.forEach(p => {
      const cat = (p.category || '').trim();
      if (cat && !catMap.has(cat.toLowerCase())) {
        const dbMatch = dbCategories.find(c => (c.name || '').toLowerCase().trim() === cat.toLowerCase());
        catMap.set(cat.toLowerCase(), {
          name: dbMatch?.name || cat,
          icon: dbMatch?.icon || '🏷️'
        });
      }
    });

    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCategories, publishedPapers]);

  // Dynamic departments aggregated strictly from published papers
  const availableDepartments = useMemo(() => {
    const deptMap = new Map();
    publishedPapers.forEach(p => {
      const rawDept = p.department || p.program || p.category;
      if (rawDept && typeof rawDept === 'string' && rawDept.trim()) {
        const norm = normalizeDepartment(rawDept);
        let alreadyExists = false;
        for (const existing of deptMap.values()) {
          if (areDepartmentsEqual(existing, norm) || areDepartmentsEqual(existing, rawDept)) {
            alreadyExists = true;
            break;
          }
        }
        if (!alreadyExists && norm) {
          deptMap.set(norm.toLowerCase(), norm);
        }
      }
    });
    return Array.from(deptMap.values()).sort();
  }, [publishedPapers]);

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
      return areDepartmentsEqual(dept, paper.department) ||
             areDepartmentsEqual(dept, paper.program) ||
             areDepartmentsEqual(dept, paper.category) ||
             (normalizeDepartment(dept).toLowerCase() === normalizeDepartment(paper.department || paper.program).toLowerCase());
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

  // Dynamic publication years aggregated strictly from published papers (only existing years)
  const availableYears = useMemo(() => {
    const yearCounts = {};
    publishedPapers.forEach(p => {
      const dateVal = p.publishedAt || p.createdAt;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear().toString();
          yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
      }
    });

    return Object.keys(yearCounts)
      .sort((a, b) => Number(b) - Number(a))
      .map(year => ({
        year,
        count: yearCounts[year]
      }));
  }, [publishedPapers]);

  // Top Research: Top 5 research papers that currently have more views and likes compared to other research
  const getTopResearchPapers = () => {
    return [...publishedPapers]
      .map(paper => {
        const views = Number(paper.views) || 0;
        const likes = Array.isArray(paper.likes) ? paper.likes.length : (Number(paper.likes) || 0);
        return {
          ...paper,
          _totalEngagement: views + likes,
          _views: views,
          _likes: likes
        };
      })
      .sort((a, b) => {
        if (b._totalEngagement !== a._totalEngagement) {
          return b._totalEngagement - a._totalEngagement;
        }
        if (b._views !== a._views) {
          return b._views - a._views;
        }
        if (b._likes !== a._likes) {
          return b._likes - a._likes;
        }
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      })
      .slice(0, 5);
  };
  const topResearchPapers = getTopResearchPapers();

  // Color accents for research card left borders (matches Image 2)
  const CARD_ACCENTS = [
    'border-l-[#a855f7]', // Purple (Image 2 Card 1)
    'border-l-[#10b981]', // Teal / Emerald (Image 2 Card 2)
    'border-l-[#ec4899]', // Pink / Magenta (Image 2 Card 3)
    'border-l-[#d97706]', // Amber / Gold (Image 2 Card 4)
    'border-l-[#701a2b]', // Maroon / Wine (Image 2 Card 5)
  ];

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf6ee] dark:bg-gray-900 transition-colors text-stone-800 dark:text-gray-100">
      <Header />

      {/* STICKY TOP SEARCH & FILTER/SORT BAR */}
      <div className="sticky top-[72px] z-30 bg-[#f5eee3]/95 dark:bg-gray-800/95 backdrop-blur-md px-4 md:px-8 py-3 border-b border-stone-200/80 dark:border-gray-700 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-center justify-between font-sans">
          {/* Left: Search input & Search button */}
          <div className="flex gap-2.5 w-full md:w-auto flex-1 items-center max-w-xl">
            {/* Search input with icon */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input
                type="text"
                placeholder="Search title, author, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-8 rounded-lg bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 outline-none focus:border-[#701a2b] focus:ring-1 focus:ring-[#701a2b] text-sm text-stone-700 dark:text-gray-200 shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter toggle button for mobile */}
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className="md:hidden bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 p-2 rounded-lg text-stone-600 dark:text-gray-300 shadow-2xs hover:bg-stone-50 dark:hover:bg-gray-600 transition flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Refine Results"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#701a2b] dark:text-[#f3e5ab]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
            </button>

            {/* Search button */}
            <button
              type="button"
              onClick={() => {
                setDisplayLimit(5);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-[#701a2b] hover:bg-[#581320] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>

          {/* Right: Results Counter & Sort Dropdown */}
          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0">
            {/* Showing X out of Y results */}
            <div className="text-xs text-stone-600 dark:text-gray-300 font-medium">
              Showing {filteredPapers.length > 0 ? (paginatedPapers.length > 0 ? 1 : 0) : 0}–{paginatedPapers.length} out of {filteredPapers.length.toLocaleString()} results
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortOption}
                onChange={(e) => { setSortOption(e.target.value); setDisplayLimit(5); }}
                className="appearance-none bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-lg pl-3.5 pr-8 py-2 text-xs font-semibold text-stone-700 dark:text-gray-200 outline-none shadow-2xs cursor-pointer transition-colors focus:border-[#701a2b]"
              >
                <option value="Newest First">Sort: Newest First</option>
                <option value="Most Viewed">Sort: Most Viewed</option>
                <option value="Most Liked">Sort: Most Liked</option>
                <option value="A-Z">Sort: A-Z</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-[10px]">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col md:flex-row flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 gap-6 items-start relative">

        {/* Mobile Filter Overlay */}
        {isMobileFiltersOpen && (
          <div className="md:hidden fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs z-40" onClick={() => setIsMobileFiltersOpen(false)}></div>
        )}

        {/* SIDEBAR: REFINE RESULTS & TOP RESEARCH PANELS */}
        <aside className={`w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-[144px] self-start font-sans flex flex-col gap-4 md:max-h-[calc(100vh-160px)] md:overflow-y-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${isMobileFiltersOpen ? 'fixed inset-y-0 left-0 z-50 p-4 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center overflow-y-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden' : 'hidden md:flex'}`}>
          
          {/* PANEL 1: REFINE RESULTS CARD (Image 1 & 2) */}
          <div className="w-full max-w-sm md:max-w-none bg-[#fbf7ed] dark:bg-gray-800 rounded-xl border border-stone-200/90 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col shrink-0">
            
            {/* Card Header (Image 2) */}
            <div className="bg-[#701a2b] text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <span className="font-bold text-sm tracking-wide">Refine Results</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearAll} 
                  className="text-xs text-stone-200 hover:text-white underline cursor-pointer transition font-normal"
                >
                  Clear all
                </button>
                {isMobileFiltersOpen && (
                  <button onClick={() => setIsMobileFiltersOpen(false)} className="md:hidden text-white hover:text-stone-300 p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Card Scrollable Content */}
            <div className="p-5 space-y-6">

              {/* 1. YEAR PUBLISHED (strictly existing published years) */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">YEAR PUBLISHED</h3>
                  <button onClick={() => setSelectedYears([])} className="text-[11px] text-stone-500 hover:text-[#701a2b] cursor-pointer">View All</button>
                </div>
                <div className="space-y-2">
                  {availableYears.map(({ year, count }) => {
                    const isChecked = selectedYears.includes(year);
                    return (
                      <label key={year} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-stone-300 text-[#701a2b] accent-[#701a2b] cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleYear(year)}
                        />
                        <span className={`group-hover:text-[#701a2b] transition ${isChecked ? 'font-semibold text-[#701a2b]' : ''}`}>
                          {year} <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                        </span>
                      </label>
                    );
                  })}
                  {availableYears.length === 0 && (
                    <div className="text-xs text-stone-400 italic">No published papers yet</div>
                  )}
                </div>
              </div>

              {/* 2. CATEGORIES */}
              {availableCategories.length > 0 && (
                <div className="pt-2 border-t border-stone-200/60 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">CATEGORIES</h3>
                    <button onClick={() => { setSelectedCategories([]); setDisplayLimit(5); }} className="text-[11px] text-stone-500 hover:text-[#701a2b] cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-stone-300 text-[#701a2b] accent-[#701a2b] cursor-pointer"
                        checked={selectedCategories.length === 0}
                        onChange={() => { setSelectedCategories([]); setDisplayLimit(5); }}
                      />
                      <span className={`group-hover:text-[#701a2b] transition ${selectedCategories.length === 0 ? 'font-semibold text-[#701a2b]' : ''}`}>
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
                            className="w-4 h-4 rounded border-stone-300 text-[#701a2b] accent-[#701a2b] cursor-pointer"
                            checked={isChecked}
                            onChange={() => toggleCategory(catItem.name)}
                          />
                          <span className={`group-hover:text-[#701a2b] transition flex items-center gap-1.5 truncate ${isChecked ? 'font-semibold text-[#701a2b]' : ''}`}>
                            <span className="truncate">{catItem.name}</span>
                            <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. DEPARTMENTS */}
              {availableDepartments.length > 0 && (
                <div className="pt-2 border-t border-stone-200/60 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="font-bold text-stone-800 dark:text-gray-200 text-xs uppercase tracking-wider">DEPARTMENTS</h3>
                    <button onClick={() => { setSelectedDepartments([]); setDisplayLimit(5); }} className="text-[11px] text-stone-500 hover:text-[#701a2b] cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <label className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-stone-300 text-[#701a2b] accent-[#701a2b] cursor-pointer"
                        checked={selectedDepartments.length === 0}
                        onChange={() => { setSelectedDepartments([]); setDisplayLimit(5); }}
                      />
                      <span className={`group-hover:text-[#701a2b] transition ${selectedDepartments.length === 0 ? 'font-semibold text-[#701a2b]' : ''}`}>
                        All Departments <span className="text-stone-400 dark:text-stone-500 font-normal">({publishedPapers.length})</span>
                      </span>
                    </label>

                    {availableDepartments.map(dept => {
                      const count = publishedPapers.filter(p => 
                        areDepartmentsEqual(dept, p.department) || 
                        areDepartmentsEqual(dept, p.program) ||
                        areDepartmentsEqual(dept, p.category) ||
                        (normalizeDepartment(dept).toLowerCase() === normalizeDepartment(p.department || p.program).toLowerCase())
                      ).length;
                      const isChecked = selectedDepartments.some(d => 
                        areDepartmentsEqual(d, dept) ||
                        (normalizeDepartment(d).toLowerCase() === normalizeDepartment(dept).toLowerCase())
                      );
                      return (
                        <label key={dept} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-gray-300 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-stone-300 text-[#701a2b] accent-[#701a2b] cursor-pointer"
                            checked={isChecked}
                            onChange={() => toggleDepartment(dept)}
                          />
                          <span className={`group-hover:text-[#701a2b] transition ${isChecked ? 'font-semibold text-[#701a2b]' : ''}`}>
                            {dept} <span className="text-stone-400 dark:text-stone-500 font-normal">({count})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* PANEL 2: TOP RESEARCH CARD (Top 5 research papers ranked by views & likes) */}
          <div className="w-full max-w-sm md:max-w-none bg-[#fbf7ed] dark:bg-gray-800 rounded-xl border border-stone-200/90 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col shrink-0">
            {/* Header */}
            <div className="bg-[#701a2b] text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">🏆</span>
                <span className="font-bold text-sm tracking-wide">Top Research</span>
              </div>
              <span className="text-[10px] font-bold bg-[#f3e5ab] text-[#701a2b] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Top 5
              </span>
            </div>

            {/* Top 5 Research List */}
            <div className="p-3.5 space-y-2.5">
              {topResearchPapers.length > 0 ? (
                topResearchPapers.map((paper, index) => {
                  const rankStyles = [
                    'bg-amber-400 text-amber-950 ring-2 ring-amber-300/70', // #1 Gold
                    'bg-slate-300 text-slate-800 ring-1 ring-slate-400/50',  // #2 Silver
                    'bg-amber-700 text-amber-100',                          // #3 Bronze
                    'bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-stone-300', // #4
                    'bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-stone-300'  // #5
                  ];

                  return (
                    <div
                      key={paper.id}
                      onClick={() => setPreviewPaper(paper)}
                      className="group cursor-pointer bg-white dark:bg-gray-700/60 p-2.5 rounded-lg border border-stone-200/80 dark:border-gray-600 hover:border-[#701a2b] dark:hover:border-[#f3e5ab] transition-all shadow-2xs hover:shadow-xs flex gap-2.5 items-start"
                      title="Click to preview research"
                    >
                      {/* Rank Badge */}
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs ${rankStyles[index] || rankStyles[3]}`}>
                        {index + 1}
                      </span>

                      {/* Paper Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-stone-800 dark:text-gray-100 group-hover:text-[#701a2b] dark:group-hover:text-[#f3e5ab] line-clamp-2 leading-snug transition-colors">
                          {paper.researchTitle || paper.title}
                        </h4>
                        <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-1 mt-0.5 font-medium">
                          {paper.authorDisplay || 'Unknown Author'}
                        </p>
                        
                        {/* Engagement Metrics */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 dark:text-gray-300 bg-stone-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded border border-stone-200/60 dark:border-gray-600/60" title="Views">
                            <svg className="w-3 h-3 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                              <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                            </svg>
                            {paper._views || paper.views || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#701a2b] dark:text-[#f3e5ab] bg-[#701a2b]/10 dark:bg-[#f3e5ab]/10 px-1.5 py-0.5 rounded border border-[#701a2b]/20 dark:border-[#f3e5ab]/20" title="Likes">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            {paper._likes || (Array.isArray(paper.likes) ? paper.likes.length : (Number(paper.likes) || 0))}
                          </span>
                          <Link
                            to={`/viewer/${paper.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto text-[10px] font-bold text-[#701a2b] dark:text-[#f3e5ab] hover:underline flex items-center gap-0.5"
                            title="Read full paper"
                          >
                            Read →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs text-stone-400 italic">
                  No research papers published yet
                </div>
              )}
            </div>
          </div>

        </aside>

        {/* RESULTS FEED (Design matching Image 2) */}
        <main className="flex-1 min-w-0 font-sans w-full">
          <div className="space-y-4 md:space-y-5">

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl p-6 border-l-4 border-l-gray-200 dark:border-l-gray-600">
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-stone-200/90 dark:border-gray-700 p-12 text-center text-stone-500 dark:text-gray-400 shadow-2xs">
                <span className="text-4xl mb-3 block">📄</span>
                <p className="font-serif text-lg font-bold text-stone-800 dark:text-gray-200 mb-1">No research papers found</p>
                <p className="text-xs text-stone-500 dark:text-gray-400">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              paginatedPapers.map((paper, idx) => {
                const isTargetStudy = Boolean(
                  (highlightId && (paper.id === highlightId || paper.submissionId === highlightId || paper.groupId === highlightId)) ||
                  (highlightTitle && (paper.researchTitle || paper.title) && (
                    (paper.researchTitle || paper.title).toLowerCase().trim() === highlightTitle.toLowerCase().trim() ||
                    (paper.researchTitle || paper.title).toLowerCase().includes(highlightTitle.toLowerCase().trim()) ||
                    highlightTitle.toLowerCase().includes((paper.researchTitle || paper.title).toLowerCase().trim())
                  ))
                );

                const accentBorder = CARD_ACCENTS[idx % CARD_ACCENTS.length];

                return (
                  <div
                    key={paper.id}
                    id={`paper-${paper.id}`}
                    data-paper-id={paper.id}
                    data-highlighted-study={isTargetStudy ? 'true' : undefined}
                    onMouseEnter={preloadViewer}
                    onTouchStart={preloadViewer}
                    className={`rounded-xl p-5 sm:p-6 transition-all duration-200 flex flex-col md:flex-row gap-5 justify-between items-start bg-white dark:bg-gray-800 border border-stone-200/80 dark:border-gray-700 shadow-2xs hover:shadow-md border-l-4 ${
                      isTargetStudy
                        ? 'ring-2 ring-amber-400 border-l-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                        : accentBorder
                    }`}
                  >
                    {/* Left Content Area (Image 2 style) */}
                    <div className="flex-1 min-w-0">
                      {/* Top meta tags (Category, NEW, Year) */}
                      <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                        <span className="bg-[#fbf0f4] dark:bg-[#3d1822] text-[#701a2b] dark:text-[#f8a8b8] px-3 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-[#701a2b]/20 dark:border-transparent">
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

                      {/* Title */}
                      <h3 
                        onClick={(e) => handleViewPaper(e, paper.id)}
                        className="font-serif font-bold text-lg md:text-xl text-stone-900 dark:text-gray-100 hover:text-[#701a2b] dark:hover:text-[#f3e5ab] cursor-pointer transition leading-snug mb-2"
                      >
                        <HighlightedText text={paper.researchTitle || 'Untitled Research'} highlight={searchQuery} />
                      </h3>

                      {/* Author Display & Adviser */}
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mb-3">
                        {paper.authorDisplay} {paper.adviserName && `· Adviser: ${paper.adviserName}`}
                      </p>

                      {/* Abstract with "See more..." toggle (Requirement 5) */}
                      <div className="text-xs md:text-sm text-stone-600 dark:text-gray-300 font-sans leading-relaxed mb-4">
                        {expandedAbstracts[paper.id] ? (
                          <>
                            <HighlightedText text={paper.abstract || 'No abstract provided.'} highlight={searchQuery} />
                            {paper.abstract && paper.abstract.length > 180 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAbstract(paper.id);
                                }}
                                className="ml-2 text-[#701a2b] dark:text-[#f3e5ab] font-bold text-xs hover:underline cursor-pointer inline-flex items-center"
                              >
                                See less
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <HighlightedText 
                              text={
                                paper.abstract && paper.abstract.length > 180 
                                  ? `${paper.abstract.slice(0, 180)}...` 
                                  : (paper.abstract || 'No abstract provided.')
                              } 
                              highlight={searchQuery} 
                            />
                            {paper.abstract && paper.abstract.length > 180 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAbstract(paper.id);
                                }}
                                className="ml-2 text-[#701a2b] dark:text-[#f3e5ab] font-bold text-xs hover:underline cursor-pointer inline-flex items-center"
                              >
                                See more...
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Keywords pills */}
                      <div className="flex flex-wrap gap-2">
                        {paper.keywords?.slice(0, 6).map((tag, i) => (
                          <span 
                            key={i} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(tag);
                              setDisplayLimit(5);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3 py-1 bg-[#fbf6ec] dark:bg-gray-700/60 text-stone-700 dark:text-gray-300 rounded-full text-xs font-medium border border-stone-200/80 dark:border-gray-600 hover:border-[#701a2b] hover:text-[#701a2b] cursor-pointer transition"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right Action Column (matches Image 2) */}
                    <div className="w-full md:w-36 shrink-0 flex flex-col items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleViewPaper(e, paper.id)}
                        className="w-full py-2 bg-[#701a2b] hover:bg-[#581320] text-white text-xs font-semibold rounded-lg shadow-2xs transition active:scale-95 cursor-pointer text-center"
                      >
                        View Paper
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleBookmarkToggle(e, paper)}
                        className={`w-full py-1.5 bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          userBookmarks.includes(paper.id) ? 'text-[#701a2b] border-[#701a2b] font-semibold bg-[#fbf0f4]' : ''
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill={userBookmarks.includes(paper.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                        </svg>
                        {userBookmarks.includes(paper.id) ? 'Bookmarked' : 'Bookmark'}
                      </button>

                      <div className="flex items-center justify-center gap-4 text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                        <span 
                          onClick={(e) => handleLike(e, paper)}
                          className="flex items-center gap-1 hover:text-[#701a2b] cursor-pointer transition"
                          title="Like this paper"
                        >
                          <svg className={`w-3.5 h-3.5 ${paper.likes?.includes(currentUser?.uid) ? 'text-[#701a2b] fill-current' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          {Array.isArray(paper.likes) ? paper.likes.length : 0}
                        </span>
                        <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400" title="Views">
                          <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c.077-.133.152-.27.228-.404a10.697 10.697 0 0117.472 0c.076.134.151.27.228.404a10.697 10.697 0 01-17.472 0z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {paper.views || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
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