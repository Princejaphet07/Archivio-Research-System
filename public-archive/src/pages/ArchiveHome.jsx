import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroBg from '../assets/Hero.png';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { normalizeDepartment } from '../utils/normalizeDepartment';
import { trackDepartmentFilter, trackLike } from '../utils/analytics';
export { normalizeDepartment };

const preloadViewer = () => {
  try {
    import('./ArchivePaperViewer');
  } catch (_) {}
};

function ArchiveHome() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const [popularDepartments, setPopularDepartments] = useState([]);
  const navigate = useNavigate();
  const currentDate = React.useMemo(() => Date.now(), []);

  useEffect(() => {
    const phrases = [
      'Search for "Computer Science"...',
      'Search for "Nursing"...',
      'Search by author name...',
      'Search keywords...',
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer;

    const type = () => {
      const currentPhrase = phrases[phraseIndex];

      if (isDeleting) {
        setPlaceholderText(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholderText(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === currentPhrase.length) {
        speed = 2000; // Pause at end of phrase
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 500; // Pause before new phrase
      }

      timer = setTimeout(type, speed);
    };

    timer = setTimeout(type, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate('/browse', { state: { q: searchInput.trim() } });
    }
  };

  const handleTagClick = (dept) => {
    trackDepartmentFilter(dept);
    navigate('/browse', { state: { dept: dept, sort: 'Most Viewed' } });
  };
  const [stats, setStats] = useState({
    papers: 0,
    authors: 0,
    departments: 0,
    advisers: 0
  });

  const { currentUser } = useAuth();

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
    trackLike(paper);
    const paperRef = doc(db, 'submissions', paper.id);
    const likes = paper.likes || [];
    if (likes.includes(currentUser.uid)) {
      await updateDoc(paperRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(paperRef, { likes: arrayUnion(currentUser.uid) });
    }
  };

  const handleViewPaper = (e, paperId) => {
    if (e) e.preventDefault();
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
      if (!subsList.length) {
        setPublishedPapers([]);
        setPopularDepartments([]);
        setStats({ papers: 0, authors: 0, departments: 0, advisers: 0 });
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
          department: group?.department || sub.department,
          authorDisplay: group
            ? [group.leaderName, ...(group.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
            : sub.studentName || 'Unknown Author'
        };
      });

      // Sort newest first client-side
      const sortedPapers = enrichedPapers.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      setPublishedPapers(sortedPapers);

      // Compute popular departments ranked dynamically by highest view counts
      const deptViewsMap = {};
      enrichedPapers.forEach(p => {
        const rawDept = p.department || p.program || p.category;
        if (rawDept && typeof rawDept === 'string' && rawDept.trim()) {
          const cleanDept = normalizeDepartment(rawDept);
          const views = Number(p.views) || 0;
          deptViewsMap[cleanDept] = (deptViewsMap[cleanDept] || 0) + views;
        }
      });

      let sortedPopularDepts = Object.keys(deptViewsMap)
        .sort((a, b) => deptViewsMap[b] - deptViewsMap[a])
        .slice(0, 5);

      setPopularDepartments(sortedPopularDepts);

      // Compute stats
      const uniqueAuthors = new Set();
      const uniqueAdvisers = new Set();
      const uniqueDepartments = new Set();

      enrichedPapers.forEach(p => {
        if (p.studentUid) uniqueAuthors.add(p.studentUid);
        if (p.adviserName) uniqueAdvisers.add(p.adviserName);
        const rawDept = p.department || p.program || p.category;
        if (rawDept) uniqueDepartments.add(normalizeDepartment(rawDept));
      });

      setStats({
        papers: enrichedPapers.length,
        authors: uniqueAuthors.size,
        departments: uniqueDepartments.size,
        advisers: uniqueAdvisers.size
      });
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

  const categories = React.useMemo(() => {
    if (!publishedPapers.length) return [];

    const counts = {};
    publishedPapers.forEach(p => {
      const rawCat = p.category || p.department || p.program;
      const cat = normalizeDepartment(rawCat);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      papers: `${count} paper${count === 1 ? '' : 's'}`
    })).sort((a, b) => parseInt(b.papers) - parseInt(a.papers));
  }, [publishedPapers]);

  return (
    <div className="font-serif min-h-screen bg-[#faf7f0] dark:bg-gray-900 transition-colors">
      <Header />

      {/* HERO SECTION */}
      <div className="relative h-[550px] flex flex-col items-center justify-center text-center px-4"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 space-y-3 md:space-y-4 w-full">
          <p className="text-amber-200 tracking-[0.2em] text-[10px] md:text-xs font-sans uppercase">SWU PHINMA • Research Archive</p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-widest text-[#f3e5ab] mt-2 mb-2 md:mb-4 drop-shadow-lg">ARCHIVIO</h1>
          <h2 className="text-lg md:text-xl text-amber-100 italic">Research Archive Management System</h2>
          <p className="text-xs md:text-sm text-stone-200 max-w-2xl mx-auto font-sans leading-relaxed mt-4 drop-shadow-md px-4">
            Discover peer-reviewed research, theses, and academic manuscripts from SWU PHINMA students and faculty.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-xl p-1 mt-6 md:mt-8 max-w-3xl mx-auto shadow-2xl font-sans w-full">
            <div className="flex flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={placeholderText}
                className="w-full py-3 pl-12 pr-4 outline-none text-white dark:text-gray-100 bg-transparent text-sm md:text-base placeholder-white/70 dark:placeholder-gray-400 transition-all font-medium"
              />
            </div>
            <button type="submit" className="bg-[#6b142c] text-white px-8 py-3 rounded-lg md:rounded hover:bg-[#4a0d1e] transition font-medium cursor-pointer w-full md:w-auto mt-1 md:mt-0 shadow-sm border border-[#6b142c]/50">Search</button>
          </form>
          {popularDepartments.length > 0 && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-6 text-[10px] md:text-xs font-sans px-2">
              <span className="text-[#d6ad60] uppercase tracking-wider font-bold w-full md:w-auto text-center mb-1 md:mb-0 opacity-90 mr-1">
                Popular:
              </span>
              {popularDepartments.map(dept => (
                <button
                  type="button"
                  key={dept}
                  onClick={() => handleTagClick(dept)}
                  className="px-3 py-1.5 border border-[#d6ad60]/40 text-[#f3e5ab] rounded-full cursor-pointer hover:bg-[#d6ad60]/20 hover:border-[#d6ad60]/60 backdrop-blur-sm whitespace-nowrap transition-all font-medium max-w-[280px] sm:max-w-none truncate"
                  title={`View research in ${dept}`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS RIBBON */}
      <div className="bg-[#6b142c] text-white py-10 px-4 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-0 text-center md:divide-x divide-white/10 shadow-inner">
        <div className="border-r border-white/10 md:border-r-0"><h3 className="text-3xl md:text-4xl font-bold text-[#f3e5ab] mb-2">{stats.papers}</h3><p className="text-[10px] md:text-xs font-sans text-stone-300 uppercase tracking-wider">Papers Archived</p></div>
        <div><h3 className="text-3xl md:text-4xl font-bold text-[#f3e5ab] mb-2">{stats.authors}</h3><p className="text-[10px] md:text-xs font-sans text-stone-300 uppercase tracking-wider">Student Authors</p></div>
        <div className="border-r border-white/10 md:border-r-0"><h3 className="text-3xl md:text-4xl font-bold text-[#f3e5ab] mb-2">{stats.departments}</h3><p className="text-[10px] md:text-xs font-sans text-stone-300 uppercase tracking-wider">Departments</p></div>
        <div><h3 className="text-3xl md:text-4xl font-bold text-[#f3e5ab] mb-2">{stats.advisers}</h3><p className="text-[10px] md:text-xs font-sans text-stone-300 uppercase tracking-wider">Faculty Advisers</p></div>
      </div>

      {/* LATEST RESEARCH */}
      <div className="px-4 md:px-16 py-12 md:py-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4 md:gap-0">
          <div>
            <p className="text-[#8c7435] dark:text-[#d6ad60] text-xs font-bold tracking-widest uppercase font-sans mb-1 text-center md:text-left">Recently Approved</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#3d0c1b] dark:text-[#c25975] text-center md:text-left">Latest Research</h2>
          </div>
          <Link to="/browse" className="px-5 py-2 border border-[#3d0c1b] dark:border-[#c25975] text-[#3d0c1b] dark:text-[#c25975] text-sm font-sans rounded hover:bg-[#3d0c1b] dark:hover:bg-[#c25975] hover:text-white dark:hover:text-[#3d0c1b] transition inline-block text-center mx-auto md:mx-0 w-full md:w-auto">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {loading ? (
            [1, 2, 3].map(n => (
              <div key={n} className="bg-[#f8f2e4]/70 dark:bg-stone-900/40 rounded-2xl p-6 shadow-sm border-t-4 border-t-[#590000]/40 border-x border-b border-[#e5d8c3] dark:border-stone-800 flex flex-col justify-between h-72 relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-28 rounded bg-[#ebdcc3]/80 animate-shimmer"></div>
                    <div className="h-5 w-12 rounded bg-[#ebdcc3]/60 animate-shimmer"></div>
                  </div>
                  <div className="h-7 w-3/4 rounded bg-[#ebdcc3] mb-3 animate-shimmer"></div>
                  <div className="h-7 w-1/2 rounded bg-[#ebdcc3] mb-5 animate-shimmer"></div>
                  <div className="h-4 w-1/3 rounded bg-[#ebdcc3]/60 mb-4 animate-shimmer"></div>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e4d7c2]/80">
                  <div className="h-5 w-16 rounded bg-[#ebdcc3]/60 animate-shimmer"></div>
                  <div className="h-9 w-24 rounded bg-[#4a0e17]/30 animate-shimmer"></div>
                </div>
              </div>
            ))
          ) : (
            publishedPapers.slice(0, 3).map((paper) => {
              const categoryLabel = paper.category || paper.researchCategory || paper.categoryName || 'General';
              const isLiked = paper.likes?.includes(currentUser?.uid);

              return (
                <div
                  key={paper.id}
                  onMouseEnter={preloadViewer}
                  onTouchStart={preloadViewer}
                  className="relative bg-[#f8f2e4] dark:bg-[#1e1b18] rounded-2xl p-6 border-t-4 border-t-[#590000] dark:border-t-[#801e38] border-x border-b border-[#e5d8c3] dark:border-stone-700/80 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(80,30,40,0.12)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] group overflow-hidden shadow-sm"
                >
                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Row: Category Pill & Year */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="border border-[#a86576]/50 dark:border-[#a86576]/60 bg-[#f4e4e5] dark:bg-[#3d1822] text-[#590000] dark:text-[#f8a8b8] px-3.5 py-1 rounded-lg text-xs font-medium max-w-[200px] truncate shadow-sm">
                          {categoryLabel}
                        </span>
                        <span className="text-stone-500 dark:text-stone-400 font-sans text-xs sm:text-sm font-normal">
                          {new Date(paper.publishedAt || currentDate).getFullYear()}
                        </span>
                      </div>

                      {/* Research Title */}
                      <h3
                        className="font-serif text-[#1c1917] dark:text-stone-100 font-bold text-xl md:text-[22px] leading-tight my-3.5 line-clamp-2 group-hover:text-[#590000] dark:group-hover:text-[#f8a8b8] transition-colors"
                        title={paper.researchTitle || 'Untitled Research'}
                      >
                        {paper.researchTitle || 'Untitled Research'}
                      </h3>

                      {/* Authors & Adviser */}
                      <p className="text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-medium line-clamp-1 mb-1" title={paper.authorDisplay}>
                        {paper.authorDisplay}
                      </p>
                      <p className="text-stone-500 dark:text-stone-400 text-xs italic">
                        Adviser: {paper.adviserName || 'Unknown'}
                      </p>

                      {/* Divider */}
                      <div className="border-b border-[#e4d7c2] dark:border-stone-700/80 my-4"></div>

                      {/* Keywords */}
                      <div className="flex gap-2 text-xs flex-wrap mb-4">
                        {paper.keywords?.slice(0, 3).map(kw => (
                          <span
                            key={kw}
                            className="bg-[#ebdcc3] dark:bg-stone-800 text-[#63513a] dark:text-stone-300 border border-[#d8c5a8] dark:border-stone-700 text-[11px] sm:text-xs px-3 py-1 rounded-full font-medium shadow-sm"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="mt-4 pt-3.5 border-t border-[#e4d7c2]/80 dark:border-stone-800 bg-[#efe2cd]/50 dark:bg-stone-900/40 -mx-6 -mb-6 px-6 py-3.5 flex items-center justify-between rounded-b-2xl relative z-10">
                    <div className="text-xs text-stone-600 dark:text-stone-400 flex items-center gap-3 font-medium">
                      <span
                        onClick={(e) => handleLike(e, paper)}
                        className="text-rose-600 hover:scale-110 transition-transform cursor-pointer flex items-center gap-1.5 font-bold"
                        title="Like this paper"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke={isLiked ? "none" : "currentColor"} strokeWidth={1.5} className="w-4 h-4 text-rose-600">
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        {paper.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-stone-600 dark:text-stone-400 ml-2" title="Views">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-stone-500"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                        {paper.views || 0}
                      </span>
                    </div>
                    <button
                      type="button"
                      onMouseEnter={preloadViewer}
                      onTouchStart={preloadViewer}
                      onClick={(e) => handleViewPaper(e, paper.id)}
                      className="bg-[#4a0e17] hover:bg-[#380911] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      View Paper
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {!loading && publishedPapers.length === 0 && (
            <div className="col-span-3 text-center py-12 text-stone-500">
              No published research available yet.
            </div>
          )}
        </div>
      </div>

      {/* BROWSE CATEGORIES SECTION */}
      <div className="bg-[#f2ead3] dark:bg-gray-900 px-8 md:px-16 py-16 border-t border-[#e5d4a6] dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8">
            <div>
              <p className="text-[#8c7435] dark:text-[#d6ad60] text-xs font-bold tracking-widest uppercase font-sans mb-1">Explore by Category</p>
              <Link 
                to="/browse" 
                className="group inline-flex items-center gap-2 border-b-2 border-[#d6ad60] pb-1 hover:border-[#3d0c1b] dark:hover:border-[#c25975] transition-colors"
                title="Browse Categories"
              >
                <h2 className="text-3xl font-bold text-[#3d0c1b] dark:text-[#c25975] group-hover:text-[#6b142c] dark:group-hover:text-[#f3e5ab] transition-colors cursor-pointer">
                  Browse Categories
                </h2>
                <span className="text-[#8c7435] dark:text-[#d6ad60] group-hover:translate-x-1.5 transition-transform text-2xl font-sans font-light">→</span>
              </Link>
            </div>
            <Link to="/browse" className="text-sm text-[#3d0c1b] dark:text-[#c25975] hover:text-[#8c7435] dark:hover:text-[#d6ad60] font-sans font-medium transition mb-1 md:ml-4">
              All Department ↓
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 font-sans snap-x">
            {categories.map((cat, index) => (
              <Link to="/browse" state={{ dept: cat.name }} key={index} className="min-w-[200px] h-24 bg-[#fcfbf7] dark:bg-gray-800 shadow-sm hover:shadow-md border border-stone-200 dark:border-gray-700 border-l-4 border-l-[#6b142c] rounded-r-lg p-4 flex flex-col justify-between cursor-pointer transition-all snap-start block">
                <h3 className="font-bold text-stone-800 dark:text-gray-200 text-sm">{cat.name}</h3>
                <div className="flex justify-between items-center text-xs text-stone-500 dark:text-gray-400">
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