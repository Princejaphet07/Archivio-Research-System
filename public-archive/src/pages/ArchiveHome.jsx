import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroBg from '../assets/Hero.png';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function ArchiveHome() {
  const [publishedPapers, setPublishedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const navigate = useNavigate();

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

  const handleTagClick = (tag) => {
    navigate('/browse', { state: { q: tag } });
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
        setStats({ papers: 0, authors: 0, departments: 1, advisers: 0 });
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

      // Sort newest first client-side
      const sortedPapers = enrichedPapers.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      setPublishedPapers(sortedPapers);

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
      let cat = p.category || p.program || 'Uncategorized';
      
      // Normalize common names
      const lowerCat = cat.toLowerCase();
      if (lowerCat.includes('information technology') || lowerCat === 'bsit') cat = 'Information Technology';
      else if (lowerCat.includes('information system') || lowerCat === 'bsis') cat = 'Information Systems';
      else if (lowerCat.includes('computer science') || lowerCat === 'bscs') cat = 'Computer Science';
      else if (lowerCat.includes('nursing')) cat = 'Nursing';
      else if (lowerCat.includes('business') || lowerCat.includes('management')) cat = 'Business Administration';
      else if (lowerCat.includes('education') || lowerCat.includes('teaching')) cat = 'Education';
      else cat = cat.replace(/^BS\s+/i, ''); // Just strip 'BS ' prefix if any

      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      papers: `${count} paper${count === 1 ? '' : 's'}`
    })).sort((a, b) => b.papers.split(' ')[0] - a.papers.split(' ')[0]);
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
          <div className="flex flex-wrap justify-center items-center gap-2 mt-6 text-[10px] md:text-xs font-sans px-2">
            <span className="text-stone-300 w-full md:w-auto text-center mb-1 md:mb-0">Popular:</span>
            {['Computer Science', 'Business', 'Nursing', 'Education', 'Engineering'].map(tag => (
              <span key={tag} onClick={() => handleTagClick(tag)} className="px-3 py-1.5 border border-amber-200/40 text-amber-100 rounded-full cursor-pointer hover:bg-amber-200/20 backdrop-blur-sm whitespace-nowrap">{tag}</span>
            ))}
          </div>
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
            <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-1 text-center md:text-left">Recently Approved</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#3d0c1b] text-center md:text-left">Latest Research</h2>
          </div>
          <Link to="/browse" className="px-5 py-2 border border-[#3d0c1b] text-[#3d0c1b] text-sm font-sans rounded hover:bg-[#3d0c1b] hover:text-white transition inline-block text-center mx-auto md:mx-0 w-full md:w-auto">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {loading ? (
            [1, 2, 3].map(n => (
              <div key={n} className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/50 dark:border-gray-700/50 flex flex-col justify-between h-64 relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-28 rounded animate-shimmer"></div>
                    <div className="h-5 w-12 rounded animate-shimmer"></div>
                  </div>
                  <div className="h-7 w-3/4 rounded mb-3 animate-shimmer"></div>
                  <div className="h-7 w-1/2 rounded mb-5 animate-shimmer"></div>
                  <div className="h-4 w-1/3 rounded mb-4 animate-shimmer"></div>
                </div>
                <div className="flex justify-between items-center mt-8 pt-4 border-t border-stone-200/50 dark:border-gray-700/50">
                  <div className="h-5 w-16 rounded animate-shimmer"></div>
                  <div className="h-9 w-24 rounded animate-shimmer"></div>
                </div>
              </div>
            ))
          ) : (
            publishedPapers.slice(0, 3).map((paper, idx) => (
              <div key={paper.id} className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/80 dark:border-gray-700/60 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(107,20,44,0.1)] dark:hover:shadow-[0_20px_40px_rgb(243,229,171,0.05)] group overflow-hidden">
                {/* Subtle Glow Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7a2039]/5 to-transparent dark:from-[#f3e5ab]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4 text-xs text-stone-600 dark:text-gray-400">
                    <span className="px-3 py-1 border border-stone-200/80 dark:border-gray-600/80 rounded-full bg-white/80 dark:bg-gray-700/80 truncate max-w-[150px] text-stone-800 dark:text-gray-200 font-medium shadow-sm">
                      {paper.program || 'Research'}
                    </span>
                    <span className="font-medium bg-stone-100 dark:bg-gray-800 px-2 py-1 rounded-md">{new Date(paper.publishedAt || Date.now()).getFullYear()}</span>
                  </div>
                  <h3 className="font-bold text-lg text-stone-900 dark:text-gray-100 mb-2 leading-snug line-clamp-3 group-hover:text-[#7a2039] dark:group-hover:text-[#f3e5ab] transition-colors" title={paper.researchTitle || 'Untitled Research'}>
                    {paper.researchTitle || 'Untitled Research'}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-gray-400 mb-1 line-clamp-1" title={paper.authorDisplay}>{paper.authorDisplay}</p>
                  <p className="text-[11px] text-stone-500 dark:text-gray-500 italic">Adviser: {paper.adviserName || 'Unknown'}</p>
                  <div className="flex gap-2 mt-4 text-[10px] flex-wrap">
                    {paper.keywords?.slice(0, 3).map(kw => (
                      <span key={kw} className="px-2 py-1 bg-stone-200/40 dark:bg-gray-700/50 rounded-full border border-stone-200/60 dark:border-gray-600/50 dark:text-gray-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-8 relative z-10">
                  <div className="text-xs text-stone-500 flex gap-3 font-medium">
                    <span
                      onClick={(e) => handleLike(e, paper)}
                      className="text-stone-500 hover:text-rose-500 cursor-pointer hover:scale-110 transition-transform flex items-center gap-1"
                      title="Like this paper"
                    >
                      {paper.likes?.includes(currentUser?.uid) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-500"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      )}
                      {paper.likes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Views">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
                      {paper.views || 0}
                    </span>
                  </div>
                  <Link to={`/viewer/${paper.id}`} className="px-5 py-2 bg-[#7a2039] text-white text-xs font-medium rounded-lg hover:bg-[#5a1528] transition-colors cursor-pointer inline-block shadow-sm">
                    View Paper
                  </Link>
                </div>
              </div>
            ))
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
              <p className="text-[#8c7435] text-xs font-bold tracking-widest uppercase font-sans mb-1">Explore by Category</p>
              <h2 className="text-3xl font-bold text-[#3d0c1b] border-b-2 border-[#d6ad60] inline-block pb-1">Browse Categories</h2>
            </div>
            <Link to="/browse" className="text-sm text-[#3d0c1b] hover:text-[#8c7435] font-sans font-medium transition mb-1 md:ml-4">
              All Department ↓
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 font-sans snap-x">
            {categories.map((cat, index) => (
              <Link to="/browse" key={index} className="min-w-[200px] h-24 bg-[#fcfbf7] dark:bg-gray-800 shadow-sm hover:shadow-md border border-stone-200 dark:border-gray-700 border-l-4 border-l-[#6b142c] rounded-r-lg p-4 flex flex-col justify-between cursor-pointer transition-all snap-start block">
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