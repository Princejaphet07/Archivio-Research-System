import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Handle Ctrl+K / Cmd+K to open, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened and fetch data if not fetched
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      if (!hasFetched) {
        fetchPapers();
      }
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      // First get groups to match authors
      const qGroups = query(collection(db, 'groups'));
      const groupSnap = await getDocs(qGroups);
      const groupsList = groupSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Then get published submissions
      const qSubs = query(collection(db, 'submissions'), where('reviewStatus', '==', 'published'));
      const subSnap = await getDocs(qSubs);
      
      const enrichedPapers = subSnap.docs.map(docSnap => {
        const sub = { id: docSnap.id, ...docSnap.data() };
        const group = groupsList.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
        const manuscriptName = sub.documents?.['Final Manuscript']?.name?.replace('.pdf', '');

        return {
          ...sub,
          researchTitle: group?.researchTitle || sub.researchTitle || sub.title || manuscriptName,
          authorDisplay: group
            ? [group.leaderName, ...(group.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
            : sub.studentName || 'Unknown Author'
        };
      });

      setPapers(enrichedPapers);
      setHasFetched(true);
    } catch (err) {
      console.error("Failed to fetch papers for search:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter papers when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPapers([]);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const results = papers.filter(p => {
      const titleMatch = (p.researchTitle || p.title || '').toLowerCase().includes(lowerQuery);
      const authorMatch = (p.authorDisplay || '').toLowerCase().includes(lowerQuery);
      const keywordMatch = (p.keywords || []).some(k => k.toLowerCase().includes(lowerQuery));
      return titleMatch || authorMatch || keywordMatch;
    });

    setFilteredPapers(results.slice(0, 8)); // Show top 8 results
    setSelectedIndex(0);
  }, [searchQuery, papers]);

  // Handle keyboard navigation in results
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredPapers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPapers.length > 0 && filteredPapers[selectedIndex]) {
        navigateToPaper(filteredPapers[selectedIndex].id);
      }
    }
  };

  const navigateToPaper = (id) => {
    setIsOpen(false);
    navigate(`/viewer/${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4 font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      ></div>
      
      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgb(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgb(0,0,0,0.4)] border border-white dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Search Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-stone-200/50 dark:border-gray-700/50 relative">
          <svg className="w-6 h-6 text-[#7a2039] dark:text-[#f3e5ab] ml-2 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-xl text-stone-800 dark:text-gray-100 placeholder-stone-400 focus:outline-none"
            placeholder="Search papers by title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <div className="flex items-center gap-1.5 ml-3">
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-sans font-medium text-stone-500 bg-stone-100 dark:bg-gray-700 dark:text-gray-400 border border-stone-200 dark:border-gray-600 rounded">ESC</kbd>
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar" ref={resultsRef}>
          {loading && (
            <div className="px-6 py-8 text-center text-stone-500 flex items-center justify-center gap-3">
               <div className="w-5 h-5 border-2 border-[#7a2039]/30 border-t-[#7a2039] rounded-full animate-spin"></div>
               Loading archives...
            </div>
          )}
          
          {!loading && searchQuery.trim() && filteredPapers.length === 0 && (
            <div className="px-6 py-12 text-center text-stone-500">
              <span className="text-3xl mb-3 block">📄</span>
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}

          {!loading && filteredPapers.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-bold text-stone-400 dark:text-gray-500 uppercase tracking-widest">
                Researches
              </div>
              <ul className="flex flex-col">
                {filteredPapers.map((paper, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <li 
                      key={paper.id}
                      className={`px-4 py-3 mx-2 rounded-lg cursor-pointer flex items-start gap-4 transition-colors ${
                        isSelected 
                          ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/10 text-[#7a2039] dark:text-[#f3e5ab]' 
                          : 'hover:bg-stone-50 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => navigateToPaper(paper.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className={`mt-1 w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#7a2039] text-white' : 'bg-stone-100 dark:bg-gray-700 text-stone-500 dark:text-gray-400'}`}>
                        📄
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-800 dark:text-gray-200'}`}>
                          {paper.researchTitle || paper.title || 'Untitled'}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-gray-400 truncate mt-0.5">
                          {paper.authorDisplay} • {paper.program || 'Research'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="hidden sm:flex items-center self-center text-xs text-[#7a2039] dark:text-[#f3e5ab] font-medium">
                          Enter ↵
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!loading && !searchQuery.trim() && (
            <div className="px-6 py-8 text-center text-stone-500 dark:text-gray-400 flex flex-col items-center">
              <p className="text-sm">Type anything to search the archive.</p>
              <div className="flex gap-4 mt-4 opacity-50">
                <span className="text-xs bg-stone-100 dark:bg-gray-700 px-2 py-1 rounded border border-stone-200 dark:border-gray-600">↑↓ to navigate</span>
                <span className="text-xs bg-stone-100 dark:bg-gray-700 px-2 py-1 rounded border border-stone-200 dark:border-gray-600">Enter to select</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
