import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { db } from '../firebase/config';
import { doc, onSnapshot, getDoc, updateDoc, setDoc, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function ArchiveBookmarks() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Recently Bookmarked');
  const [bookmarkedPapers, setBookmarkedPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const sortOptions = [
    'Recently Bookmarked',
    'Oldest Bookmarked',
    'Title (A-Z)',
    'Title (Z-A)',
    'Most Viewed',
    'Most Liked'
  ];

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'user_bookmarks', currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const paperIds = data.bookmarks || [];
        
        // Fetch details for each bookmarked paper
        const paperPromises = paperIds.map(async (id) => {
          const pSnap = await getDoc(doc(db, 'submissions', id));
          if (pSnap.exists()) {
            const pData = pSnap.data();
            
            // Try to fetch group for author details
            let authorDisplay = pData.studentName || pData.groupName || 'Unknown Author';
            let titleDisplay = pData.researchTitle || pData.title;
            let categoryDisplay = pData.category || pData.program;

            if (pData.studentUid) {
              const { query, collection, where, getDocs } = await import('firebase/firestore');
              const qGroup = query(collection(db, 'groups'), where('leaderUid', '==', pData.studentUid));
              const gSnap = await getDocs(qGroup);
              if (!gSnap.empty) {
                const gData = gSnap.docs[0].data();
                authorDisplay = `${gData.leaderName}${gData.members && gData.members.length > 0 ? ` & ${gData.members.length} other(s)` : ''}`;
                titleDisplay = gData.researchTitle || titleDisplay;
                categoryDisplay = gData.program || categoryDisplay;
              }
            }

            return {
              id: pSnap.id,
              category: categoryDisplay || 'Uncategorized',
              dateSaved: `Saved ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
              title: titleDisplay || 'Untitled',
              authors: authorDisplay,
              tags: pData.tags || [],
              likesCount: pData.likes?.length || 0,
              views: pData.views || 0,
              createdAt: pData.publishedAt || new Date().toISOString()
            };
          }
          return null;
        });

        const results = await Promise.all(paperPromises);
        setBookmarkedPapers(results.filter(p => p !== null));
      } else {
        setBookmarkedPapers([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleRemoveBookmark = async (paperId) => {
    if (!currentUser) return;
    try {
      const bookmarkRef = doc(db, 'user_bookmarks', currentUser.uid);
      await setDoc(bookmarkRef, { bookmarks: arrayRemove(paperId) }, { merge: true });
      Swal.fire({ icon: 'success', title: 'Removed', text: 'Bookmark removed successfully', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to remove bookmark', 'error');
    }
  };

  const getSortedPapers = () => {
    const sorted = [...bookmarkedPapers];
    switch (selectedSort) {
      case 'Title (A-Z)': return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'Title (Z-A)': return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'Most Viewed': return sorted.sort((a, b) => b.views - a.views);
      case 'Most Liked': return sorted.sort((a, b) => b.likesCount - a.likesCount);
      case 'Oldest Bookmarked': return sorted.reverse(); // Simplified
      case 'Recently Bookmarked': 
      default: return sorted;
    }
  };

  const sortedPapers = getSortedPapers();

  return (
    <div className="font-serif min-h-screen flex flex-col bg-[#faf7f0] dark:bg-gray-900 transition-colors">
      <Header />

      {/* PAGE HEADER SECTION */}
      <div className="bg-[#6b142c] text-white px-8 md:px-16 py-10 shadow-inner">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#d6ad60] text-xs font-bold tracking-widest uppercase font-sans mb-1">
            My Library
          </p>
          <h1 className="text-4xl font-bold tracking-wide">My Bookmarks</h1>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        
        {!currentUser ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-gray-200 mb-4">Please Log In</h2>
            <p className="text-stone-500 dark:text-gray-400 mb-6">You need to log in to view and save bookmarks.</p>
            <Link to="/login" className="px-6 py-2 bg-[#7a2039] text-white rounded">Go to Login</Link>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-4 w-full">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-[#fdfbf7] dark:bg-gray-800 border border-stone-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between p-6 gap-6 rounded animate-pulse w-full">
                <div className="flex-1 font-sans">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-5 w-24 bg-stone-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-20 bg-stone-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-stone-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-stone-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-stone-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="h-5 w-16 bg-stone-200 dark:bg-gray-700 rounded-full"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center md:w-36 flex-shrink-0 gap-3 w-full">
                  <div className="h-8 w-full bg-stone-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-8 w-full bg-stone-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedPapers.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-gray-200 mb-4">No Bookmarks Yet</h2>
            <p className="text-stone-500 dark:text-gray-400 mb-6">You haven't saved any research papers to your library.</p>
            <Link to="/browse" className="px-6 py-2 bg-[#7a2039] text-white rounded">Browse Papers</Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end border-b border-stone-300 dark:border-gray-700 mb-6 pb-2 font-sans relative">
              <div className="flex gap-6">
                <button className="text-[#7a2039] border-b-2 border-[#7a2039] pb-2 px-1 font-bold text-sm translate-y-[9px]">
                  All ({sortedPapers.length})
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 px-3 py-1.5 rounded shadow-sm hover:bg-stone-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <span>⏱️</span>
                  <span>{selectedSort}</span>
                  <span className="text-[10px] text-stone-400">▼</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-md shadow-lg z-50 flex flex-col overflow-hidden text-xs font-sans">
                    {sortOptions.map((option, index) => {
                      const isSelected = selectedSort === option;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedSort(option);
                            setIsDropdownOpen(false);
                          }}
                          className={`text-left px-4 py-3 border-b border-stone-100 dark:border-gray-700 last:border-b-0 flex items-center gap-2 transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab] font-medium'
                              : 'text-stone-600 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className={`w-3 font-bold ${isSelected ? 'text-[#7a2039] dark:text-[#f3e5ab]' : ''}`}>
                            {isSelected ? '✓' : ''}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* BOOKMARKS LIST */}
            <div className="flex flex-col gap-4">
              {sortedPapers.map((paper) => (
                <div key={paper.id} className="bg-[#fdfbf7] dark:bg-gray-800 border border-stone-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between p-6 gap-6 rounded hover:shadow-md transition-colors">
                  
                  <div className="flex-1 font-sans">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-[#f2ead3] dark:bg-gray-700 border border-[#e5d4a6] dark:border-gray-600 text-[#7a2039] dark:text-[#f3e5ab] font-medium text-[10px] rounded">
                        {paper.category}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-gray-500">{paper.dateSaved}</span>
                    </div>
                    
                    <h2 className="text-lg font-bold text-stone-900 dark:text-gray-100 mb-1 leading-snug font-serif">
                      {paper.title}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">{paper.authors}</p>
                    
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {paper.tags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-stone-100 dark:bg-gray-700 border border-stone-200 dark:border-gray-600 text-stone-600 dark:text-gray-300 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center md:w-36 flex-shrink-0 gap-3 font-sans">
                    
                    <Link 
                      to={`/viewer/${paper.id}`} 
                      className="w-full py-2 bg-[#7a2039] text-white text-xs font-medium rounded hover:bg-[#5a1528] transition cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      View Paper
                    </Link>
                    
                    <button 
                      onClick={() => handleRemoveBookmark(paper.id)}
                      className="w-full py-2 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-600 text-stone-500 dark:text-gray-400 text-xs rounded hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 7 21V6.923l-3-3M17 5v8.586l-2-2V5H9.414l-2-2H17a2 2 0 012 2v10.586l-2-2z" /></svg>
                      Remove
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ArchiveBookmarks;