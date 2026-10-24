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
import { streamAIChat } from '../services/aiService';
import {
  generateAllCitations,
  cleanTitleText,
  toTitleCase,
  parseAuthors
} from '../utils/citationFormatter';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Thumbnail component with on-scroll IntersectionObserver to dynamically load all page previews
function SidebarThumbnailItem({
  pdf,
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
            pdf={pdf}
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

// In-memory session cache so re-opening papers or switching tabs doesn't re-scan
const tocGlobalCache = new Map();

// ---------------------------------------------------------------------------
// Table of Contents detection helpers (pure functions, no React state)
// Designed to work for manuscripts of ANY length without freezing the UI:
//  - every PDF.js call is wrapped in a timeout so a slow page can never hang the scan
//  - the whole scan has a hard time budget
//  - PDF bookmarks are used first (instant + exact), then the printed TOC page,
//    then a full-document chapter-heading scan as the last resort
// ---------------------------------------------------------------------------
const TOC_CACHE_VERSION = 'v3';
const TOC_PAGE_TIMEOUT_MS = 4000;
const TOC_TOTAL_BUDGET_MS = 30000;

const ROMAN_NUMS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const WORD_NUMS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10 };
const CANONICAL_CHAPTER_TITLES = {
  1: 'Introduction',
  2: 'Review of Literature',
  3: 'Methodology',
  4: 'Results & Discussion',
  5: 'Conclusion',
};
const BACK_MATTER_LABELS = {
  references: 'References',
  bibliography: 'Bibliography',
  literaturecited: 'Literature Cited',
  appendices: 'Appendices',
  curriculumvitae: 'Curriculum Vitae',
};
const SMALL_TITLE_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'vs', 'via', 'with']);

const CHAPTER_TOKEN_SRC = '(\\d{1,2}|[IVX]{1,5}|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)';
// "CHAPTER I", "CHAPTER 1: INTRODUCTION ..... 1", "Chapter IV - Results 45"
const CHAPTER_LINE_RE = new RegExp(`^CHAPTER\\s*[-:.]?\\s*${CHAPTER_TOKEN_SRC}(?![A-Za-z0-9])\\s*[-:.\u2013\u2014]?\\s*(.*)$`, 'i');
// "<title><separators><page>" where separators are spaces / dot leaders / dashes
const TRAILING_PAGE_RE = /^(.*?)[\s.\u00b7\u2022_\u2026\u2025\-\u2013\u2014]+(\d{1,3})$/;
const DOT_LEADER_RE = /(?:\.\s?){4,}|[\u2026\u2025]{2,}|_{4,}/;

const withTimeout = (promise, ms) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

const clampPage = (pg, total) => Math.min(total, Math.max(1, Math.round(pg)));

const chapterTokenToNumber = (token) => {
  if (!token) return null;
  const t = String(token).trim().toUpperCase();
  if (/^\d{1,2}$/.test(t)) {
    const n = parseInt(t, 10);
    return n >= 1 && n <= 20 ? n : null;
  }
  return ROMAN_NUMS[t] || WORD_NUMS[t] || null;
};

const cleanTocTitle = (s) =>
  String(s || '')
    .replace(/[\s.\u00b7\u2022_\u2026\u2025\-\u2013\u2014:]+$/, '')
    .replace(/^[\s.\u00b7\u2022_\-\u2013\u2014:]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const joinTitle = (a, b) => [a, b].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

// Convert ALL-CAPS headings to Title Case, keep author casing otherwise
const prettifyHeading = (s) => {
  const text = cleanTocTitle(s);
  if (!text) return '';
  const letters = text.replace(/[^A-Za-z]/g, '');
  const upper = text.replace(/[^A-Z]/g, '');
  if (letters.length === 0 || upper.length / letters.length < 0.7) return text;
  return text
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_TITLE_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
};

const splitTrailingPage = (text) => {
  const t = String(text || '').trim();
  const m = t.match(TRAILING_PAGE_RE);
  if (!m) return null;
  return { title: cleanTocTitle(m[1]), page: parseInt(m[2], 10) };
};

const backMatterKey = (title) => {
  const c = String(title || '').replace(/\s+/g, '').toUpperCase();
  if (c.startsWith('REFERENCES')) return 'references';
  if (c.startsWith('BIBLIOGRAPHY')) return 'bibliography';
  if (c.startsWith('LITERATURECITED')) return 'literaturecited';
  if (c.startsWith('APPENDICES') || c.startsWith('APPENDIX')) return 'appendices';
  if (c.startsWith('CURRICULUMVITAE') || c.startsWith('CURRICULUMVITAE')) return 'curriculumvitae';
  return null;
};

// Read a page's text and group it into visual lines (top -> bottom)
const extractPageLines = async (pdfDoc, pNum) => {
  const page = await withTimeout(pdfDoc.getPage(pNum), TOC_PAGE_TIMEOUT_MS);
  const tc = await withTimeout(page.getTextContent(), TOC_PAGE_TIMEOUT_MS);
  const items = [];
  for (const it of tc?.items || []) {
    if (!it || typeof it.str !== 'string' || !it.str.trim() || !it.transform) continue;
    items.push({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      h: Math.abs(it.height || it.transform[3] || 10) || 10,
    });
  }
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    const tol = Math.max(2, Math.min(it.h, row ? row.h : it.h) * 0.5);
    if (row && Math.abs(row.y - it.y) <= tol) {
      row.items.push(it);
    } else {
      rows.push({ y: it.y, h: it.h, items: [it] });
    }
  }
  return rows
    .map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

const isTocPage = (lines) =>
  lines.slice(0, 12).some((l) => /^(TABLEOFCONTENTS|CONTENTS$)/i.test(l.replace(/\s+/g, '')));

const isListPage = (lines) =>
  lines.slice(0, 8).some((l) => /^LISTOF(TABLES|FIGURES|APPENDICES|ABBREVIATIONS|PLATES|ACRONYMS)/i.test(l.replace(/\s+/g, '')));

const countEntryLines = (lines) => lines.filter((l) => splitTrailingPage(l)).length;

// Detect an actual chapter opening page (heading near the top of the page)
const detectChapterHeading = (lines) => {
  const top = lines.slice(0, 10);
  for (let i = 0; i < top.length; i++) {
    const l = top[i];
    if (!l || l.length > 80 || DOT_LEADER_RE.test(l)) continue;
    const compact = l.replace(/\s+/g, '');

    const m = l.match(CHAPTER_LINE_RE);
    if (m) {
      const num = chapterTokenToNumber(m[1]);
      const rest = cleanTocTitle(m[2] || '');
      // Sentences like "Chapter 2 presents ..." are body text, not headings
      const looksLikeSentence = /[a-z]/.test(rest) && rest.split(' ').length > 8;
      if (num && !looksLikeSentence && !/\s\d{1,3}$/.test(rest)) {
        let title = rest;
        if (!title && top[i + 1] && top[i + 1].length <= 90 && !DOT_LEADER_RE.test(top[i + 1])) {
          title = top[i + 1];
          if (top[i + 2] && /^[^a-z]{3,60}$/.test(top[i + 2]) && /^[^a-z]+$/.test(title)) {
            title = joinTitle(title, top[i + 2]);
          }
        }
        return { num, title: cleanTocTitle(title) };
      }
    }

    // Letter-spaced "C H A P T E R  I"
    const spaced = compact.match(/^CHAPTER(\d{1,2}|[IVX]{1,5})$/i);
    if (spaced) {
      const num = chapterTokenToNumber(spaced[1]);
      if (num) return { num, title: cleanTocTitle(top[i + 1] || '') };
    }

    // "CHAPTER" on one line, numeral on the next
    if (/^CHAPTER$/i.test(compact) && top[i + 1]) {
      const num = chapterTokenToNumber(top[i + 1].trim().split(' ')[0]);
      if (num) return { num, title: cleanTocTitle(top[i + 2] || '') };
    }
  }
  return null;
};

const detectBackMatterHeading = (lines) => {
  for (const l of lines.slice(0, 6)) {
    if (!l || l.length > 40 || DOT_LEADER_RE.test(l)) continue;
    const key = backMatterKey(l);
    if (key) return key;
  }
  return null;
};

// Printed page number in header/footer, e.g. a lone "23" or "Page 23"
const detectPrintedPageNumber = (lines) => {
  const candidates = [lines[lines.length - 1], lines[lines.length - 2], lines[0], lines[1]];
  for (const l of candidates) {
    if (!l) continue;
    const m = l.trim().match(/^(?:page\s+)?(\d{1,3})$/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
};

// Parse the printed Table of Contents into chapters / back matter with sections
const parseTocEntries = (allLines, total) => {
  const entries = [];
  const maxPage = total + 20;
  let current = null;
  let pending = null;
  let carry = '';

  const findChapter = (num) => entries.find((c) => c.kind === 'chapter' && c.num === num);
  const lastChapterNum = () => {
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i].kind === 'chapter') return entries[i].num;
    return 0;
  };
  const pushChapter = (num, title, page) => {
    const existing = findChapter(num);
    if (existing) {
      current = existing;
      return;
    }
    current = { kind: 'chapter', num, title: cleanTocTitle(title), claimedPage: page, sections: [] };
    entries.push(current);
  };
  const addSection = (entry, title, page) => {
    const clean = cleanTocTitle(
      String(title || '').replace(/^(?:\d{1,2}(?:\.\d{1,2})*\.?|[A-Za-z][.)]|[IVXivx]{1,4}[.)])\s+/, '')
    );
    if (!clean || clean.length < 3 || !/[A-Za-z]{3,}/.test(clean)) return;
    if (/^(chapter|page|pages|title|contents)$/i.test(clean)) return;
    if (entry.sections.length >= 60) return;
    if (entry.sections.some((s) => s.title === clean && s.claimedPage === page)) return;
    entry.sections.push({ title: prettifyHeading(clean), claimedPage: page });
  };

  for (const raw of allLines) {
    const line = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const compact = line.replace(/\s+/g, '').toUpperCase();

    if (!pending && /^(TABLEOFCONTENTS|CONTENTS|PAGE|PAGES|PAGENO\.?|TITLE|CHAPTER)$/.test(compact)) {
      carry = '';
      continue;
    }

    // Chapter line - may or may not include title and page on the same line
    const chap = line.match(CHAPTER_LINE_RE);
    if (chap) {
      carry = '';
      pending = null;
      const num = chapterTokenToNumber(chap[1]);
      if (!num) continue;
      const rest = (chap[2] || '').trim();
      if (/^\d{1,3}$/.test(rest)) {
        pushChapter(num, '', parseInt(rest, 10));
        continue;
      }
      const split = splitTrailingPage(rest);
      if (split && split.page <= maxPage) {
        pushChapter(num, split.title, split.page);
      } else {
        pending = { num, title: cleanTocTitle(rest) };
      }
      continue;
    }

    const bareNum = /^\d{1,3}$/.test(line) ? parseInt(line, 10) : null;
    const split = bareNum === null ? splitTrailingPage(line) : null;

    // Title / page of a "CHAPTER X" line that wrapped onto following lines
    if (pending) {
      if (bareNum !== null && bareNum <= maxPage) {
        pushChapter(pending.num, pending.title, bareNum);
        pending = null;
      } else if (split && split.page <= maxPage) {
        pushChapter(pending.num, joinTitle(pending.title, split.title), split.page);
        pending = null;
      } else if (/[A-Za-z]{2,}/.test(line) && pending.title.length < 120) {
        pending.title = joinTitle(pending.title, cleanTocTitle(line));
      }
      continue;
    }

    if (!split || split.page > maxPage) {
      // Possibly a long section title wrapped onto the next line
      carry = bareNum === null && /[A-Za-z]{3,}/.test(line) && line.length < 120 ? line : '';
      continue;
    }

    const title = carry ? joinTitle(carry, split.title) : split.title;
    carry = '';
    const hasChapters = entries.some((c) => c.kind === 'chapter');

    // References / Appendices / Curriculum Vitae become their own top-level entries
    const backKey = hasChapters ? backMatterKey(title) : null;
    if (backKey) {
      const existing = entries.find((c) => c.kind === 'back' && c.key === backKey);
      if (existing) {
        current = existing;
        if (backKey === 'appendices') addSection(existing, title, split.page);
        continue;
      }
      current = { kind: 'back', key: backKey, title: BACK_MATTER_LABELS[backKey], claimedPage: split.page, sections: [] };
      entries.push(current);
      if (backKey === 'appendices' && !/^APPENDI(CES|X)$/i.test(title.replace(/\s+/g, ''))) {
        addSection(current, title, split.page);
      }
      continue;
    }

    // Chapters written without the word CHAPTER, e.g. "I. INTRODUCTION ..... 1"
    const bare = title.match(/^([IVX]{1,4}|\d{1,2})(?:[.):]\s*|\s+)([A-Z][^a-z]{2,})$/);
    if (bare && !entries.some((c) => c.kind === 'back')) {
      const n = chapterTokenToNumber(bare[1]);
      if (n && n === lastChapterNum() + 1) {
        pushChapter(n, bare[2], split.page);
        continue;
      }
    }

    if (current) addSection(current, title, split.page);
  }

  return entries;
};

const buildEntryLabel = (entry) => {
  if (entry.kind === 'back') return entry.title;
  const title = prettifyHeading(entry.title) || CANONICAL_CHAPTER_TITLES[entry.num] || '';
  return title ? `Chapter ${entry.num}: ${title}` : `Chapter ${entry.num}`;
};

const toFinalEntry = (entry, page, sectionOffset, total) => {
  const id = entry.kind === 'chapter' ? `chap-${entry.num}` : `back-${entry.key}`;
  return {
    id,
    chapterNumber: entry.kind === 'chapter' ? entry.num : null,
    label: buildEntryLabel(entry),
    page,
    displayPage: entry.claimedPage ?? page,
    sections: (entry.sections || []).map((sec, sIdx) => ({
      id: `${id}-sec-${sIdx + 1}`,
      title: sec.title,
      page: Math.max(page, clampPage(sec.claimedPage + sectionOffset, total)),
      displayPage: sec.claimedPage,
    })),
  };
};

// Build TOC from embedded PDF bookmarks (exact physical pages, instant)
const buildTocFromOutline = async (pdfDoc, total) => {
  const outline = await withTimeout(pdfDoc.getOutline(), TOC_PAGE_TIMEOUT_MS);
  if (!Array.isArray(outline) || outline.length === 0) return [];

  const resolvePage = async (dest) => {
    try {
      let explicit = dest;
      if (typeof dest === 'string') explicit = await withTimeout(pdfDoc.getDestination(dest), TOC_PAGE_TIMEOUT_MS);
      if (!Array.isArray(explicit) || explicit[0] == null) return null;
      const ref = explicit[0];
      if (typeof ref === 'number') return clampPage(ref + 1, total);
      const idx = await withTimeout(pdfDoc.getPageIndex(ref), TOC_PAGE_TIMEOUT_MS);
      return clampPage(idx + 1, total);
    } catch {
      return null;
    }
  };

  const flat = [];
  const walk = (items, depth) => {
    for (const item of items || []) {
      if (flat.length >= 300) return;
      flat.push({ title: cleanTocTitle(item.title), dest: item.dest, depth });
      if (depth < 3) walk(item.items, depth + 1);
    }
  };
  walk(outline, 0);

  const result = [];
  let current = null;
  let currentDepth = 0;
  for (const node of flat) {
    const chap = node.title.match(CHAPTER_LINE_RE);
    const chapNum = chap ? chapterTokenToNumber(chap[1]) : null;
    const backKey = result.length > 0 ? backMatterKey(node.title) : null;

    if (chapNum && !result.some((r) => r.kind === 'chapter' && r.num === chapNum)) {
      const page = await resolvePage(node.dest);
      if (!page) continue;
      current = { kind: 'chapter', num: chapNum, title: cleanTocTitle(chap[2] || ''), page, sections: [] };
      currentDepth = node.depth;
      result.push(current);
    } else if (backKey && !result.some((r) => r.kind === 'back' && r.key === backKey)) {
      const page = await resolvePage(node.dest);
      if (!page) continue;
      current = { kind: 'back', key: backKey, title: BACK_MATTER_LABELS[backKey], page, sections: [] };
      currentDepth = node.depth;
      result.push(current);
    } else if (current && node.depth === currentDepth + 1 && node.title && current.sections.length < 60) {
      const page = await resolvePage(node.dest);
      if (page) current.sections.push({ title: prettifyHeading(node.title), page });
    }
  }

  if (!result.some((r) => r.kind === 'chapter')) return [];

  return result.map((entry) => {
    const id = entry.kind === 'chapter' ? `chap-${entry.num}` : `back-${entry.key}`;
    return {
      id,
      chapterNumber: entry.kind === 'chapter' ? entry.num : null,
      label: buildEntryLabel(entry),
      page: entry.page,
      displayPage: entry.page,
      sections: entry.sections.map((sec, sIdx) => ({
        id: `${id}-sec-${sIdx + 1}`,
        title: sec.title,
        page: sec.page,
        displayPage: sec.page,
      })),
    };
  });
};

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
  // Programmatic jump guards: prevents IntersectionObserver from fighting TOC / page jumps
  const currentPageRef = useRef(1);
  const programmaticScrollRef = useRef(false);
  const programmaticTimersRef = useRef([]);
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
  const [copiedFormat, setCopiedFormat] = useState(null);

  // PDF source state with Blob URL to eliminate Cross-Origin Range Request redirects
  const [pdfSource, setPdfSource] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  // Nested Table of Contents hierarchy: [{ id, chapterNumber, label, page, sections: [{ id, title, page }] }]
  const [tableOfContents, setTableOfContents] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [isTocScanning, setIsTocScanning] = useState(false);
  const [tocScanProgress, setTocScanProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [discoveredChapters, setDiscoveredChapters] = useState([]);
  const scanAbortRef = useRef(0);
  // Loaded PDF.js document (shared with the Pages tab thumbnails so the PDF is parsed only once)
  const [pdfDocument, setPdfDocument] = useState(null);
  // Real page height/width ratio of the manuscript (A4 = 1.414, Letter = 1.294)
  const [pageAspect, setPageAspect] = useState(1.414);

  // PDF.js options to disable range requests & streaming (which cause Firebase Storage redirect errors)
  const pdfOptions = useMemo(() => ({
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
  }), []);

  useEffect(() => {
    const rawUrl = paper?.documents?.['Final Manuscript']?.url;
    scanAbortRef.current += 1;
    setTableOfContents([]);
    setExpandedChapters({});
    setIsTocScanning(false);
    setTocScanProgress({ current: 0, total: 0, percent: 0 });
    setDiscoveredChapters([]);
    setPdfDocument(null);
    pageRefsMap.current = {};

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
      scanAbortRef.current += 1;
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
  const currentPdfHeight = Math.round(currentPdfWidth * pageAspect);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(2.5, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.75, +(prev - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // Fast Front-Matter Table of Contents Scanner (~1.5s):
  // Instead of scanning all 100+ pages (which saturated memory and caused Chrome 'Page Unresponsive'),
  // we scan only preliminary pages (1 to Math.min(14, total)) where the author's Table of Contents is located.
  // Fast, freeze-proof Table of Contents scanner:
  //  1. Instant cache check (memory + sessionStorage)
  //  2. PDF bookmarks check (exact physical pages in <100ms)
  //  3. Front-matter TOC page scanner with per-page timeouts & main thread cooperative yields
  //  4. Verification of physical Chapter 1 offset
  //  5. Full-document heading fallback if no printed TOC exists
  const detectTableOfContents = useCallback(async (pdfDoc) => {
    if (!pdfDoc) return;
    const total = pdfDoc.numPages || 1;

    // 1. Check in-memory & session cache first for instant 0-second re-loads
    const rawUrl = paper?.documents?.['Final Manuscript']?.url || '';
    const cacheKey = `toc_${TOC_CACHE_VERSION}_${paper?.id || rawUrl.slice(-40) || 'doc'}`;
    if (tocGlobalCache.has(cacheKey)) {
      const cached = tocGlobalCache.get(cacheKey);
      if (Array.isArray(cached) && cached.length > 0) {
        setTableOfContents(cached);
        setExpandedChapters({ [cached[0]?.id]: true });
        setIsTocScanning(false);
        return;
      }
    }
    try {
      const ssCached = sessionStorage.getItem(cacheKey);
      if (ssCached) {
        const parsed = JSON.parse(ssCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tocGlobalCache.set(cacheKey, parsed);
          setTableOfContents(parsed);
          setExpandedChapters({ [parsed[0]?.id]: true });
          setIsTocScanning(false);
          return;
        }
      }
    } catch {
      // sessionStorage read failure is non-fatal
    }

    const currentScanId = ++scanAbortRef.current;
    setIsTocScanning(true);
    const scanLimit = Math.min(25, total);
    setTocScanProgress({ current: 0, total: scanLimit, percent: 0 });
    setDiscoveredChapters([]);

    const startTime = Date.now();
    const isAborted = () => scanAbortRef.current !== currentScanId;

    try {
      // 2. Check embedded PDF bookmarks first (instant & 100% exact)
      try {
        const outlineToc = await buildTocFromOutline(pdfDoc, total);
        if (isAborted()) return;
        if (outlineToc.length > 0) {
          tocGlobalCache.set(cacheKey, outlineToc);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(outlineToc)); } catch {}
          setTableOfContents(outlineToc);
          setExpandedChapters({ [outlineToc[0]?.id]: true });
          return;
        }
      } catch (outlineErr) {
        console.warn("PDF outline detection skipped:", outlineErr);
      }

      // 3. Scan preliminary front-matter pages (pages 1 to min(25, total))
      const frontMatter = [];
      let detectedChap1Physical = null;

      for (let pNum = 1; pNum <= scanLimit; pNum++) {
        if (isAborted()) return;
        if (Date.now() - startTime > TOC_TOTAL_BUDGET_MS) break;

        try {
          const lines = await extractPageLines(pdfDoc, pNum);
          frontMatter.push({ pNum, lines });

          // Also check if this page directly opens Chapter 1
          if (!detectedChap1Physical) {
            const h = detectChapterHeading(lines);
            if (h && h.num === 1) {
              detectedChap1Physical = pNum;
            }
          }
        } catch {
          // Timeout or page extract failure is non-fatal; continue to next page
        }

        await yieldToMain();

        if (!isAborted()) {
          setTocScanProgress({
            current: pNum,
            total: scanLimit,
            percent: Math.min(100, Math.round((pNum / scanLimit) * 100)),
          });
        }
      }

      if (isAborted()) return;

      // 4. Identify Table of Contents page(s)
      let tocPages = [];
      for (let i = 0; i < frontMatter.length; i++) {
        const p = frontMatter[i];
        if (isTocPage(p.lines)) {
          tocPages.push(p);
          // Accumulate continuation pages
          for (let j = i + 1; j < frontMatter.length; j++) {
            const nextP = frontMatter[j];
            if (isListPage(nextP.lines) || detectChapterHeading(nextP.lines)) break;
            if (countEntryLines(nextP.lines) >= 2 || nextP.lines.some(l => DOT_LEADER_RE.test(l))) {
              tocPages.push(nextP);
            } else {
              break;
            }
          }
          break;
        }
      }

      // 5. Parse entries from TOC pages
      let parsedEntries = [];
      if (tocPages.length > 0) {
        const allTocLines = tocPages.flatMap((tp) => tp.lines);
        parsedEntries = parseTocEntries(allTocLines, total);
      }

      let finalTOC = [];

      if (parsedEntries.length > 0) {
        // 6. Calculate offset between manuscript printed page and PDF physical page
        const chap1 = parsedEntries.find((c) => c.kind === 'chapter' && c.num === 1);
        let pageOffset = 0;

        if (detectedChap1Physical && chap1 && chap1.claimedPage) {
          pageOffset = detectedChap1Physical - chap1.claimedPage;
        } else {
          // Probe physical pages near the expected Chapter 1 location to find exact offset
          const lastTocPNum = tocPages[tocPages.length - 1]?.pNum || 10;
          const claimedChap1 = chap1?.claimedPage || 1;
          const probeStart = Math.max(lastTocPNum + 1, claimedChap1);
          const probeEnd = Math.min(total, probeStart + 15);

          for (let probeP = probeStart; probeP <= probeEnd; probeP++) {
            if (isAborted()) return;
            try {
              const probeLines = await extractPageLines(pdfDoc, probeP);
              const heading = detectChapterHeading(probeLines);
              if (heading && heading.num === 1) {
                pageOffset = probeP - claimedChap1;
                break;
              }
              const printedP = detectPrintedPageNumber(probeLines);
              if (printedP && printedP === claimedChap1) {
                pageOffset = probeP - claimedChap1;
                break;
              }
            } catch {}
            await yieldToMain();
          }

          // Fallback offset if probe could not find Chapter 1 heading:
          // In standard university capstones, Chapter 1 immediately follows the front matter
          if (pageOffset === 0 && lastTocPNum > 1 && chap1) {
            pageOffset = Math.max(0, lastTocPNum);
          }
        }

        finalTOC = parsedEntries.map((e) => {
          const rawPhys = (e.claimedPage ?? 1) + pageOffset;
          const phys = clampPage(rawPhys, total);
          return toFinalEntry(e, phys, pageOffset, total);
        });
      } else {
        // 7. Fallback: No printed TOC found; sweep pages to detect chapter headings directly
        const fallbackChapters = [];
        const sweepBudget = Math.min(total, 60);

        for (let pNum = 1; pNum <= sweepBudget; pNum++) {
          if (isAborted()) return;
          if (Date.now() - startTime > TOC_TOTAL_BUDGET_MS) break;

          try {
            const lines = frontMatter.find((f) => f.pNum === pNum)?.lines || (await extractPageLines(pdfDoc, pNum));
            const heading = detectChapterHeading(lines);
            if (heading && !fallbackChapters.some((c) => c.num === heading.num)) {
              fallbackChapters.push({
                kind: 'chapter',
                num: heading.num,
                title: heading.title || CANONICAL_CHAPTER_TITLES[heading.num] || '',
                claimedPage: pNum,
                sections: [],
              });
            }
          } catch {}
          await yieldToMain();
        }

        fallbackChapters.sort((a, b) => a.num - b.num);
        finalTOC = fallbackChapters.map((e) => toFinalEntry(e, e.claimedPage, 0, total));
      }

      if (!isAborted()) {
        if (finalTOC.length > 0) {
          tocGlobalCache.set(cacheKey, finalTOC);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(finalTOC)); } catch {}
          setTableOfContents(finalTOC);
          setExpandedChapters({ [finalTOC[0]?.id]: true });
        } else {
          setTableOfContents([]);
        }
      }
    } catch (err) {
      console.warn("Table of Contents detection error:", err);
      if (!isAborted()) {
        setTableOfContents([]);
      }
    } finally {
      if (!isAborted()) {
        setIsTocScanning(false);
      }
    }
  }, [paper?.id, paper?.documents]);

  const onDocumentLoadSuccess = useCallback((pdfDoc) => {
    const pages = pdfDoc?.numPages || 0;
    setNumPages(pages);
    setPdfDocument(pdfDoc);

    // Measure true page aspect ratio to prevent layout shifting on non-A4 documents
    if (pdfDoc && typeof pdfDoc.getPage === 'function') {
      pdfDoc.getPage(1).then((firstPage) => {
        const viewport = firstPage.getViewport({ scale: 1 });
        if (viewport?.width && viewport?.height) {
          const ratio = +(viewport.height / viewport.width).toFixed(3);
          if (ratio >= 0.8 && ratio <= 2.2) {
            setPageAspect(ratio);
          }
        }
      }).catch(() => {});
    }

    if (pdfDoc) {
      detectTableOfContents(pdfDoc);
    }
  }, [detectTableOfContents]);

  const scrollToPage = useCallback((pg) => {
    const clamped = Math.max(1, Math.min(numPages || pg, pg));
    currentPageRef.current = clamped;
    setCurrentPage(clamped);

    // Suppress IntersectionObserver during smooth scrolling to prevent cascade re-renders
    programmaticScrollRef.current = true;
    programmaticTimersRef.current.forEach(clearTimeout);
    programmaticTimersRef.current = [
      setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 750),
    ];

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
        if (programmaticScrollRef.current) return;
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
          if (!isNaN(pg) && pg !== currentPageRef.current) {
            currentPageRef.current = pg;
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (chatSpeechResumeTimerRef.current) {
        clearInterval(chatSpeechResumeTimerRef.current);
        chatSpeechResumeTimerRef.current = null;
      }
    };
  }, []);

  // AI Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState(null);
  const [speakingChatIndex, setSpeakingChatIndex] = useState(null);
  const activeChatUtterancesRef = useRef([]);
  const chatSpeechResumeTimerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Helper: Strip markdown for clean natural speech
  const cleanMarkdownForSpeech = (markdownText) => {
    if (!markdownText) return '';
    return markdownText
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/^#{1,6}\s+/gm, '') // markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italics
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/^\s*[-*+]\s+/gm, '') // bullet points
      .replace(/^\s*(\d+)\.\s+/gm, '$1. ') // numbered items
      .replace(/[><]/g, '') // xml/html tags
      .replace(/\n+/g, '. ') // line breaks to pauses
      .replace(/\s+/g, ' ') // collapse spacing
      .trim();
  };

  // Helper: Split long text into manageable chunks (< 160 chars) to bypass Chrome 15s freeze bug
  const splitIntoSpeechChunks = (text, maxLength = 160) => {
    if (!text) return [];
    const rawSentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = '';

    for (const raw of rawSentences) {
      const sentence = raw.trim();
      if (!sentence) continue;

      if ((current + ' ' + sentence).trim().length <= maxLength) {
        current = (current + ' ' + sentence).trim();
      } else {
        if (current) chunks.push(current);
        if (sentence.length > maxLength) {
          const words = sentence.split(' ');
          let subChunk = '';
          for (const word of words) {
            if ((subChunk + ' ' + word).trim().length <= maxLength) {
              subChunk = (subChunk + ' ' + word).trim();
            } else {
              if (subChunk) chunks.push(subChunk);
              subChunk = word;
            }
          }
          current = subChunk;
        } else {
          current = sentence;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  const stopChatSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (chatSpeechResumeTimerRef.current) {
      clearInterval(chatSpeechResumeTimerRef.current);
      chatSpeechResumeTimerRef.current = null;
    }
    activeChatUtterancesRef.current = [];
    setSpeakingChatIndex(null);
  }, []);

  const handleListenChatMessage = useCallback((content, idx) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      Swal.fire('Speech Unavailable', 'Text-to-speech is not supported on this browser.', 'info');
      return;
    }

    // If user clicks on the currently speaking message, toggle STOP
    if (speakingChatIndex === idx) {
      stopChatSpeech();
      return;
    }

    // Stop abstract audio or any active speech
    if (isSpeaking) {
      setIsSpeaking(false);
    }
    stopChatSpeech();

    const cleanedText = cleanMarkdownForSpeech(content);
    if (!cleanedText) return;

    const chunks = splitIntoSpeechChunks(cleanedText, 160);
    if (chunks.length === 0) return;

    setSpeakingChatIndex(idx);

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female')))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];

    let chunkIndex = 0;

    const speakChunk = () => {
      if (chunkIndex >= chunks.length) {
        stopChatSpeech();
        return;
      }

      const chunkText = chunks[chunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      if (voice) utterance.voice = voice;

      // Keep strong reference in ref to prevent V8 garbage collection
      activeChatUtterancesRef.current = [utterance];

      utterance.onend = () => {
        chunkIndex++;
        speakChunk();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && chunkIndex < chunks.length - 1) {
          chunkIndex++;
          speakChunk();
        } else {
          stopChatSpeech();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    // Chrome 15s freeze fix: resume every 8 seconds if paused
    if (chatSpeechResumeTimerRef.current) clearInterval(chatSpeechResumeTimerRef.current);
    chatSpeechResumeTimerRef.current = setInterval(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 8000);

    speakChunk();
  }, [speakingChatIndex, isSpeaking, stopChatSpeech]);

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

  // Formatted citations strictly adhering to official APA 7, MLA 9, and IEEE specifications (Top-level hook)
  const citations = useMemo(() => {
    if (!paper) {
      return generateAllCitations({});
    }
    const pubYear = paper.publishedAt
      ? (typeof paper.publishedAt?.toDate === 'function'
          ? paper.publishedAt.toDate().getFullYear()
          : new Date(paper.publishedAt).getFullYear())
      : new Date().getFullYear();

    return generateAllCitations({
      title: paper.researchTitle || paper.title || 'Untitled Research',
      authorDisplay: paper.authorDisplay || 'Unknown Author',
      year: isNaN(pubYear) ? new Date().getFullYear() : pubYear,
      institution: 'SWU PHINMA'
    });
  }, [paper]);

  const recordedViewsRef = useRef(new Set());
  const hasTrackedAnalytics = useRef(false);

  // Increment view count when paper viewer opens (session & user deduplicated)
  useEffect(() => {
    if (!id) return;

    const userKey = currentUser?.uid ? `user_${currentUser.uid}` : 'anon';
    const viewToken = `${id}_${userKey}`;
    const storageKey = `archivio_viewed_${id}_${userKey}`;

    if (recordedViewsRef.current.has(viewToken) || sessionStorage.getItem(storageKey)) {
      return;
    }

    recordedViewsRef.current.add(viewToken);
    sessionStorage.setItem(storageKey, '1');

    const docRef = doc(db, 'submissions', id);
    const updateData = { views: increment(1) };
    if (currentUser) {
      const viewerInfo = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email || ''
      };
      updateData.viewedUsers = arrayUnion(viewerInfo);
      updateData.viewedBy = arrayUnion(currentUser.uid);
    }

    updateDoc(docRef, updateData)
      .catch(err => {
        console.warn("Full view update failed, falling back to counter-only update:", err.message);
        updateDoc(docRef, { views: increment(1) })
          .catch(retryErr => console.error("Views counter fallback failed:", retryErr.message));
      });
  }, [id, currentUser]);

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
    setIsTyping(true);
    trackAiChat(paper, userMessage.length);

    // Smart Cache check for summarization
    const isSummarizeRequest = userMessage.toLowerCase().includes('summarize');
    if (isSummarizeRequest && paper?.aiSummary) {
      const cachedSummary = typeof paper.aiSummary === 'string'
        ? paper.aiSummary
        : (paper.aiSummary.summary || paper.aiSummary.executiveSummary || '');
      if (cachedSummary && cachedSummary.length > 50) {
        setChatHistory(prev => [
          ...prev,
          { role: 'user', content: userMessage },
          { role: 'model', content: cachedSummary }
        ]);
        setIsTyping(false);
        return;
      }
    }

    // Add user message and empty model bubble for live typewriter streaming
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'model', content: '' }
    ]);

    try {
      const pdfUrlToUse = paper?.documents?.['Final Manuscript']?.url || paper?.pdfUrl || paper?.fileUrl;
      const finalAccumulated = await streamAIChat({
        paper: {
          researchTitle: paper?.researchTitle || paper?.title || 'Untitled',
          authorDisplay: paper?.authorDisplay || 'Unknown',
          abstract: paper?.abstract || '',
          keywords: paper?.keywords || [],
          publishedAt: paper?.publishedAt || null
        },
        chatHistory: chatHistory.slice(1).filter(m => m.content),
        userMessage,
        pdfUrl: pdfUrlToUse && pdfUrlToUse !== '#' ? pdfUrlToUse : undefined,
        onChunk: (accumulated) => {
          setChatHistory(prev => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (next[lastIdx]?.role === 'model') {
              next[lastIdx] = { ...next[lastIdx], content: accumulated };
            }
            return next;
          });
        }
      });

      // Save summary in local paper state if this was a summary generation
      if (isSummarizeRequest && finalAccumulated && paper) {
        setPaper(prev => prev ? { ...prev, aiSummary: finalAccumulated } : prev);
      }
    } catch (err) {
      console.error("AI Streaming Error:", err);
      setChatHistory(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        const errMsg = `⚠️ **Notice:** ${err.message || 'Connection issue encountered'}. Please tap retry.`;
        if (next[lastIdx]?.role === 'model') {
          next[lastIdx] = { ...next[lastIdx], content: errMsg };
        } else {
          next.push({ role: 'model', content: errMsg });
        }
        return next;
      });
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

    stopChatSpeech();

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

  const handleCopyCitation = (formatKey, textToCopy) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(formatKey);
    setTimeout(() => setCopiedFormat(null), 2000);
    trackCitation(paper, formatKey.toUpperCase());
    Swal.fire({
      title: 'Copied to Clipboard!',
      text: `${formatKey.toUpperCase()} citation copied according to official standards.`,
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: 'bottom-start'
    });
  };

  const generateRIS = () => {
    if (!paper) return;
    const cleanTitle = cleanTitleText(paper.researchTitle || paper.title || 'Untitled');
    const parsedAuthors = parseAuthors(paper.authorDisplay || 'Unknown Author');
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();

    const authorLines = parsedAuthors.length > 0
      ? parsedAuthors.map(a => `AU  - ${a.isGroup ? a.fullName : (a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName)}`)
      : ['AU  - Unknown Author'];

    const content = [
      'TY  - RPRT',
      `TI  - ${cleanTitle}`,
      ...authorLines,
      `PY  - ${yearStr}`,
      'PB  - SWU PHINMA',
      `UR  - ${window.location.href}`,
      `AB  - ${paper.abstract || ''}`,
      'ER  - '
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle.replace(/\s+/g, '_')}.ris`;
    a.click();
    URL.revokeObjectURL(url);
    trackCitation(paper, 'RIS');
  };

  const generateBibTeX = () => {
    if (!paper) return;
    const cleanTitle = toTitleCase(paper.researchTitle || paper.title || 'Untitled');
    const parsedAuthors = parseAuthors(paper.authorDisplay || 'Unknown Author');
    const yearStr = new Date(paper.publishedAt || Date.now()).getFullYear();

    const bibAuthors = parsedAuthors.length > 0
      ? parsedAuthors.map(a => a.isGroup ? `{${a.fullName}}` : (a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName)).join(' and ')
      : 'Unknown Author';

    const firstLastName = parsedAuthors[0]?.lastName || 'Research';
    const citationKey = `${firstLastName.replace(/\s+/g, '')}${yearStr}`;

    const content = [
      `@techreport{${citationKey},`,
      `  title = {${cleanTitle}},`,
      `  author = {${bibAuthors}},`,
      `  year = {${yearStr}},`,
      '  institution = {SWU PHINMA},',
      `  url = {${window.location.href}}`,
      '}'
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle.replace(/\s+/g, '_')}.bib`;
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

  const handleChapterClick = (chap) => {
    if (!chap) return;
    // Open chapter accordion on first click so user sees subsections immediately, toggle on subsequent clicks
    setExpandedChapters(prev => ({
      ...prev,
      [chap.id]: prev[chap.id] === undefined ? true : !prev[chap.id]
    }));
    // Jump to chapter page
    const pageNum = typeof chap.page === 'number' ? chap.page : parseInt(chap.page, 10);
    if (!isNaN(pageNum) && pageNum >= 1) {
      scrollToPage(pageNum);
    }
  };

  const handleSectionClick = (targetPage, isDrawer = false) => {
    const pageNum = typeof targetPage === 'number' ? targetPage : parseInt(targetPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1) {
      scrollToPage(pageNum);
      if (isDrawer || isMobile) {
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
    const likes = Array.isArray(paper?.likes) ? paper.likes : [];
    const isCurrentlyLiked = likes.includes(currentUser.uid);
    const userInfo = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      email: currentUser.email || ''
    };

    // Optimistic local update
    const updatedLikes = isCurrentlyLiked 
      ? likes.filter(uid => uid !== currentUser.uid)
      : [...likes, currentUser.uid];
    setPaper(prev => prev ? ({ ...prev, likes: updatedLikes }) : prev);

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
      console.error("Like toggle completely failed:", finalErr.message);
      // Revert optimistic update
      setPaper(prev => prev ? ({ ...prev, likes }) : prev);
      Swal.fire({
        title: 'Action Failed',
        text: 'Unable to update like at this time. Please try again.',
        icon: 'error',
        confirmButtonColor: '#7a2039'
      });
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
          <div className="w-20 bg-[#faf8f5] dark:bg-gray-800 border-r border-stone-300 dark:border-gray-700 flex flex-col items-center py-3 gap-2 flex-shrink-0 z-10 hidden md:flex">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-14 h-11 rounded-xl animate-shimmer" />
            ))}
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

  const title = cleanTitleText(paper.researchTitle || paper.title || 'Untitled Research');
  const authorName = paper.authorDisplay;
  const adviser = paper.adviserName || 'Unknown Adviser';
  const pubYear = paper.publishedAt
    ? (typeof paper.publishedAt?.toDate === 'function'
        ? paper.publishedAt.toDate().getFullYear()
        : new Date(paper.publishedAt).getFullYear())
    : new Date().getFullYear();
  const year = isNaN(pubYear) ? new Date().getFullYear() : pubYear;

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
      const allExpanded =
        tableOfContents.length > 0 &&
        tableOfContents.every(c => expandedChapters[c.id]);

      const toggleAllChapters = () => {
        if (allExpanded) {
          setExpandedChapters({});
        } else {
          const nextState = {};
          tableOfContents.forEach(c => {
            nextState[c.id] = true;
          });
          setExpandedChapters(nextState);
        }
      };

      return (
        <div className="p-4 flex flex-col h-full bg-[#fcfbf7] dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">
              Table of Contents
            </h2>
            {tableOfContents.length > 1 && (
              <button
                type="button"
                onClick={toggleAllChapters}
                className="text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] transition cursor-pointer"
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {isTocScanning && tableOfContents.length === 0 ? (
              <div className="py-6 px-3 flex flex-col items-center text-center">
                {/* Animated Manuscript Book Loader */}
                <div className="relative mb-3 flex items-center justify-center">
                  <div className="w-16 h-12 relative flex items-center justify-center">
                    <svg className="w-14 h-12 text-[#7a2039] dark:text-[#f3e5ab] drop-shadow-xs" viewBox="0 0 64 48" fill="none">
                      {/* Left Cover & Spine */}
                      <path d="M32 40C24 37 12 37 4 39V11C12 9 24 9 32 12V40Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                      {/* Right Cover */}
                      <path d="M32 40C40 37 52 37 60 39V11C52 9 40 9 32 12V40Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                      {/* Book Center Line / Spine */}
                      <line x1="32" y1="12" x2="32" y2="40" stroke="#f8d070" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Left Page Lines */}
                      <line x1="10" y1="18" x2="26" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                      <line x1="10" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                      <line x1="10" y1="30" x2="22" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                      {/* Right Page Lines */}
                      <line x1="38" y1="18" x2="54" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                      <line x1="38" y1="24" x2="54" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                      <line x1="38" y1="30" x2="50" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                    </svg>
                    {/* Animated Turning Page */}
                    <span className="absolute w-5 h-7 border-r-2 border-[#7a2039] dark:border-[#f3e5ab] animate-pulse origin-left"></span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Reading Table of Contents
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  Fast scanning manuscript outline (~2 seconds)
                </p>

                {/* Progress Bar */}
                <div className="w-full max-w-[210px] mt-3.5 bg-stone-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-[#7a2039] to-[#a83250] dark:from-[#f3e5ab] dark:to-[#d4af37] h-full transition-all duration-200 rounded-full"
                    style={{ width: `${tocScanProgress.percent || 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between w-full max-w-[210px] mt-1.5 text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  <span>Page {tocScanProgress.current || 0} of {tocScanProgress.total || 14}</span>
                  <span className="font-bold text-[#7a2039] dark:text-[#f3e5ab]">{tocScanProgress.percent || 0}%</span>
                </div>

                {/* Reassurance Notice */}
                <div className="mt-4 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-left w-full">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-800 dark:text-amber-300 mb-1">
                    <span>📖</span>
                    <span>Instant Outline Detection</span>
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-stone-300 leading-normal">
                    Directly parsing the author's Table of Contents from the preliminary pages for fast, accurate navigation.
                  </p>
                </div>
              </div>
            ) : tableOfContents.length === 0 ? (
              <div className="py-12 px-3 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-gray-700/50 flex items-center justify-center text-stone-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  No Table of Contents Detected
                </p>
                <p className="text-[11px] text-stone-600 dark:text-gray-300 mt-1 max-w-[210px] leading-relaxed">
                  Only chapters present in this manuscript are displayed. Use the Pages tab to navigate directly.
                </p>
              </div>
            ) : (
              tableOfContents.map((chap, idx) => {
                const nextChap = tableOfContents[idx + 1];
                const isCurrentChapter =
                  currentPage >= chap.page && (!nextChap || currentPage < nextChap.page);
                const isExpanded = !!expandedChapters[chap.id];
                const hasSections = Array.isArray(chap.sections) && chap.sections.length > 0;

                return (
                  <div key={chap.id || idx} className="flex flex-col">
                    {/* Top-Level Chapter Maroon Button */}
                    <button
                      type="button"
                      onClick={() => {
                        handleChapterClick(chap);
                        if (!hasSections && isDrawer) {
                          setIsMobileDrawerOpen(false);
                        }
                      }}
                      className={`text-left px-3.5 py-2.5 text-xs font-medium rounded-xl shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer flex items-center justify-between group ${
                        isCurrentChapter
                          ? 'bg-[#5a1528] text-white ring-2 ring-[#7a2039]'
                          : 'bg-[#7a2039] hover:bg-[#5a1528] text-white'
                      }`}
                    >
                      <span className="font-semibold tracking-tight pr-2 truncate">
                        {chap.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded text-white/90 font-mono">
                          p. {chap.displayPage || chap.page}
                        </span>
                        {hasSections ? (
                          <svg
                            className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 transition-transform">
                            ›
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Sub-Level Sections: Plain Text Links Indented */}
                    {isExpanded && hasSections && (
                      <div className="mt-1.5 mb-2 ml-3 pl-3 sm:ml-3.5 sm:pl-3.5 border-l-2 border-stone-200 dark:border-gray-700 flex flex-col gap-0.5">
                        {chap.sections.map((sec, sIdx) => {
                          const nextSec = chap.sections[sIdx + 1];
                          const isCurrentSection =
                            currentPage >= sec.page &&
                            (!nextSec
                              ? !nextChap || currentPage < nextChap.page
                              : currentPage < nextSec.page);

                          return (
                            <button
                              key={sec.id || sIdx}
                              type="button"
                              onClick={() => {
                                handleSectionClick(sec.page, isDrawer);
                              }}
                              className={`group/sec w-full text-left py-1.5 px-2.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                isCurrentSection
                                  ? 'bg-[#7a2039]/10 dark:bg-[#7a2039]/25 text-[#7a2039] dark:text-[#f3e5ab] font-semibold'
                                  : 'text-stone-600 dark:text-stone-300 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:bg-stone-200/50 dark:hover:bg-gray-700/50 font-normal'
                              }`}
                              title={sec.title}
                            >
                              <span className="truncate pr-1 leading-snug">
                                {sec.title}
                              </span>
                              <span
                                className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                                  isCurrentSection
                                    ? 'bg-[#7a2039]/20 text-[#7a2039] dark:text-[#f3e5ab] font-bold'
                                    : 'text-stone-600 dark:text-gray-300 group-hover/sec:text-[#7a2039] dark:group-hover/sec:text-[#f3e5ab]'
                                }`}
                              >
                                p. {sec.displayPage || sec.page}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
              pdfDocument ? (
                Array.from({ length: numPages }).map((_, idx) => (
                  <SidebarThumbnailItem
                    key={idx}
                    pdf={pdfDocument}
                    pageNum={idx + 1}
                    currentPage={currentPage}
                    isMobile={isMobile}
                    scrollToPage={scrollToPage}
                    isDrawer={isDrawer}
                    setIsMobileDrawerOpen={setIsMobileDrawerOpen}
                  />
                ))
              ) : (
                <Document file={pdfSource} options={pdfOptions}>
                  {Array.from({ length: numPages }).map((_, idx) => (
                    <SidebarThumbnailItem
                      key={idx}
                      pdf={null}
                      pageNum={idx + 1}
                      currentPage={currentPage}
                      isMobile={isMobile}
                      scrollToPage={scrollToPage}
                      isDrawer={isDrawer}
                      setIsMobileDrawerOpen={setIsMobileDrawerOpen}
                    />
                  ))}
                </Document>
              )
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
          <div className="flex items-center justify-between mb-4 border-b border-stone-200 dark:border-gray-700 pb-2">
            <h2 className="font-serif font-bold text-base md:text-lg text-stone-800 dark:text-gray-200">Citation Formats</h2>
            <span className="text-[10px] font-medium text-stone-500 dark:text-gray-400 bg-stone-200/60 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              Standardized
            </span>
          </div>

          <div className="flex flex-col gap-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {/* APA Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl p-3.5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">APA 7th Edition</h3>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-gray-700/80 text-stone-500 dark:text-gray-400">
                    Sentence Case
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('apa', citations.apa.plainText)}
                  className={`text-[10px] px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                    copiedFormat === 'apa'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#7a2039] text-white hover:bg-[#5a1528]'
                  }`}
                  title="Copy APA 7th Edition Citation"
                >
                  {copiedFormat === 'apa' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-300 leading-relaxed font-serif selection:bg-[#7a2039]/20 selection:text-[#7a2039]">
                {citations.apa.author} ({citations.apa.year}). <i>{citations.apa.title}</i> {citations.apa.institution}.
              </p>
            </div>

            {/* MLA Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl p-3.5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">MLA 9th Edition</h3>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-gray-700/80 text-stone-500 dark:text-gray-400">
                    Title Case
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('mla', citations.mla.plainText)}
                  className={`text-[10px] px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                    copiedFormat === 'mla'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#7a2039] text-white hover:bg-[#5a1528]'
                  }`}
                  title="Copy MLA 9th Edition Citation"
                >
                  {copiedFormat === 'mla' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-300 leading-relaxed font-serif selection:bg-[#7a2039]/20 selection:text-[#7a2039]">
                {citations.mla.author}. "{citations.mla.title}" <i>{citations.mla.institution}</i>, {citations.mla.year}.
              </p>
            </div>

            {/* IEEE Format */}
            <div className="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl p-3.5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200">IEEE</h3>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-gray-700/80 text-stone-500 dark:text-gray-400">
                    Initials Surname
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCitation('ieee', citations.ieee.plainText)}
                  className={`text-[10px] px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                    copiedFormat === 'ieee'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#7a2039] text-white hover:bg-[#5a1528]'
                  }`}
                  title="Copy IEEE Citation"
                >
                  {copiedFormat === 'ieee' ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-gray-300 leading-relaxed font-serif selection:bg-[#7a2039]/20 selection:text-[#7a2039]">
                {citations.ieee.author}, "{citations.ieee.title}," {citations.ieee.institution}, {citations.ieee.year}.
              </p>
            </div>

            {/* Export Section */}
            <div className="mt-2 border-t border-stone-200 dark:border-gray-700 pt-3">
              <h3 className="text-xs font-bold text-stone-800 dark:text-gray-200 mb-2 uppercase tracking-wider">Export Citation</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={generateRIS}
                  className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-3 py-2.5 rounded-lg text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-xs text-left font-medium cursor-pointer flex justify-between items-center group"
                >
                  <span className="group-hover:text-[#7a2039] dark:group-hover:text-[#f3e5ab] transition-colors">Download .RIS (Mendeley, EndNote)</span>
                  <span className="text-xs text-stone-400 group-hover:text-[#7a2039] transition-colors">⬇</span>
                </button>
                <button
                  type="button"
                  onClick={generateBibTeX}
                  className="w-full bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 px-3 py-2.5 rounded-lg text-xs hover:bg-stone-50 dark:hover:bg-gray-700 transition shadow-xs text-left font-medium cursor-pointer flex justify-between items-center group"
                >
                  <span className="group-hover:text-[#7a2039] dark:group-hover:text-[#f3e5ab] transition-colors">Download .BibTeX (LaTeX)</span>
                  <span className="text-xs text-stone-400 group-hover:text-[#7a2039] transition-colors">⬇</span>
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

        {/* LEFT TOOLBAR / NAVIGATION RAIL - Master UI/UX Redesign */}
        <div
          className={`w-20 bg-[#faf8f5] dark:bg-[#181316] border-r border-[#e5dfd5] dark:border-white/10 flex-col items-center py-3 px-1 gap-1 flex-shrink-0 z-10 transition-all select-none overflow-y-auto scrollbar-none ${
            isFullscreen ? 'hidden' : 'hidden md:flex'
          }`}
        >
          {/* GROUP 1: READING & NAVIGATION */}
          <div className="flex flex-col items-center gap-1 w-full shrink-0">
            {/* 1. Abstract */}
            <button
              type="button"
              onClick={() => handleTabClick('abstract')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'abstract' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title="Research Abstract & Audio Reader"
            >
              {activeTab === 'abstract' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Abstract
              </span>
            </button>

            {/* 2. Outline */}
            <button
              type="button"
              onClick={() => handleTabClick('toc')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'toc' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title="Table of Contents (Outline)"
            >
              {activeTab === 'toc' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Outline
              </span>
            </button>

            {/* 3. Pages */}
            <button
              type="button"
              onClick={() => handleTabClick('pages')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'pages' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title={`Page Thumbnails (${numPages || '...'})`}
            >
              {activeTab === 'pages' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Pages
              </span>
            </button>

            {/* 4. Full */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {isFullscreen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 0l5-5m0 0l-5 0m5 0l0 5m-5 11l5 5m0 0l-5 0m5 0l0-5m-11 0l-5 5m0 0l5 0m-5 0l0-5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                {isFullscreen ? 'Exit' : 'Full'}
              </span>
            </button>
          </div>

          {/* Section Divider */}
          <div className="w-10 h-px bg-stone-200 dark:bg-white/10 my-1 shrink-0" />

          {/* GROUP 2: ENGAGEMENT & METRICS */}
          <div className="flex flex-col items-center gap-1 w-full shrink-0">
            {/* 5. Save (Bookmark) */}
            <button
              type="button"
              onClick={handleBookmarkToggle}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                isBookmarked
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title={isBookmarked ? 'Remove from Saved Bookmarks' : 'Save to Bookmarks'}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <svg
                  className={`w-5 h-5 transition-transform duration-150 group-hover:scale-110 ${
                    isBookmarked ? 'fill-current text-[#7a2039] dark:text-[#f3e5ab]' : ''
                  }`}
                  fill={isBookmarked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isBookmarked ? '0' : '2'}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                {isBookmarked ? 'Saved' : 'Save'}
              </span>
            </button>

            {/* 6. Like */}
            <button
              type="button"
              onClick={handleLike}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                paper.likes?.includes(currentUser?.uid)
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title={paper.likes?.includes(currentUser?.uid) ? 'Unlike this paper' : 'Like this paper'}
            >
              <div className="relative w-7 h-7 flex items-center justify-center">
                <svg
                  className={`w-5 h-5 transition-transform duration-150 group-hover:scale-110 ${
                    paper.likes?.includes(currentUser?.uid) ? 'fill-current text-[#7a2039] dark:text-[#f3e5ab]' : ''
                  }`}
                  fill={paper.likes?.includes(currentUser?.uid) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={paper.likes?.includes(currentUser?.uid) ? '0' : '2'}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                {(paper.likes?.length || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[#7a2039] dark:bg-[#f3e5ab] text-white dark:text-[#4a1220] text-[9px] font-bold flex items-center justify-center leading-none shadow-xs">
                    {paper.likes.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                {paper.likes?.includes(currentUser?.uid) ? 'Liked' : 'Like'}
              </span>
            </button>

            {/* 7. Views Telemetry */}
            <div
              className="w-[70px] py-1.5 px-1 flex flex-col items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 select-none"
              title={`Total Archive Views: ${paper.views || 0}`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 leading-tight">
                {paper.views || 0}
              </span>
              <span className="text-[8px] text-stone-400 dark:text-stone-500 uppercase tracking-tight">
                Views
              </span>
            </div>
          </div>

          {/* Section Divider */}
          <div className="w-10 h-px bg-stone-200 dark:bg-white/10 my-1 shrink-0" />

          {/* GROUP 3: RESEARCH TOOLS & SHARING */}
          <div className="flex flex-col items-center gap-1 w-full shrink-0">
            {/* 8. Cite */}
            <button
              type="button"
              onClick={() => handleTabClick('cite')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'cite' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title="Generate Citation (APA 7th, IEEE, MLA)"
            >
              {activeTab === 'cite' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Cite
              </span>
            </button>

            {/* 9. Related Studies */}
            <button
              type="button"
              onClick={() => handleTabClick('related')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'related' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title="Related Research Studies"
            >
              {activeTab === 'related' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Related
              </span>
            </button>

            {/* 10. Share & Copy Link */}
            <button
              type="button"
              onClick={() => handleTabClick('share')}
              className={`group relative w-[70px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === 'share' && !isFullscreen
                  ? 'bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-white/5'
              }`}
              title="Share Paper & Copy Link"
            >
              {activeTab === 'share' && !isFullscreen && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-r-full" />
              )}
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-0.5 leading-tight text-center">
                Share
              </span>
            </button>
          </div>
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

              {/* Quick Actions (Bookmark, Like, Fullscreen) */}
              <div className="p-3 grid grid-cols-3 gap-2 border-b border-stone-200 dark:border-gray-700 bg-stone-100 dark:bg-gray-900 shrink-0">
                <button
                  type="button"
                  onClick={handleBookmarkToggle}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs cursor-pointer transition-colors ${
                    isBookmarked ? 'text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs' : 'text-stone-600 dark:text-gray-300'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${isBookmarked ? 'fill-[#7a2039] dark:fill-[#f3e5ab]' : 'text-stone-500'}`}
                    fill={isBookmarked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={isBookmarked ? '0' : '2'}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-[10px] mt-1 font-medium">{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs cursor-pointer transition-colors ${
                    paper.likes?.includes(currentUser?.uid) ? 'text-[#7a2039] dark:text-[#f3e5ab] font-bold shadow-xs' : 'text-stone-600 dark:text-gray-300'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${paper.likes?.includes(currentUser?.uid) ? 'fill-current text-[#7a2039] dark:text-[#f3e5ab]' : 'text-stone-500'}`}
                    fill={paper.likes?.includes(currentUser?.uid) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={paper.likes?.includes(currentUser?.uid) ? '0' : '2'}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  <span className="text-[10px] mt-1 font-medium">
                    {paper.likes?.length ? `${paper.likes.length} Likes` : 'Like'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-xs text-stone-600 dark:text-gray-300 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 0l5-5m0 0l-5 0m5 0l0 5m-5 11l5 5m0 0l-5 0m5 0l0-5m-11 0l-5 5m0 0l5 0m-5 0l0-5" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                  <span className="text-[10px] mt-1 font-medium">{isFullscreen ? 'Exit' : 'Full'}</span>
                </button>
              </div>

              {/* Navigation Tabs List */}
              <div className="flex border-b border-stone-200 dark:border-gray-700 overflow-x-auto text-xs bg-white dark:bg-gray-800 shrink-0 custom-scrollbar">
                {[
                  {
                    id: 'abstract',
                    label: 'Abstract',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )
                  },
                  {
                    id: 'toc',
                    label: 'Outline',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    )
                  },
                  {
                    id: 'pages',
                    label: 'Pages',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )
                  },
                  {
                    id: 'cite',
                    label: 'Cite',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    )
                  },
                  {
                    id: 'related',
                    label: 'Related',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )
                  },
                  {
                    id: 'share',
                    label: 'Share',
                    icon: (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    )
                  }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 py-2.5 px-3 text-center whitespace-nowrap font-medium transition cursor-pointer border-b-2 text-[11px] ${
                      (activeTab === tab.id || (!activeTab && tab.id === 'toc'))
                        ? 'border-[#7a2039] text-[#7a2039] dark:text-[#f3e5ab] dark:border-[#f3e5ab] font-bold'
                        : 'border-transparent text-stone-500 dark:text-gray-400 hover:text-stone-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
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
          <div className="fixed inset-0 z-50 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:w-96 lg:w-[420px] bg-white dark:bg-gray-800 border-l border-stone-300 dark:border-gray-700 flex flex-col h-[100dvh] sm:h-full shadow-2xl transition-all overflow-hidden">
            {/* AI HEADER */}
            <div className="bg-[#7a2039] text-white px-3.5 sm:px-4 py-3 sm:py-3.5 flex justify-between items-center shrink-0 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => { stopChatSpeech(); setIsAiOpen(false); }}
                  className="sm:hidden text-white/80 hover:text-white p-1 -ml-1 text-lg cursor-pointer transition active:scale-95"
                  aria-label="Back to document"
                  title="Back to Document"
                >
                  ←
                </button>
                <img src={logo} alt="Archivio AI" className="w-6 h-6 object-contain bg-white rounded-full p-0.5 shadow-sm shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-sm block leading-tight truncate">Archivio AI Assistant</span>
                  <span className="text-[10px] text-white/80 block leading-tight truncate max-w-[200px] sm:max-w-[260px]">
                    {paper?.researchTitle || 'Research Manuscript'}
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { stopChatSpeech(); setIsAiOpen(false); }} 
                className="text-white/80 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer text-base transition shrink-0"
                title="Close AI Assistant"
              >
                ✕
              </button>
            </div>

            {/* BADGE SUBTITLE */}
            <div className="px-3.5 py-2 bg-stone-50 dark:bg-gray-900 border-b border-stone-200 dark:border-gray-700/80 shrink-0 flex items-center justify-between text-xs text-stone-600 dark:text-gray-400">
              <span className="truncate">⚡ Comprehensive Research Analysis</span>
              <span className="text-[10px] bg-[#7a2039]/10 dark:bg-[#f3e5ab]/15 text-[#7a2039] dark:text-[#f3e5ab] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ml-2">
                Ch 1–5
              </span>
            </div>

            {/* CHAT MESSAGES CONTAINER */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3.5 bg-[#fcfbf7] dark:bg-gray-900 transition-colors custom-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-xs mt-0.5 ${msg.role === 'user' ? 'bg-[#7a2039] text-white text-xs font-bold' : 'bg-white border border-stone-200 dark:border-gray-700'}`}>
                    {msg.role === 'user' ? 'U' : <img src={logo} alt="Archivio AI" className="w-full h-full object-contain p-0.5" />}
                  </div>
                  <div className="flex flex-col gap-1 max-w-[88%] sm:max-w-[85%]">
                    <div className={`text-xs sm:text-[13px] p-3 sm:p-3.5 shadow-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#7a2039] text-white rounded-2xl rounded-tr-sm whitespace-pre-wrap font-medium'
                        : 'bg-white dark:bg-gray-800 border border-stone-200/90 dark:border-gray-700/90 text-stone-800 dark:text-gray-200 rounded-2xl rounded-tl-sm'
                    }`}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : msg.content ? (
                        <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-stone-800 dark:text-gray-200 prose-headings:font-bold prose-headings:text-[#7a2039] dark:prose-headings:text-[#f3e5ab] prose-headings:my-2 prose-p:my-1.5 prose-p:leading-relaxed prose-ul:my-1.5 prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0.5 prose-strong:text-[#7a2039] dark:prose-strong:text-[#f3e5ab] break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 items-center py-1">
                          <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-1.5 h-1.5 bg-[#7a2039] dark:bg-[#f3e5ab] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                          <span className="text-[11px] text-stone-400 dark:text-gray-500 ml-1.5">Generating answer...</span>
                        </div>
                      )}

                      {/* INLINE RETRY BUTTON IF ERROR */}
                      {msg.role !== 'user' && msg.content.includes('⚠️') && (
                        <button
                          type="button"
                          disabled={isTyping}
                          onClick={() => {
                            const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user');
                            if (lastUserMsg) {
                              handleChatSubmit(null, lastUserMsg.content);
                            }
                          }}
                          className="mt-2.5 text-[11px] font-semibold bg-[#7a2039] hover:bg-[#5a1528] active:scale-95 text-white px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span>🔄</span> Tap to Retry
                        </button>
                      )}
                    </div>
                    {msg.role !== 'user' && !msg.content.includes('⚠️') && (
                      <div className="flex items-center gap-2 ml-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMsgIndex(idx);
                            setTimeout(() => setCopiedMsgIndex(null), 2000);
                          }}
                          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-stone-100 dark:bg-gray-800/80 text-stone-500 dark:text-gray-400 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:bg-stone-200 dark:hover:bg-gray-700 transition cursor-pointer active:scale-95"
                          title="Copy response"
                        >
                          {copiedMsgIndex === idx ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              ✓ Copied
                            </span>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleListenChatMessage(msg.content, idx)}
                          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded transition cursor-pointer active:scale-95 shadow-2xs ${
                            speakingChatIndex === idx
                              ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse font-semibold'
                              : 'bg-stone-100 dark:bg-gray-800/80 text-stone-600 dark:text-gray-300 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] hover:bg-stone-200 dark:hover:bg-gray-700'
                          }`}
                          title={speakingChatIndex === idx ? "Stop speech playback" : "Listen to this response"}
                        >
                          {speakingChatIndex === idx ? (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="4" y="4" width="16" height="16" rx="2" />
                              </svg>
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 010 7.07" />
                                <path d="M19.07 4.93a10 10 0 010 14.14" />
                              </svg>
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* QUICK SUGGESTION CHIPS - TOUCH-FRIENDLY & SCROLLABLE ON ANY PHONE */}
            <div className="px-3 py-2 bg-stone-50/95 dark:bg-gray-900/95 border-t border-stone-200 dark:border-gray-700/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar shrink-0">
              {AI_SUGGESTIONS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleChatSubmit(null, item.prompt)}
                  className="shrink-0 text-xs font-semibold bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-[#7a2039] dark:hover:border-[#f3e5ab] text-stone-700 dark:text-gray-200 hover:text-[#7a2039] dark:hover:text-[#f3e5ab] px-3 py-1.5 rounded-full shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* INPUT BAR - OPTIMIZED FOR PHONES WITH SAFE AREA */}
            <form onSubmit={handleChatSubmit} className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 transition-colors">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isTyping}
                  placeholder="Ask about methodology, findings, summary..."
                  className="flex-1 min-w-0 border border-stone-300 dark:border-gray-600 bg-stone-50 dark:bg-gray-700/60 text-stone-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs outline-none focus:border-[#7a2039] focus:bg-white dark:focus:bg-gray-700 disabled:opacity-50 transition-all placeholder:text-stone-400 dark:placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-[#7a2039] text-white w-10 h-10 sm:w-9 sm:h-9 rounded-xl hover:bg-[#5a1528] active:scale-95 transition cursor-pointer text-base flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  aria-label="Send message"
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