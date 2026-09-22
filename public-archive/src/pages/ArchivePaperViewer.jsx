import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, collection, getDocs, query, where, onSnapshot, updateDoc, setDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Swal from 'sweetalert2';
import logo from '../assets/logo.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import ForceGraph2D from 'react-force-graph-2d';
import { normalizeDepartment } from '../utils/normalizeDepartment';
import {
  trackPaperView,
  trackBookmark,
  trackLike,
  trackCitation,
  trackAiChat
} from '../utils/analytics';
import { getBackendUrl } from '../utils/backendUrl';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Thumbnail component with on-scroll IntersectionObserver to dynamically load all page previews
function SidebarThumbnailItem({
  pageNum,
  currentPage,
  isMobile,
  scrollToPage,
  isDrawer,
  setIsMobileDrawerOpen,
}) {
  const [isVisible, setIsVisible] = useState(() => Math.abs(pageNum - currentPage) <= 4 || pageNum <= 6);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isVisible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '350px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-1.5 mb-2">
      <button
        type="button"
        onClick={() => {
          scrollToPage(pageNum);
          if (isDrawer) setIsMobileDrawerOpen(false);
        }}
        className={`w-24 sm:w-28 bg-white dark:bg-gray-700 cursor-pointer transition-all overflow-hidden rounded ${
          currentPage === pageNum
            ? 'ring-2 ring-[#7a2039] dark:ring-[#f3e5ab] shadow-md'
            : 'border border-stone-300 dark:border-gray-600 hover:border-stone-400 shadow-sm'
        }`}
      >
        {isVisible ? (
          <Page
            pageNumber={pageNum}
            width={isMobile ? 96 : 112}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="h-32 bg-stone-100 dark:bg-gray-700 flex flex-col items-center justify-center text-stone-400 text-xs animate-pulse">
                <span>P. {pageNum}</span>
              </div>
            }
          />
        ) : (
          <div className="h-32 bg-stone-100 dark:bg-gray-700 flex items-center justify-center text-stone-400 text-xs">
            P. {pageNum}
          </div>
        )}
      </button>
      <span
        className={`text-[11px] font-bold ${
          currentPage === pageNum
            ? 'text-[#7a2039] dark:text-[#f3e5ab]'
            : 'text-stone-500 dark:text-gray-400'
        }`}
      >
        Page {pageNum}
      </span>
    </div>
  );
}

function ArchivePaperViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Responsive & Mobile Drawer State
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState(typeof window !== 'undefined' && window.innerWidth >= 768 ? 'toc' : null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const pageRefsMap = useRef({});
  const scrollContainerRef = useRef(null);
  const [relatedPapers, setRelatedPapers] = useState([]);
  const [isMapView, setIsMapView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Smart Dictionary State
  const [dictPopup, setDictPopup] = useState({
    isOpen: false,
    word: '',
    definition: '',
    loading: false,
    x: 0,
    y: 0
  });

  // Responsive PDF base width & zoom level
  const [pdfBaseWidth, setPdfBaseWidth] = useState(800);
  const [zoomLevel, setZoomLevel] = useState(1);

  // PDF source state with Blob URL to eliminate Cross-Origin Range Request redirects
  const [pdfSource, setPdfSource] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  // Accurate page destinations for each of the 5 canonical chapters
  const [chapterPages, setChapterPages] = useState({
    chap1: 1,
    chap2: 5,
    chap3: 10,
    chap4: 15,
    chap5: 20
  });

  // PDF.js options to disable range requests & streaming (which cause Firebase Storage redirect errors)
  const pdfOptions = useMemo(() => ({
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
  }), []);

  useEffect(() => {
    const rawUrl = paper?.documents?.['Final Manuscript']?.url;
    setChapterPages({
      chap1: 1,
      chap2: 5,
      chap3: 10,
      chap4: 15,
      chap5: 20
    });
    if (!rawUrl || rawUrl === '#') {
      setPdfSource(null);
      setIsPdfLoading(false);
      return;
    }

    let isCancelled = false;
    let localBlobUrl = null;
    setIsPdfLoading(true);

    const fetchPdf = async () => {
      try {
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!isCancelled) {
          localBlobUrl = URL.createObjectURL(blob);
          setPdfSource(localBlobUrl);
          setIsPdfLoading(false);
        }
      } catch (fetchErr) {
        console.warn("Could not pre-fetch PDF as blob, falling back to direct URL with disableRange:", fetchErr);
        if (!isCancelled) {
          setPdfSource({
            url: rawUrl,
            disableRange: true,
            disableStream: true,
            disableAutoFetch: true,
          });
          setIsPdfLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      isCancelled = true;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [paper?.documents?.['Final Manuscript']?.url]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const leftNavWidth = (mobile || isFullscreen) ? 0 : 56;
      const padding = mobile ? 12 : 24;
      const availableWidth = window.innerWidth - leftNavWidth - padding;
      setPdfBaseWidth(Math.min(Math.max(280, availableWidth), 850));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const currentPdfWidth = Math.round(pdfBaseWidth * zoomLevel);
  const currentPdfHeight = Math.round(currentPdfWidth * 1.414);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.5, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.75, +(prev - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // Deep detection: scan PDF outline and chapter headings to accurately find page numbers
  const detectChapters = useCallback(async (pdfDoc) => {
    if (!pdfDoc) return;
    const total = pdfDoc.numPages || 1;
    const detected = {};

    // Helper: recursively flatten outline tree so all bookmarks are examined
    const flattenOutline = (items) => {
      let list = [];
      if (!items || !Array.isArray(items)) return list;
      for (const it of items) {
        list.push(it);
        if (it.items && Array.isArray(it.items) && it.items.length > 0) {
          list = list.concat(flattenOutline(it.items));
        }
      }
      return list;
    };

    // 1. Check embedded PDF outline/bookmarks first
    try {
      const rawOutline = await pdfDoc.getOutline();
      const outline = flattenOutline(rawOutline);
      if (outline && outline.length > 0) {
        for (const item of outline) {
          if (!item.title || !item.title.trim()) continue;
          const cleanTitle = item.title.trim().toLowerCase();

          // Skip generic or non-chapter outline bookmarks
          if (cleanTitle.includes('table of contents') || cleanTitle.includes('title page') || cleanTitle.includes('approval') || cleanTitle.includes('acknowledgement') || cleanTitle.includes('dedication')) {
            continue;
          }

          let pageNum = null;
          try {
            if (typeof item.dest === 'string') {
              const dest = await pdfDoc.getDestination(item.dest);
              if (dest && dest[0]) {
                const pageIdx = await pdfDoc.getPageIndex(dest[0]);
                pageNum = pageIdx + 1;
              }
            } else if (Array.isArray(item.dest) && item.dest[0]) {
              const pageIdx = await pdfDoc.getPageIndex(item.dest[0]);
              pageNum = pageIdx + 1;
            }
          } catch (_) {}

          if (pageNum && pageNum >= 1 && pageNum <= total) {
            if (!detected.chap1 && (cleanTitle.includes('chapter 1') || cleanTitle.includes('chapter i') || cleanTitle === 'introduction' || cleanTitle.startsWith('introduction') || cleanTitle.includes('the problem'))) {
              detected.chap1 = pageNum;
            } else if (!detected.chap2 && (cleanTitle.includes('chapter 2') || cleanTitle.includes('chapter ii') || cleanTitle.includes('review of related literature') || cleanTitle.includes('review of literature') || cleanTitle.includes('literature'))) {
              detected.chap2 = pageNum;
            } else if (!detected.chap3 && (cleanTitle.includes('chapter 3') || cleanTitle.includes('chapter iii') || cleanTitle.includes('methodology') || cleanTitle.includes('research method') || cleanTitle.includes('methods of research'))) {
              detected.chap3 = pageNum;
            } else if (!detected.chap4 && (cleanTitle.includes('chapter 4') || cleanTitle.includes('chapter iv') || cleanTitle.includes('results') || cleanTitle.includes('presentation') || cleanTitle.includes('analysis of data') || cleanTitle.includes('findings'))) {
              detected.chap4 = pageNum;
            } else if (!detected.chap5 && (cleanTitle.includes('chapter 5') || cleanTitle.includes('chapter v') || cleanTitle.includes('conclusion') || cleanTitle.includes('summary') || cleanTitle.includes('recommendation'))) {
              detected.chap5 = pageNum;
            }
          }
        }
      }
    } catch (_) {}

    // 2. Background batch text scan for any chapter not found in outline
    const missingKeys = ['chap1', 'chap2', 'chap3', 'chap4', 'chap5'].filter(k => !detected[k]);
    if (missingKeys.length > 0) {
      try {
        const batchSize = 10;
        for (let i = 1; i <= total; i += batchSize) {
          const batch = [];
          for (let j = i; j < i + batchSize && j <= total; j++) {
            batch.push((async (pNum) => {
              try {
                const page = await pdfDoc.getPage(pNum);
                const tc = await page.getTextContent();
                const text = tc.items.map(it => it.str).join(' ');
                return { pNum, text };
              } catch (_) {
                return { pNum, text: '' };
              }
            })(j));
          }

          const results = await Promise.all(batch);
          for (const { pNum, text } of results) {
            if (!text) continue;

            // Skip Table of Contents list pages that list multiple chapters together
            let mentionCount = 0;
            if (/\bCHAPTER\s*[:.-]?\s*(?:1|I|ONE)\b/i.test(text)) mentionCount++;
            if (/\bCHAPTER\s*[:.-]?\s*(?:2|II|TWO)\b/i.test(text)) mentionCount++;
            if (/\bCHAPTER\s*[:.-]?\s*(?:3|III|THREE)\b/i.test(text)) mentionCount++;
            if (/\bCHAPTER\s*[:.-]?\s*(?:4|IV|FOUR)\b/i.test(text)) mentionCount++;
            if (/\bCHAPTER\s*[:.-]?\s*(?:5|V|FIVE)\b/i.test(text)) mentionCount++;
            if (mentionCount >= 2 || /\bTABLE\s+OF\s+CONTENTS\b/i.test(text)) continue;

            if (!detected.chap1 && (/\bCHAPTER\s*[:.-]?\s*(?:1|I|ONE)\b/i.test(text) || (pNum > 2 && pNum < total * 0.35 && /\bINTRODUCTION\b/i.test(text)))) {
              detected.chap1 = pNum;
            }
            if (!detected.chap2 && pNum > (detected.chap1 || 0) && (/\bCHAPTER\s*[:.-]?\s*(?:2|II|TWO)\b/i.test(text) || /\bREVIEW\s+OF\s+(?:RELATED\s+)?LITERATURE\b/i.test(text))) {
              detected.chap2 = pNum;
            }
            if (!detected.chap3 && pNum > (detected.chap2 || detected.chap1 || 0) && (/\bCHAPTER\s*[:.-]?\s*(?:3|III|THREE)\b/i.test(text) || /\b(?:RESEARCH\s+)?METHODOLOGY\b/i.test(text) || /\bMETHODS?\s+OF\s+RESEARCH\b/i.test(text))) {
              detected.chap3 = pNum;
            }
            if (!detected.chap4 && pNum > (detected.chap3 || detected.chap2 || 0) && (/\bCHAPTER\s*[:.-]?\s*(?:4|IV|FOUR)\b/i.test(text) || /\bRESULTS?\s+(?:AND|&)\s+DISCUSSION\b/i.test(text) || /\bPRESENTATION(?:,\s*ANALYSIS)?\s+(?:AND|&)\s+(?:INTERPRETATION\s+OF\s+)?DATA\b/i.test(text))) {
              detected.chap4 = pNum;
            }
            if (!detected.chap5 && pNum > (detected.chap4 || detected.chap3 || 0) && (/\bCHAPTER\s*[:.-]?\s*(?:5|V|FIVE)\b/i.test(text) || /\b(?:SUMMARY\s+(?:OF\s+FINDINGS)?,\s*)?CONCLUSIONS?(?:\s+(?:AND|&)\s+RECOMMENDATIONS)?\b/i.test(text))) {
              detected.chap5 = pNum;
            }
          }

          if (detected.chap1 && detected.chap2 && detected.chap3 && detected.chap4 && detected.chap5) {
            break;
          }
        }
      } catch (_) {}
    }

    // Set accurate destination pages with guaranteed strictly ascending order
    const c1 = detected.chap1 || (total > 15 ? Math.max(1, Math.round(total * 0.08)) : 1);
    const c2 = Math.max(c1 + 1, detected.chap2 || (total > 15 ? Math.round(total * 0.22) : 5));
    const c3 = Math.max(c2 + 1, detected.chap3 || (total > 15 ? Math.round(total * 0.45) : 10));
    const c4 = Math.max(c3 + 1, detected.chap4 || (total > 15 ? Math.round(total * 0.65) : 15));
    const c5 = Math.min(total, Math.max(c4 + 1, detected.chap5 || (total > 15 ? Math.round(total * 0.82) : 20)));

    setChapterPages({
      chap1: c1,
      chap2: c2,
      chap3: c3,
      chap4: c4,
      chap5: c5,
    });
  }, []);

  const onDocumentLoadSuccess = useCallback((pdfDoc) => {
    const pages = pdfDoc?.numPages || 0;
    setNumPages(pages);
    if (pdfDoc) {
      detectChapters(pdfDoc);
    }
  }, [detectChapters]);

  const scrollToPage = useCallback((pg) => {
    const clamped = Math.max(1, Math.min(numPages || pg, pg));
    setCurrentPage(clamped);
    const el = pageRefsMap.current[clamped];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [numPages]);

  const handleScrollActivity = useCallback(() => {
    setIsScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1200);
  }, []);

  // Track currently visible page via IntersectionObserver during continuous scroll
  useEffect(() => {
    if (!numPages || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry = null;
        let maxRatio = 0;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        });
        if (bestEntry && bestEntry.intersectionRatio > 0.05) {
          const pg = parseInt(bestEntry.target.dataset.page, 10);
          if (!isNaN(pg)) {
            setCurrentPage(pg);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.05, 0.2, 0.5, 0.8],
      }
    );

    Object.values(pageRefsMap.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // AI Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState(null);
  const chatEndRef = useRef(null);

  const AI_SUGGESTIONS = [
    {
      label: '📋 Summarize Paper',
      prompt: 'Please provide a comprehensive and detailed academic summary of this research paper covering its background rationale, research objectives, conceptual framework, methodology, key findings, and final conclusions.'
    },
    {
      label: '🔬 Methodology',
      prompt: 'What research design, methodology, participants, data collection instruments, and evaluation methods were utilized in this study?'
    },
    {
      label: '📊 Key Results',
      prompt: 'What are the key statistical findings, evaluation results, and major outcomes presented in Chapter 4 of this research paper?'
    },
    {
      label: '🎯 Objectives',
      prompt: 'What is the core problem statement, general objective, and specific objectives of this research study?'
    },
    {
      label: '📌 Conclusions',
      prompt: 'What are the main conclusions and future recommendations formulated by the researchers in this manuscript?'
    }
  ];

  useEffect(() => {
    if (isAiOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isAiOpen]);

  // Bookmark State
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    let unsubBookmark = () => { };
    if (paper) {
      if (currentUser) {
        unsubBookmark = onSnapshot(doc(db, 'user_bookmarks', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsBookmarked(data.bookmarks?.includes(paper.id) || false);
          }
        });
      } else {
        setIsBookmarked(false);
      }
    }
    return () => unsubBookmark();
  }, [currentUser, paper]);

  useEffect(() => {
    // Anti-Screenshot & Print Protections
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('Screenshots disabled.');
        Swal.fire('Warning', 'Screenshots are disabled for academic integrity.', 'warning');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        Swal.fire('Warning', 'Printing is disabled for academic integrity.', 'warning');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };

    const handleBlur = () => {
      // NEVER blur on mobile/touch devices - causes white screen and crashes
      if (window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0) return;
      document.body.style.filter = 'blur(15px)';
      document.body.style.transition = 'filter 0.1s';
    };

    const handleFocus = () => {
      document.body.style.filter = 'none';
    };

    const clearBlur = () => {
      if (document.body.style.filter !== 'none') {
        document.body.style.filter = 'none';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pointerdown', clearBlur);
    window.addEventListener('touchstart', clearBlur, { passive: true });
    window.addEventListener('click', clearBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pointerdown', clearBlur);
      window.removeEventListener('touchstart', clearBlur);
      window.removeEventListener('click', clearBlur);
      document.body.style.filter = 'none';
    };
  }, []);

  useEffect(() => {
    let unsubGroup = () => { };

    const unsubSub = onSnapshot(doc(db, 'submissions', id), async (docSnap) => {
      if (docSnap.exists()) {
        const subData = { id: docSnap.id, ...docSnap.data() };
        // Handle group fetching for author details
        if (subData.studentUid) {
          const qGroup = query(collection(db, 'groups'), where('leaderUid', '==', subData.studentUid));
          unsubGroup = onSnapshot(qGroup, (groupSnap) => {
            let groupData = null;
            if (!groupSnap.empty) {
              const matchedDoc = groupSnap.docs.find(d => {
                const g = d.data();
                if (subData.groupId && d.id === subData.groupId) return true;
                if (subData.researchTitle && g.researchTitle === subData.researchTitle) return true;
                if (subData.title && g.researchTitle === subData.title) return true;
                return false;
              });
              groupData = matchedDoc ? matchedDoc.data() : (groupSnap.docs.length === 1 ? groupSnap.docs[0].data() : null);
            }
            setPaper({
              ...subData,
              researchTitle: subData.researchTitle || groupData?.researchTitle || subData.title,
              authorDisplay: groupData
                ? [groupData.leaderName, ...(groupData.members || []).map(m => typeof m === 'object' ? m.name : m.split('@')[0])].filter(Boolean).join(', ')
                : subData.studentName || subData.groupName || 'Unknown Author',
              program: subData.program || groupData?.program,
              abstract: subData.abstract || groupData?.abstract
            });
            setTimeout(() => setLoading(false), 500);
          });
        } else {
          setPaper({
            ...subData,
            researchTitle: subData.researchTitle || subData.title,
            authorDisplay: subData.studentName || subData.groupName || 'Unknown Author',
            program: subData.program,
            abstract: subData.abstract
          });
          setTimeout(() => setLoading(false), 500);
        }
      } else {
        console.error("Paper not found");
        setError("Paper not found");
        setTimeout(() => setLoading(false), 500);
      }
    }, (err) => {
      console.error('Error fetching paper:', err);
      setError(err.message);
      setTimeout(() => setLoading(false), 500);
    });

    return () => {
      unsubSub();
      unsubGroup();
    };
  }, [id]);

  // Fetch Related Researches
  useEffect(() => {
    if (!paper) return;

    const fetchRelated = async () => {
      try {
        const qRelated = query(
          collection(db, 'submissions'),
          where('reviewStatus', '==', 'published')
        );
        const snapshot = await getDocs(qRelated);
        const currentDept = normalizeDepartment(paper.program || paper.department || paper.category);
        const related = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(doc => doc.id !== paper.id && normalizeDepartment(doc.program || doc.department || doc.category) === currentDept)
          .slice(0, 15);

        setRelatedPapers(related);
      } catch (err) {
        console.error('Failed to fetch related papers', err);
      }
    };
    fetchRelated();
  }, [paper]);

  const graphData = useMemo(() => {
    if (!paper || relatedPapers.length === 0) return { nodes: [], links: [] };

    const nodes = [
      { id: paper.id, name: paper.researchTitle || paper.title, group: 'current', val: 25 },
      ...relatedPapers.map(rp => ({
        id: rp.id,
        name: rp.researchTitle || rp.title,
        group: 'related',
        val: 10
      }))
    ];

    const links = [];
    relatedPapers.forEach(rp => {
      links.push({ source: paper.id, target: rp.id, color: '#f3e5ab' });
    });

    for (let i = 0; i < relatedPapers.length; i++) {
      for (let j = i + 1; j < relatedPapers.length; j++) {
        const rp1 = relatedPapers[i];
        const rp2 = relatedPapers[j];
        if (rp1.keywords && rp2.keywords) {
          const common = rp1.keywords.filter(k => rp2.keywords.includes(k));
          if (common.length > 0) {
            links.push({ source: rp1.id, target: rp2.id, color: '#d6ad60' });
          }
        }
      }
    }

    return { nodes, links };
  }, [paper, relatedPapers]);

  const hasIncremented = useRef(false);
  const hasTrackedAnalytics = useRef(false);

  // Increment view count when paper viewer opens (session-deduplicated)
  useEffect(() => {
    if (id && !hasIncremented.current) {
      const viewedKey = `archivio_viewed_${id}`;
      if (sessionStorage.getItem(viewedKey)) {
        hasIncremented.current = true;
        return;
      }

      hasIncremented.current = true;
      sessionStorage.setItem(viewedKey, '1');

      const docRef = doc(db, 'submissions', id);
      updateDoc(docRef, { views: increment(1) })
        .catch(err => {
          console.warn("View increment failed, retrying once:", err.message);
          setTimeout(() => {
            updateDoc(docRef, { views: increment(1) })
              .catch(retryErr => console.error("View increment retry failed:", retryErr.message));
          }, 1500);
        });
    }
  }, [id]);

  // Track paper readership in Google Analytics
  useEffect(() => {
    if (paper && !hasTrackedAnalytics.current) {
      hasTrackedAnalytics.current = true;
      trackPaperView(paper);
    }
  }, [paper]);

  // Initialize Chat when paper loads
  useEffect(() => {
    if (paper && chatHistory.length === 0) {
      setChatHistory([
        { role: 'model', content: `Hi! I'm reading **"${paper.researchTitle || 'Untitled Research'}"**. What would you like to know about it?` }
      ]);
    }
  }, [paper, chatHistory.length]);

  const handleChatSubmit = async (e, customMsg = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const userMessage = (customMsg || chatInput).trim();
    if (!userMessage || isTyping) return;

    if (!customMsg) setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    trackAiChat(paper, userMessage.length);

    try {
      const backendUrl = getBackendUrl();
      const pdfUrlToUse = paper?.documents?.['Final Manuscript']?.url || paper?.pdfUrl || paper?.fileUrl;
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paper: {
            researchTitle: paper.researchTitle || paper.title || 'Untitled',
            authorDisplay: paper.authorDisplay || 'Unknown',
            abstract: paper.abstract || '',
            keywords: paper.keywords || [],
            publishedAt: paper.publishedAt || null
          },
          chatHistory: chatHistory.slice(1),
          userMessage,
          pdfUrl: pdfUrlToUse && pdfUrlToUse !== '#' ? pdfUrlToUse : undefined
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Backend server returned an invalid response. Please verify backend service status.", { cause: jsonErr });
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setChatHistory(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err) {
      console.error("AI Error:", err);
      setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ **Error:** ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTabClick = (tab) => {
    if (isMobile) {
      setActiveTab(tab);
      setIsMobileDrawerOpen(true);
    } else {
      setActiveTab(prev => prev === tab ? null : tab);
      setIsFullscreen(false);
    }
  };

  const handleToggleAudio = () => {
    if (!paper || !paper.abstract) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(paper.abstract);
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleAbstractDoubleClick = async (e) => {
    const selection = window.getSelection();
    const word = selection.toString().trim().replace(/[^a-zA-Z]/g, '');

    if (word && word.length > 1) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setDictPopup({
        isOpen: true,
        word: word,
        definition: '',
        loading: true,
        x: rect.left + (rect.width / 2),
        y: rect.top - 10
      });

      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        let def = '';
        if (data && data[0] && data[0].meanings && data[0].meanings[0].definitions) {
          def = data[0].meanings[0].definitions[0].definition;
        } else {
          def = "Definition not found.";
        }

        setDictPopup(prev => ({ ...prev, definition: def, loading: false }));
      } catch (err) {
        setDictPopup(prev => ({ ...prev, definition: "Definition not found.", loading: false }));
      }
    }
  };

  useEffect(() => {
    const closePopup = () => setDictPopup(prev => ({ ...prev, isOpen: false }));
    if (dictPopup.isOpen) {
      window.addEventListener('click', closePopup);
    }
    return () => window.removeEventListener('click', closePopup);
  }, [dictPopup.isOpen]);

  const generateRIS = () => {
    if (!paper) return;
    const titleStr = paper.researchTitle || paper.title || 'Untitled';
    const authorStr = paper.authorDisplay || 'Unknown Author';
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();
    const content = [
      'TY  - RPRT',
      `TI  - ${titleStr}`,
      `AU  - ${authorStr}`,
      `PY  - ${yearStr}`,
      `PB  - SWU PHINMA`,
      `UR  - ${window.location.href}`,
      `AB  - ${paper.abstract || ''}`,
      'ER  - '
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleStr.replace(/\s+/g, '_')}.ris`;
    a.click();
    URL.revokeObjectURL(url);
    trackCitation(paper, 'RIS');
  };

  const generateBibTeX = () => {
    if (!paper) return;
    const titleStr = paper.researchTitle || paper.title || 'Untitled';
    const authorStr = paper.authorDisplay || 'Unknown Author';
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();
    const citationKey = `${authorStr.split(',')[0].replace(/\s+/g, '')}${yearStr}`;
    const content = [
      `@techreport{${citationKey},`,
      `  title = {${titleStr}},`,
      `  author = {${authorStr}},`,
      `  year = {${yearStr}},`,
      `  institution = {SWU PHINMA},`,
      `  url = {${window.location.href}}`,
      `}`
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titleStr.replace(/\s+/g, '_')}.bib`;
    a.click();
    URL.revokeObjectURL(url);
    trackCitation(paper, 'BibTeX');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    trackCitation(paper, 'Link');
    Swal.fire({
      title: 'Link Copied',
      text: 'The link has been copied to your clipboard.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleChapterClick = (targetPage) => {
    const pageNum = typeof targetPage === 'number' ? targetPage : parseInt(targetPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1) {
      scrollToPage(pageNum);
      if (isMobile) {
        setIsMobileDrawerOpen(false);
      }
    }
  };

  const handleLike = async () => {
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

  const handleBookmarkToggle = async () => {
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

    try {
      const bookmarkRef = doc(db, 'user_bookmarks', currentUser.uid);
      await setDoc(bookmarkRef, { bookmarks: arrayUnion(paper.id) }, { merge: true });
      Swal.fire({ title: 'Saved!', text: 'Paper saved to your Bookmarks.', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error('Bookmark error:', err);
      Swal.fire('Error', 'Failed to update bookmarks', 'error');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) setIsAiOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#e5e5e5] dark:bg-gray-900 overflow-hidden">
        {/* Header Skeleton */}
        <header className="bg-[#5a1528] px-6 py-4 flex justify-between items-center z-20 h-[60px]">
          <div className="h-6 w-32 rounded animate-shimmer"></div>
          <div className="flex gap-4">
            <div className="h-6 w-16 rounded hidden sm:block animate-shimmer"></div>
            <div className="h-8 w-8 rounded-full animate-shimmer"></div>
          </div>
        </header>

        {/* Main Workspace Skeleton */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-14 md:w-16 bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col items-center py-4 gap-4 flex-shrink-0 z-10 hidden md:flex">
            <div className="w-10 h-10 rounded animate-shimmer"></div>
            <div className="w-10 h-10 rounded animate-shimmer"></div>
            <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>
            <div className="w-10 h-10 rounded animate-shimmer"></div>
            <div className="w-10 h-10 rounded animate-shimmer"></div>
          </div>

          <div className="w-64 lg:w-72 bg-[#fdfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 p-4 flex flex-col hidden md:flex z-10">
            <div className="h-5 w-24 rounded mb-6 animate-shimmer"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 w-full rounded animate-shimmer"></div>)}
            </div>
          </div>

          <div className="flex-1 p-2 md:p-8 flex justify-center bg-[#e5e5e5] dark:bg-gray-900 overflow-hidden">
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-xl border border-stone-200 dark:border-gray-700 p-6 md:p-12 lg:p-20 flex flex-col h-full rounded-sm">
              <div className="h-8 md:h-10 w-3/4 rounded mb-6 mx-auto animate-shimmer"></div>
              <div className="h-4 w-1/2 rounded mb-8 mx-auto animate-shimmer"></div>
              <div className="space-y-4 mb-8">
                <div className="h-4 w-full rounded animate-shimmer"></div>
                <div className="h-4 w-full rounded animate-shimmer"></div>
                <div className="h-4 w-5/6 rounded animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#e5e5e5] dark:bg-gray-900 transition-colors">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-gray-100 mb-4">Document Not Found</h1>
        <Link to="/browse" className="px-6 py-2 bg-[#7a2039] text-white rounded font-medium">Back to Browse</Link>
      </div>
    );
  }

  const title = paper.researchTitle || 'Untitled Research';
  const authorName = paper.authorDisplay;
  const adviser = paper.adviserName || 'Unknown Adviser';
  const year = new Date(paper.publishedAt || Date.now()).getFullYear();

  // Reusable Tab Content Renderer
  const renderTabContent = (isDrawer = false) => {
    if (!activeTab) return null;

    if (activeTab === 'abstract') {
      return (
        <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors">
          <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">Abstract</h2>
            {paper.abstract && (
              <button
                onClick={handleToggleAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition cursor-pointer shadow-sm ${isSpeaking ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#7a2039] hover:bg-[#5a1528] text-white'}`}
              >
                {isSpeaking ? 'Stop ⏹️' : 'Play 🎧'}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
            <p
              onDoubleClick={handleAbstractDoubleClick}
              className="text-xs sm:text-sm text-stone-600 dark:text-gray-300 leading-relaxed text-justify indent-6 selection:bg-[#7a2039]/20 selection:text-[#7a2039]"
              title="Double-click any word for its definition"
            >
              {paper.abstract || 'No abstract available for this research paper.'}
            </p>

            {dictPopup.isOpen && (
              <div
                className="absolute z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-[#7a2039]/20 dark:border-[#f3e5ab]/20 shadow-xl rounded-lg p-3 w-48 -translate-x-1/2 -translate-y-full"
                style={{ left: Math.min(Math.max(100, dictPopup.x), 200), top: dictPopup.y - 120 }}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[#7a2039] dark:text-[#f3e5ab] text-xs capitalize">{dictPopup.word}</h4>
                  <button onClick={() => setDictPopup(prev => ({ ...prev, isOpen: false }))} className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
                </div>
                <div className="text-[10px] text-stone-600 dark:text-gray-300 leading-snug max-h-24 overflow-y-auto custom-scrollbar">
                  {dictPopup.loading ? (
                    <span className="animate-pulse">Loading definition...</span>
                  ) : (
                    dictPopup.definition
                  )}
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 dark:bg-gray-800/95 border-b border-r border-[#7a2039]/20 dark:border-[#f3e5ab]/20 transform rotate-45"></div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-gray-700 shrink-0">
            <div className="bg-[#FAF8F5] dark:bg-gray-800/90 border border-[#7a2039]/20 dark:border-gray-700 rounded-xl p-3 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 text-[#7a2039] dark:text-[#f3e5ab] font-bold mb-1">
                <svg className="w-3.5 h-3.5 text-[#c9a227] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="tracking-tight">Officially Verified Record</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-300 leading-relaxed">
                Authenticated by Faculty & permanently cataloged in SWU PHINMA Repository.
              </p>
              <Link
                to={`/verify/${paper.id}`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#7a2039] dark:text-[#f3e5ab] hover:underline cursor-pointer group"
              >
                <span>View Verification Ledger</span>
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'toc') {
      const chapters = [
        { label: 'Chapter 1: Introduction', page: chapterPages.chap1 },
        { label: 'Chapter 2: Review of Literature', page: chapterPages.chap2 },
        { label: 'Chapter 3: Methodology', page: chapterPages.chap3 },
        { label: 'Chapter 4: Results & Discussion', page: chapterPages.chap4 },
        { label: 'Chapter 5: Conclusion', page: chapterPages.chap5 },
      ];

      return (
        <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">
              Table of Contents
            </h2>
          </div>
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {chapters.map((chap, idx) => {
              const nextPage = chapters[idx + 1]?.page;
              const isCurrent =
                currentPage >= chap.page && (!nextPage || currentPage < nextPage);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleChapterClick(chap.page);
                    if (isDrawer) setIsMobileDrawerOpen(false);
                  }}
                  className={`text-left px-3.5 py-2.5 text-xs font-medium rounded-lg shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-[#5a1528] text-white ring-2 ring-[#7a2039]'
                      : 'bg-[#7a2039] hover:bg-[#5a1528] text-white'
                  }`}
                >
                  <span className="font-semibold">{chap.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded text-white/90 font-mono">
                      p. {chap.page}
                    </span>
                    <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 transition-transform">
                      ›
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeTab === 'pages') {
      return (
        <div className="flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-200 dark:border-gray-700">
          <div className="p-4 border-b border-stone-200 dark:border-gray-700">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">Pages</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 items-center custom-scrollbar">
            {numPages && pdfSource ? (
              <Document file={pdfSource} options={pdfOptions}>
                {Array.from({ length: numPages }).map((_, idx) => (
                  <SidebarThumbnailItem
                    key={idx}
                    pageNum={idx + 1}
                    currentPage={currentPage}
                    isMobile={isMobile}
                    scrollToPage={scrollToPage}
                    isDrawer={isDrawer}
                    setIsMobileDrawerOpen={setIsMobileDrawerOpen}
                  />
                ))}
              </Document>
            ) : (
              <div className="text-stone-400 text-xs p-4 text-center">Loading pages...</div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'cite') {
      return (
        <div className="p-4 flex flex-col h-full bg-[#f4f1ea] dark:bg-gray-900 transition-colors">
          <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200 mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">Citation Formats</h2>
          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1">
            {/* APA Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">APA 7th Edition</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${authorName} (${year}). ${title}. SWU PHINMA.`);
                    Swal.fire({ title: 'Copied!', icon: 'success', timer: 1000, showConfirmButton: false });
                  }}
                  className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-400 leading-relaxed font-serif">
                {authorName} ({year}). <i>{title}</i>. SWU PHINMA.
              </p>
            </div>

            {/* MLA Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">MLA 9th Edition</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${authorName}. "${title}." SWU PHINMA, ${year}.`);
                    Swal.fire({ title: 'Copied!', icon: 'success', timer: 1000, showConfirmButton: false });
                  }}
                  className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-400 leading-relaxed font-serif">
                {authorName}. "{title}." <i>SWU PHINMA</i>, {year}.
              </p>
            </div>

            {/* IEEE Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">IEEE</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${authorName}, "${title}," SWU PHINMA, ${year}.`);
                    Swal.fire({ title: 'Copied!', icon: 'success', timer: 1000, showConfirmButton: false });
                  }}
                  className="bg-[#7a2039] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#5a1528] transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-400 leading-relaxed font-serif">
                {authorName}, "{title}," SWU PHINMA, {year}.
              </p>
            </div>

            {/* Export Section */}
            <div className="mt-2 border-t border-stone-200 dark:border-gray-700 pt-3">
              <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200 mb-2 uppercase tracking-wider">Export Citation</h3>
              <div className="flex flex-col gap-2">
                <button onClick={generateRIS} className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-3 py-2 rounded-lg text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-sm text-left font-medium cursor-pointer flex justify-between items-center">
                  <span>Download .RIS (Mendeley, EndNote)</span>
                  <span className="text-[10px]">⬇</span>
                </button>
                <button onClick={generateBibTeX} className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-3 py-2 rounded-lg text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-sm text-left font-medium cursor-pointer flex justify-between items-center">
                  <span>Download .BibTeX (LaTeX)</span>
                  <span className="text-[10px]">⬇</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'share') {
      return (
        <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors overflow-y-auto custom-scrollbar">
          <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200 mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">Share Research</h2>
          <div className="flex flex-col items-center gap-4 mt-2">
            <div className="flex justify-center gap-2 w-full">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center justify-center p-2.5 bg-[#1877F2] text-white rounded-lg shadow-sm hover:opacity-90 transition cursor-pointer"
              >
                <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                <span className="text-[10px] font-bold">Facebook</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Read this research paper: ' + title)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center justify-center p-2.5 bg-black text-white rounded-lg shadow-sm hover:bg-gray-800 transition cursor-pointer"
              >
                <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                <span className="text-[10px] font-bold">X (Twitter)</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Read this research paper: ' + title)}&body=${encodeURIComponent('I thought you might find this research interesting: ' + window.location.href)}`}
                className="flex-1 flex flex-col items-center justify-center p-2.5 bg-stone-500 text-white rounded-lg shadow-sm hover:bg-stone-600 transition cursor-pointer"
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span className="text-[10px] font-bold">Email</span>
              </a>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-md border border-stone-200 mt-1">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.href)}`}
                alt="QR Code"
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="text-center w-full">
              <p className="text-xs text-stone-500 dark:text-gray-400 mb-2">Scan to read on mobile devices</p>
              <button
                onClick={copyLink}
                className="w-full bg-[#7a2039] text-white px-4 py-2.5 rounded-lg hover:bg-[#5a1528] transition shadow-sm text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Copy Direct Link
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'related') {
      return (
        <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800 transition-colors">
          <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">Related Researches</h2>
            {relatedPapers.length > 0 && (
              <button
                onClick={() => setIsMapView(true)}
                className="text-[10px] bg-[#7a2039] text-white px-2 py-1 rounded hover:bg-[#5a1528] transition font-medium flex items-center gap-1 shadow-sm cursor-pointer"
                title="View Interactive Map"
              >
                <span>🕸️</span> Map View
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1">
            {relatedPapers.length > 0 ? (
              relatedPapers.slice(0, 5).map(rp => (
                <div key={rp.id} className="bg-white dark:bg-gray-700 border border-stone-200 dark:border-gray-600 rounded-lg p-3 shadow-sm hover:shadow-md transition relative group">
                  <span className="text-[10px] bg-stone-100 dark:bg-gray-600 px-2 py-0.5 rounded text-stone-600 dark:text-gray-300 font-medium mb-1.5 inline-block truncate max-w-full">
                    {normalizeDepartment(rp.program || rp.department || rp.category) || 'Research'}
                  </span>
                  <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200 mb-1 line-clamp-2" title={rp.researchTitle || rp.title}>
                    {rp.researchTitle || rp.title || 'Untitled Research'}
                  </h3>
                  <p className="text-[10px] text-stone-500 dark:text-gray-400 mb-2 truncate">{rp.studentName || rp.groupName || 'Unknown Author'}</p>
                  <a href={`/viewer/${rp.id}`} className="text-[10px] bg-[#7a2039] text-white px-3 py-1.5 rounded hover:bg-[#5a1528] transition inline-block text-center w-full shadow-sm font-medium">
                    Read Paper
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center text-stone-500 dark:text-gray-400 text-xs mt-8">
                No related researches found for this department.
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-[#e5e5e5] dark:bg-gray-900 font-sans overflow-hidden transition-colors">

      {/* HEADER - Hidden in Zen Mode */}
      {!isZenMode && (
        <div className="z-20 relative shadow-md shrink-0">
          <Header />
        </div>
      )}

      {/* VIEW-ONLY BANNER - Hidden in Zen Mode */}
      {!isZenMode && (
        <div className="bg-[#242b35] border-b border-[#1f252e] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 text-xs z-10 shadow-sm transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/browse" className="text-white font-bold text-lg hover:bg-white/10 px-2 py-0.5 rounded transition cursor-pointer shrink-0" title="Back to Browse">←</Link>

            {/* MOBILE TOOLS BUTTON (Opens slide-over drawer) */}
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(true);
                if (!activeTab) setActiveTab('toc');
              }}
              className="md:hidden flex items-center gap-1.5 bg-[#1a2028] hover:bg-[#141920] text-stone-200 border border-stone-700/80 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm cursor-pointer shrink-0 transition"
              title="Open Paper Outline & Tools"
            >
              <svg className="w-3.5 h-3.5 text-[#c9a227]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Outline & Tools</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300 truncate">
              <span className="w-2.5 h-2.5 bg-[#ff8c00] rounded-full shrink-0"></span>
              <span className="font-bold text-white">View-only access</span>
              <span className="text-gray-400 hidden lg:inline">— protected for academic integrity.</span>
            </div>
          </div>

          {/* VERIFIED INSTITUTIONAL RECORD BADGE */}
          <Link
            to={`/verify/${paper.id}`}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#1a2028] hover:bg-[#141920] text-stone-200 hover:text-white border border-stone-700/80 hover:border-[#c9a227]/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all shadow-sm group shrink-0 cursor-pointer"
            title="Officially validated and archived by Southwestern University PHINMA."
          >
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#c9a227] group-hover:text-[#e5c07b] transition-colors shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-stone-200 group-hover:text-white tracking-tight">Verified</span>
            </div>
            <span className="text-[10px] text-stone-400 group-hover:text-[#f3e5ab] pl-1.5 sm:pl-2 border-l border-stone-700 hidden xs:flex items-center gap-0.5 transition-colors font-semibold">
              Ledger
              <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* THIN LEFT NAVIGATION (ICONS) - Hidden on mobile screens to give PDF 100% width */}
        <div className={`w-14 md:w-16 bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex-col items-center py-4 gap-4 flex-shrink-0 z-10 transition-colors ${isFullscreen ? 'hidden' : 'hidden md:flex'}`}>
          <button onClick={() => handleTabClick('abstract')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'abstract' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Abstract">
            📝
          </button>
          <button onClick={() => handleTabClick('toc')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'toc' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Table of Contents">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <button onClick={() => handleTabClick('pages')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'pages' && !isFullscreen ? 'bg-[#f5ebed] text-[#7a2039]' : 'text-stone-500 hover:bg-stone-100'}`} title="Pages">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </button>

          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>

          <button onClick={toggleFullscreen} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Fullscreen">⛶</button>
          <button
            onClick={handleBookmarkToggle}
            className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-700 ${isBookmarked ? 'text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400'}`}
            title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
          >
            {isBookmarked ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>}
          </button>
          <div className="flex flex-col items-center gap-1 mt-2">
            <button
              onClick={handleLike}
              className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer hover:bg-stone-100 dark:hover:bg-gray-700 ${paper.likes?.includes(currentUser?.uid) ? 'text-red-600' : 'text-stone-500 dark:text-gray-400'}`}
              title={paper.likes?.includes(currentUser?.uid) ? "Unlike" : "Like"}
            >
              {paper.likes?.includes(currentUser?.uid) ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              )}
            </button>
            <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400">{paper.likes?.length || 0}</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-gray-400 mt-2" title="Views">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>
              {paper.views || 0}
            </span>
          </div>

          <button onClick={() => handleTabClick('cite')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'cite' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Cite">❞</button>

          <button onClick={() => handleTabClick('share')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'share' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Share">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>

          <button onClick={() => handleTabClick('related')} className={`w-10 h-10 flex items-center justify-center rounded transition cursor-pointer ${activeTab === 'related' && !isFullscreen ? 'bg-[#f5ebed] dark:bg-gray-700 text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`} title="Related Researches">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </button>

          <div className="w-8 border-b border-stone-200 dark:border-gray-600 my-2"></div>

          {/* ZEN MODE TOGGLE */}
          <button
            onClick={() => { setIsZenMode(!isZenMode); if (!isZenMode) { setIsFullscreen(true); } else { setIsFullscreen(false); } }}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 cursor-pointer ${isZenMode ? 'bg-[#7a2039] text-white shadow-lg scale-110' : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'}`}
            title={isZenMode ? 'Exit Zen Mode' : 'Zen Mode (Focus Reading)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            </svg>
          </button>
        </div>

        {/* EXPANDABLE SIDEBAR PANEL - Desktop */}
        {!isFullscreen && activeTab && !isMobile && (
          <div className="w-64 lg:w-72 relative h-full bg-[#fcfbf7] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto z-10 shadow-none transition-colors">
            {renderTabContent(false)}
          </div>
        )}

        {/* MOBILE TOOLS DRAWER (Slide-over on mobile) */}
        {isMobile && isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer Sheet */}
            <div className="relative w-[85%] max-w-xs bg-[#fcfbf7] dark:bg-gray-800 h-full shadow-2xl flex flex-col z-10 border-r border-stone-300 dark:border-gray-700">
              {/* Drawer Header */}
              <div className="p-4 bg-[#7a2039] text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-sm">Research Tools & Outline</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="text-white hover:text-[#d6ad60] p-1 cursor-pointer font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Quick Actions (Bookmark, Like, Fullscreen, Zen) */}
              <div className="p-3 grid grid-cols-4 gap-2 border-b border-stone-200 dark:border-gray-700 bg-stone-100 dark:bg-gray-900 shrink-0">
                <button
                  type="button"
                  onClick={handleBookmarkToggle}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs cursor-pointer ${isBookmarked ? 'text-[#7a2039] dark:text-[#f3e5ab] font-bold' : 'text-stone-600 dark:text-gray-300'}`}
                >
                  <span className="text-base">{isBookmarked ? '🔖' : '📑'}</span>
                  <span className="text-[10px] mt-1">{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs cursor-pointer ${paper.likes?.includes(currentUser?.uid) ? 'text-red-600 font-bold' : 'text-stone-600 dark:text-gray-300'}`}
                >
                  <span className="text-base">{paper.likes?.includes(currentUser?.uid) ? '❤️' : '🤍'}</span>
                  <span className="text-[10px] mt-1">{paper.likes?.length || 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs text-stone-600 dark:text-gray-300 cursor-pointer"
                >
                  <span className="text-base">⛶</span>
                  <span className="text-[10px] mt-1">Full</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsZenMode(!isZenMode);
                    if (!isZenMode) setIsFullscreen(true);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs cursor-pointer ${isZenMode ? 'text-[#7a2039] dark:text-[#f3e5ab] font-bold' : 'text-stone-600 dark:text-gray-300'}`}
                >
                  <span className="text-base">🧘</span>
                  <span className="text-[10px] mt-1">Zen</span>
                </button>
              </div>

              {/* Navigation Tabs List */}
              <div className="flex border-b border-stone-200 dark:border-gray-700 overflow-x-auto text-xs bg-white dark:bg-gray-800 shrink-0 custom-scrollbar">
                {[
                  { id: 'toc', label: 'TOC', icon: '📋' },
                  { id: 'abstract', label: 'Abstract', icon: '📝' },
                  { id: 'pages', label: 'Pages', icon: '📄' },
                  { id: 'cite', label: 'Cite', icon: '❞' },
                  { id: 'share', label: 'Share', icon: '🔗' },
                  { id: 'related', label: 'Related', icon: '🕸️' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 px-2 text-center whitespace-nowrap font-medium transition cursor-pointer border-b-2 text-[11px] ${
                      (activeTab === tab.id || (!activeTab && tab.id === 'toc'))
                        ? 'border-[#7a2039] text-[#7a2039] dark:text-[#f3e5ab] dark:border-[#f3e5ab] font-bold'
                        : 'border-transparent text-stone-500 dark:text-gray-400 hover:text-stone-700'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content inside Mobile Drawer */}
              <div className="flex-1 overflow-y-auto">
                {renderTabContent(true)}
              </div>
            </div>
          </div>
        )}

        {/* CENTER DOCUMENT VIEWER */}
        <div
          className="flex-1 overflow-hidden flex flex-col relative bg-[#e5e5e5] dark:bg-gray-900"
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
        >
          <div className="w-full h-full flex flex-col relative select-none transition-all duration-300">
            {/* MOBILE EXIT FULLSCREEN FLOATING BUTTON */}
            {isFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="md:hidden absolute top-4 right-4 z-50 bg-[#7a2039] text-white p-2.5 rounded-full shadow-lg opacity-90 hover:opacity-100 flex items-center justify-center cursor-pointer"
                title="Exit Fullscreen"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              </button>
            )}

            {/* ZOOM CONTROLS - Positioned cleanly with touch optimization */}
            <div className="absolute bottom-28 right-3 sm:right-6 z-40 flex flex-col items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleZoomIn();
                }}
                className="w-11 h-11 bg-white/95 dark:bg-gray-800/95 text-stone-700 dark:text-stone-200 shadow-lg rounded-full hover:bg-white dark:hover:bg-gray-700 border border-stone-200 dark:border-gray-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Zoom In"
                style={{ touchAction: 'manipulation' }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleResetZoom();
                  }}
                  className="px-2 py-0.5 bg-white/95 dark:bg-gray-800/95 text-[10px] font-bold text-[#7a2039] dark:text-[#f3e5ab] shadow-md rounded-full border border-stone-200 dark:border-gray-600 transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Reset Zoom to 100%"
                  style={{ touchAction: 'manipulation' }}
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleZoomOut();
                }}
                className="w-11 h-11 bg-white/95 dark:bg-gray-800/95 text-stone-700 dark:text-stone-200 shadow-lg rounded-full hover:bg-white dark:hover:bg-gray-700 border border-stone-200 dark:border-gray-600 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Zoom Out"
                style={{ touchAction: 'manipulation' }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
            </div>

            {/* EMBEDDED MANUSCRIPT VIEWER - Full width on mobile & smooth horizontal pan when zoomed */}
            {isPdfLoading ? (
              <div className="w-full h-full relative overflow-y-auto flex flex-col items-center py-4 md:py-8 pb-36 px-1.5 sm:px-4">
                <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-xl border border-stone-200 dark:border-gray-700 p-6 md:p-12 lg:p-20 flex flex-col h-[600px] sm:h-[800px] rounded-sm mt-4 animate-pulse">
                  <div className="h-8 md:h-10 w-3/4 rounded mb-6 mx-auto bg-stone-200 dark:bg-gray-700"></div>
                  <div className="h-4 w-1/2 rounded mb-8 mx-auto bg-stone-200 dark:bg-gray-700"></div>
                  <div className="space-y-4 mb-6">
                    <div className="h-4 w-full rounded bg-stone-200 dark:bg-gray-700"></div>
                    <div className="h-4 w-full rounded bg-stone-200 dark:bg-gray-700"></div>
                    <div className="h-4 w-5/6 rounded bg-stone-200 dark:bg-gray-700"></div>
                  </div>
                </div>
              </div>
            ) : pdfSource ? (
              <div
                ref={scrollContainerRef}
                onScroll={handleScrollActivity}
                className="w-full h-full relative overflow-y-auto overflow-x-auto flex flex-col items-center custom-scrollbar py-4 md:py-8 pb-36 px-1.5 sm:px-4"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x pan-y',
                }}
              >
                <Document
                  file={pdfSource}
                  options={pdfOptions}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => console.error("Document render error:", err)}
                  loading={
                    <div className="w-full max-w-4xl bg-white dark:bg-gray-800 shadow-xl border border-stone-200 dark:border-gray-700 p-6 md:p-12 lg:p-20 flex flex-col h-[600px] sm:h-[800px] rounded-sm mt-4">
                      <div className="h-8 md:h-10 w-3/4 rounded mb-6 mx-auto animate-shimmer"></div>
                      <div className="h-4 w-1/2 rounded mb-8 mx-auto animate-shimmer"></div>
                      <div className="space-y-4 mb-6">
                        <div className="h-4 w-full rounded animate-shimmer"></div>
                        <div className="h-4 w-full rounded animate-shimmer"></div>
                        <div className="h-4 w-5/6 rounded animate-shimmer"></div>
                      </div>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md my-8 text-center max-w-md">
                      <span className="text-4xl mb-3">⚠️</span>
                      <h3 className="font-bold text-stone-800 dark:text-gray-100 text-sm sm:text-base mb-1">Failed to Render Document</h3>
                      <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">An error occurred while rendering the PDF. Please try refreshing.</p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[#7a2039] text-white text-xs font-bold rounded shadow hover:bg-[#5a1528] transition cursor-pointer"
                      >
                        Reload Page
                      </button>
                    </div>
                  }
                  className="flex flex-col items-center gap-4 sm:gap-6 relative"
                >
                  {numPages ? (
                    Array.from({ length: numPages }, (_, index) => {
                      const pageNum = index + 1;
                      // Virtualization window: render current page +/- 4 pages to keep memory light and reading seamless
                      const isVisible = Math.abs(pageNum - currentPage) <= 4;
                      const pageHeight = currentPdfHeight;

                      return (
                        <div
                          key={pageNum}
                          id={`archive-pdf-page-${pageNum}`}
                          data-page={pageNum}
                          ref={(el) => {
                            if (el) pageRefsMap.current[pageNum] = el;
                          }}
                          className="relative shadow-xl bg-white dark:bg-gray-800 rounded-sm overflow-hidden transition-[width] duration-100"
                          style={{
                            width: `${currentPdfWidth}px`,
                            minHeight: `${pageHeight}px`,
                          }}
                        >
                          {isVisible ? (
                            <>
                              <Page
                                pageNumber={pageNum}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                width={currentPdfWidth}
                                className="relative pointer-events-none"
                                loading={
                                  <div
                                    className="bg-white dark:bg-gray-800 flex items-center justify-center text-stone-400 text-xs"
                                    style={{ width: `${currentPdfWidth}px`, height: `${pageHeight}px` }}
                                  >
                                    <span className="animate-pulse">Loading page {pageNum}...</span>
                                  </div>
                                }
                                error={
                                  <div
                                    className="bg-white dark:bg-gray-800 flex items-center justify-center text-stone-400 text-xs p-4"
                                    style={{ width: `${currentPdfWidth}px`, height: `${pageHeight}px` }}
                                  >
                                    Page {pageNum} preview unavailable
                                  </div>
                                }
                              />

                              {/* WATERMARK OVERLAY DIRECTLY ON DOCUMENT */}
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 select-none">
                                <div className="w-full h-full relative flex items-center justify-center opacity-10">
                                  <h2 className="text-6xl sm:text-8xl font-bold transform -rotate-45 text-stone-900 absolute">SWU PHINMA</h2>
                                  <h2 className="text-3xl sm:text-5xl font-bold transform -rotate-45 text-stone-900 absolute top-1/4">CONFIDENTIAL</h2>
                                  <h2 className="text-3xl sm:text-5xl font-bold transform -rotate-45 text-stone-900 absolute bottom-1/4">DO NOT COPY</h2>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div
                              className="bg-stone-50 dark:bg-gray-800/60 flex flex-col items-center justify-center text-stone-400 text-xs border border-stone-200 dark:border-gray-700/50"
                              style={{ width: `${currentPdfWidth}px`, height: `${pageHeight}px` }}
                            >
                              <div className="flex flex-col items-center gap-1.5 opacity-60">
                                <svg className="w-8 h-8 text-stone-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-[11px] font-medium">Page {pageNum} of {numPages}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="relative shadow-xl bg-white rounded-sm overflow-hidden" style={{ width: currentPdfWidth, minHeight: currentPdfHeight }}>
                      <Page
                        pageNumber={1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={currentPdfWidth}
                        className="relative pointer-events-none"
                      />
                    </div>
                  )}
                </Document>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 dark:text-gray-400 z-20">
                <span className="text-4xl mb-3">📄</span>
                <p className="text-sm">No valid manuscript uploaded for this submission.</p>
              </div>
            )}

            {/* PAGINATION CONTROLS - COMPACT & CLEAN ON MOBILE */}
            {paper.documents?.['Final Manuscript']?.url && paper.documents['Final Manuscript'].url !== '#' && (
              <div
                className={`absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-between gap-2 sm:gap-3 bg-[#242b35]/95 backdrop-blur px-3 sm:px-5 py-2 sm:py-2.5 rounded-full z-30 border border-[#1f252e] transition-all duration-300 pointer-events-auto shadow-xl ${isScrolling
                  ? 'opacity-40 hover:opacity-100 shadow-sm'
                  : 'opacity-100 shadow-xl'
                  }`}
                style={{ minWidth: isMobile ? '230px' : '280px', maxWidth: 'calc(100% - 32px)' }}
              >
                <button
                  type="button"
                  onClick={() => scrollToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="w-14 sm:w-16 text-center text-white hover:text-[#d6ad60] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs sm:text-sm px-1 cursor-pointer transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs sm:text-sm font-bold text-gray-300 flex-1 text-center select-none whitespace-nowrap">
                  Page {currentPage} of {numPages || '--'}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToPage(currentPage + 1)}
                  disabled={currentPage >= (numPages || 1)}
                  className="w-14 sm:w-16 text-center text-white hover:text-[#d6ad60] disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs sm:text-sm px-1 cursor-pointer transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            {/* WATERMARK */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden">
              <h2 className="text-7xl sm:text-9xl font-bold transform -rotate-45 whitespace-nowrap text-stone-900">SWU PHINMA ARCHIVE</h2>
            </div>
            <div className="absolute top-1/4 left-0 pointer-events-none w-full text-center opacity-[0.02] -rotate-45">
              <p className="text-3xl sm:text-4xl font-serif">CONFIDENTIAL • DO NOT COPY</p>
            </div>
            <div className="absolute bottom-1/4 left-0 pointer-events-none w-full text-center opacity-[0.02] -rotate-45">
              <p className="text-3xl sm:text-4xl font-serif">CONFIDENTIAL • DO NOT COPY</p>
            </div>
          </div>
        </div>

        {/* RIGHT AI PANEL - Full screen overlay on mobile, sidebar on desktop */}
        {isAiOpen && !isFullscreen && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-[420px] bg-white dark:bg-gray-800 border-l border-stone-300 dark:border-gray-700 flex flex-col z-50 sm:relative sm:z-10 shadow-2xl transition-all">
            <div className="bg-[#7a2039] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Archivio AI" className="w-6 h-6 object-contain bg-white rounded-full p-0.5 shadow-sm" />
                <span className="font-bold text-sm">Archivio AI Assistant</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="text-white hover:text-[#d6ad60] font-bold cursor-pointer text-lg p-1">✕</button>
            </div>
            <div className="p-3 bg-[#fcfbf7] dark:bg-gray-900 border-b border-stone-200 dark:border-gray-700 shrink-0 transition-colors">
              <p className="text-xs text-stone-600 dark:text-gray-400 font-medium">In-depth AI analysis & comprehensive summarization for this paper.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fcfbf7] dark:bg-gray-900 transition-colors">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${msg.role === 'user' ? 'bg-stone-500 dark:bg-gray-700 text-white text-xs' : 'bg-white border border-stone-200 dark:border-gray-700'}`}>
                    {msg.role === 'user' ? 'U' : <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />}
                  </div>
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className={`text-xs p-3 shadow-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#7a2039] text-white rounded-tl-xl rounded-bl-xl rounded-br-xl whitespace-pre-wrap'
                        : 'bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl'
                    }`}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-stone-800 dark:text-gray-200 prose-headings:font-bold prose-headings:text-[#7a2039] dark:prose-headings:text-[#f3e5ab] prose-headings:my-2 prose-p:my-1.5 prose-p:leading-relaxed prose-ul:my-1.5 prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0.5 prose-strong:text-[#7a2039] dark:prose-strong:text-[#f3e5ab] break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {msg.role !== 'user' && (
                      <div className="flex items-center gap-3 ml-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMsgIndex(idx);
                            setTimeout(() => setCopiedMsgIndex(null), 2000);
                          }}
                          className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-gray-500 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMsgIndex === idx ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              ✓ Copied
                            </span>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.speechSynthesis.speaking) {
                              window.speechSynthesis.cancel();
                              return;
                            }
                            const cleanText = msg.content.replace(/[*#_`]/g, '');
                            const utterance = new SpeechSynthesisUtterance(cleanText);
                            utterance.rate = 0.95;
                            utterance.pitch = 1.0;
                            const voices = window.speechSynthesis.getVoices();
                            const voice = voices.find(v => v.lang.includes('en') && v.name.includes('Female')) || voices.find(v => v.lang.includes('en')) || voices[0];
                            if (voice) utterance.voice = voice;
                            window.speechSynthesis.speak(utterance);
                          }}
                          className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-gray-500 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition cursor-pointer"
                          title="Listen to this response"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 010 7.07" />
                            <path d="M19.07 4.93a10 10 0 010 14.14" />
                          </svg>
                          Listen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                    <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-500 dark:text-gray-400 text-xs p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* QUICK SUGGESTION CHIPS */}
            <div className="px-3 py-2 bg-stone-50 dark:bg-gray-900 border-t border-stone-200 dark:border-gray-700/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {AI_SUGGESTIONS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleChatSubmit(null, item.prompt)}
                  className="shrink-0 text-[11px] font-semibold bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-[#7a2039] dark:hover:border-[#f3e5ab] text-stone-700 dark:text-gray-300 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] px-2.5 py-1 rounded-full shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="p-3 sm:p-4 border-t border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 transition-colors">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isTyping}
                  placeholder="Ask about methodology, findings, summary..."
                  className="flex-1 min-w-0 border border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-stone-800 dark:text-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#7a2039] disabled:opacity-50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-[#7a2039] text-white px-3.5 rounded-lg hover:bg-[#5a1528] transition cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI TOGGLE BUTTON */}
        {!isAiOpen && !isFullscreen && (
          <button
            onClick={() => setIsAiOpen(true)}
            className="absolute right-3 sm:right-4 bottom-4 bg-[#7a2039] text-white w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-lg flex items-center justify-center text-lg sm:text-xl hover:bg-[#5a1528] transition active:scale-95 cursor-pointer z-20 border-2 border-white"
            title="Open Archivio AI Assistant"
          >
            ✨
          </button>
        )}

        {/* FULL SCREEN NETWORK MAP MODAL */}
        {isMapView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-[95vw] h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative border border-stone-200 dark:border-gray-700">
              <div className="flex justify-between items-center p-3 sm:p-4 border-b border-stone-200 dark:border-gray-800 bg-[#fcfbf7] dark:bg-gray-900">
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-[#7a2039] dark:text-[#f3e5ab] flex items-center gap-2">
                    <span>🕸️</span> Interactive Research Network
                  </h2>
                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-gray-400">
                    Explore connections in <strong>{normalizeDepartment(paper.program || paper.department || paper.category)}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setIsMapView(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 dark:bg-gray-800 text-stone-600 dark:text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 w-full bg-[#111] relative">
                <ForceGraph2D
                  graphData={graphData}
                  nodeLabel="name"
                  nodeAutoColorBy="group"
                  nodeRelSize={6}
                  linkColor={() => 'rgba(255,255,255,0.2)'}
                  linkWidth={1.5}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={d => d.val * 0.001}
                  onNodeClick={node => window.location.href = `/viewer/${node.id}`}
                  width={window.innerWidth * 0.95}
                  height={window.innerHeight * 0.95 - 75}
                />

                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white font-sans shadow-lg text-xs">
                  <h4 className="text-[10px] font-bold mb-1.5 uppercase tracking-widest text-stone-300">Legend</h4>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7a2039]"></div>
                    <span className="text-[11px]">Current Research</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d6ad60]"></div>
                    <span className="text-[11px]">Related Research</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchivePaperViewer;