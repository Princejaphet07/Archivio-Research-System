import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
  Pen, 
  Highlighter, 
  Eraser, 
  Type, 
  Trash2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Undo2, 
  Redo2,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { saveDraft, getDraft, clearDraft, formatDraftTime } from '../utils/draftStorage';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ── Helper to retrieve annotations for a given page number ──────────────────
const getPageAnnotations = (annotationsMap, pageNum) => {
  if (!annotationsMap) return [];
  return annotationsMap[pageNum] || 
         annotationsMap[String(pageNum)] || 
         annotationsMap[`page_${pageNum}`] || 
         annotationsMap[`page-${pageNum}`] || 
         [];
};

// ── Normalize incoming annotations (unwraps JSON strings and requirement-keyed maps) ─
const normalizeAnnotations = (raw) => {
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return {};

  const keys = Object.keys(parsed);
  // Check if directly keyed by page numbers: e.g. { '1': [...], '2': [...] }
  const hasPageKeys = keys.some(k => !isNaN(parseInt(k, 10)) && Array.isArray(parsed[k]));
  if (hasPageKeys) {
    return parsed;
  }

  // Check if nested under requirement key: e.g. { 'Final Manuscript': { '1': [...] } }
  for (const key of keys) {
    const val = parsed[key];
    if (val && typeof val === 'object') {
      const subKeys = Object.keys(val);
      if (subKeys.some(sk => !isNaN(parseInt(sk, 10)) && Array.isArray(val[sk]))) {
        return val;
      }
    }
  }

  return parsed;
};

// ── Sub-component for rendering a page with annotations in read-only mode ─────
const ReadOnlyPageWithAnnotations = ({
  pg,
  width,
  pageAnnotations = [],
  setPageRef,
  tools
}) => {
  const canvasRef = useRef(null);
  const [pageSize, setPageSize] = useState({ width: 595.28, height: 841.89 });

  const drawAnnotations = useCallback((baseWidth, baseHeight) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(baseWidth * dpr);
    canvas.height = Math.round(baseHeight * dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    pageAnnotations.forEach(path => {
      if (!path.points || path.points.length === 0 || path.type === 'text') return;

      const tool = tools[path.type] || tools.pen;
      const bW = path.baseWidth || pageSize.width || 595.28;
      const bH = path.baseHeight || pageSize.height || 841.89;

      const getPtX = (pt) => (pt.nx != null ? pt.nx * baseWidth : (pt.x / bW) * baseWidth);
      const getPtY = (pt) => (pt.ny != null ? pt.ny * baseHeight : (pt.y / bH) * baseHeight);

      ctx.beginPath();
      ctx.moveTo(getPtX(path.points[0]), getPtY(path.points[0]));
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(getPtX(path.points[i]), getPtY(path.points[i]));
      }

      ctx.strokeStyle = path.type === 'eraser' ? 'rgba(255,255,255,1)' : (path.color || tool.color);
      ctx.lineWidth = path.size || tool.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.type === 'highlighter') {
        ctx.globalAlpha = tool.opacity ?? 0.6;
        ctx.globalCompositeOperation = 'multiply';
      } else if (path.type === 'eraser') {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.stroke();
    });

    ctx.restore();
  }, [pageAnnotations, tools, pageSize]);

  const handlePageRenderSuccess = useCallback((pageData) => {
    const viewport = pageData.getViewport({ scale: 1.0 });
    setPageSize({ width: viewport.width, height: viewport.height });
    drawAnnotations(viewport.width, viewport.height);
  }, [drawAnnotations]);

  useEffect(() => {
    drawAnnotations(pageSize.width, pageSize.height);
  }, [drawAnnotations, pageSize]);

  return (
    <div
      ref={el => setPageRef(pg, el)}
      data-page={pg}
      className="relative shadow-md sm:shadow-xl bg-white max-w-full overflow-hidden transition-all rounded-sm mx-auto"
      style={{ width: 'fit-content' }}
    >
      <Page
        pageNumber={pg}
        renderTextLayer={true}
        renderAnnotationLayer={false}
        width={width}
        onRenderSuccess={handlePageRenderSuccess}
      />

      {/* Drawing / Highlighter Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Floating Text Annotations Overlay */}
      {pageAnnotations.map((path, idx) => {
        if (path.type !== 'text' || !path.points?.[0]) return null;

        const pt = path.points[0];
        const leftPercent = pt.nx != null
          ? Math.max(0, Math.min(95, pt.nx * 100))
          : Math.max(0, Math.min(95, (pt.x / (pageSize.width || 595.28)) * 100));
        const topPercent = pt.ny != null
          ? Math.max(0, Math.min(95, (pt.ny * 100) - 1.5))
          : Math.max(0, Math.min(95, ((pt.y - 12) / (pageSize.height || 841.89)) * 100));

        return (
          <div
            key={idx}
            className="absolute z-20 pointer-events-auto select-text"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
            }}
          >
            <div className="relative bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-2 border-[#7a2e46] dark:border-[#f8d070] px-2.5 py-1 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <span className="font-sans font-bold text-[#7a2e46] dark:text-[#f8d070] text-[14px] sm:text-[15px] whitespace-pre-wrap leading-tight">
                {path.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AnnotatablePDFViewer = ({ 
  documentUrl, 
  initialAnnotations = {}, 
  onSaveAnnotations, 
  readOnly = false,
  onPageChange,
  jumpPage
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Notify parent component of current page accurately
  useEffect(() => {
    if (onPageChange && pageNumber) {
      onPageChange(pageNumber, numPages || 1);
    }
  }, [pageNumber, numPages, onPageChange]);

  // Jump to specific page requested externally (e.g. clicking directive chip)
  useEffect(() => {
    if (jumpPage && jumpPage >= 1 && (!numPages || jumpPage <= numPages)) {
      if (readOnly) {
        const el = pageRefsMap.current[jumpPage];
        if (el && scrollContainerRef.current) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setPageNumber(jumpPage);
        }
      } else {
        setPageNumber(jumpPage);
      }
    }
  }, [jumpPage, numPages, readOnly]);

  // annotations = { [pageNumber]: [ { type, points, color, size } ] }
  const [annotations, setAnnotations] = useState(() => normalizeAnnotations(initialAnnotations));
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [currentTool, setCurrentTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [draftInfo, setDraftInfo] = useState(null);

  // Check for unsaved local draft on mount
  useEffect(() => {
    if (readOnly || !documentUrl) return;
    const cached = getDraft(documentUrl, 'pdf_annotations');
    if (cached && cached.data && Object.keys(cached.data).length > 0) {
      const initialEmpty = !initialAnnotations || Object.keys(initialAnnotations).length === 0;
      if (initialEmpty || cached.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) {
        setDraftInfo(cached);
      }
    }
  }, [documentUrl, readOnly, initialAnnotations]);

  const restoreDraft = useCallback(() => {
    if (draftInfo?.data) {
      setAnnotations(normalizeAnnotations(draftInfo.data));
      setHasChanges(true);
      setDraftInfo(null);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Restored Unsaved Draft',
        showConfirmButton: false,
        timer: 2000
      });
    }
  }, [draftInfo]);

  const discardDraft = useCallback(() => {
    clearDraft(documentUrl, 'pdf_annotations');
    setDraftInfo(null);
  }, [documentUrl]);

  // Defensive beforeunload guard against tab close during review
  useEffect(() => {
    if (readOnly || !hasChanges) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved manuscript annotations. Your draft is buffered locally.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, readOnly]);

  // Helper to update annotations and track undo history + local draft buffering
  const applyAnnotationsChange = useCallback((updaterOrNewValue) => {
    setAnnotations(current => {
      const next = typeof updaterOrNewValue === 'function' ? updaterOrNewValue(current) : updaterOrNewValue;
      setUndoStack(prev => [...prev.slice(-49), current]);
      setRedoStack([]);
      setHasChanges(true);
      if (documentUrl) {
        saveDraft(documentUrl, 'pdf_annotations', next);
      }
      return next;
    });
  }, [documentUrl]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack(prev => [...prev, annotations]);
    setUndoStack(newUndoStack);
    setAnnotations(previousState);
    setHasChanges(true);
  }, [undoStack, annotations]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack(prev => [...prev, annotations]);
    setRedoStack(newRedoStack);
    setAnnotations(nextState);
    setHasChanges(true);
  }, [redoStack, annotations]);

  // Keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, handleUndo, handleRedo]);

  // Scroll-mode state
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef(null);
  const pageRefsMap = useRef({});       // { pageNum: domElement }
  const scrollTimeoutRef = useRef(null);
  const observerRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Responsive page width to fit mobile screens perfectly
  const [containerWidth, setContainerWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const padding = window.innerWidth < 640 ? 16 : 48;
      return Math.min(850, Math.max(280, window.innerWidth - padding));
    }
    return 800;
  });

  const measureWidth = useCallback(() => {
    const container = readOnly ? scrollContainerRef.current : containerRef.current;
    if (container) {
      const clientW = container.clientWidth;
      if (clientW > 0) {
        // Leave 16px padding on mobile so manuscript text occupies full readable width
        const padding = window.innerWidth < 640 ? 16 : 48;
        const available = clientW - padding;
        setContainerWidth(Math.min(850, Math.max(260, available)));
        return;
      }
    }
    const padding = window.innerWidth < 640 ? 16 : 64;
    setContainerWidth(Math.min(850, Math.max(260, window.innerWidth - padding)));
  }, [readOnly]);

  useEffect(() => {
    measureWidth();
    window.addEventListener('resize', measureWidth);

    let ro = null;
    const target = readOnly ? scrollContainerRef.current : containerRef.current;
    if (target && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measureWidth();
      });
      ro.observe(target);
    }

    return () => {
      window.removeEventListener('resize', measureWidth);
      if (ro) ro.disconnect();
    };
  }, [measureWidth, readOnly]);

  // Settings for tools
  const tools = {
    pen: { color: '#ef4444', size: 2, globalCompositeOperation: 'source-over', opacity: 1 },
    highlighter: { color: '#fcd34d', size: 15, globalCompositeOperation: 'multiply', opacity: 0.6 },
    eraser: { color: '#ffffff', size: 20, globalCompositeOperation: 'destination-out', opacity: 1 }
  };

  useEffect(() => {
    if (initialAnnotations) {
      setAnnotations(normalizeAnnotations(initialAnnotations));
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [initialAnnotations]);

  // Render all paths for the current page
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pageAnnotations = getPageAnnotations(annotations, pageNumber);
    const allPaths = currentPath ? [...pageAnnotations, currentPath] : pageAnnotations;

    allPaths.forEach(path => {
      if (!path.points || path.points.length === 0 || path.type === 'text') return;
      
      const tool = tools[path.type] || tools.pen;
      const bW = path.baseWidth || canvas.width || 595.28;
      const bH = path.baseHeight || canvas.height || 841.89;

      const getPtX = (pt) => (pt.nx != null ? pt.nx * canvas.width : (pt.x > 1 && path.baseWidth ? (pt.x / bW) * canvas.width : pt.x));
      const getPtY = (pt) => (pt.ny != null ? pt.ny * canvas.height : (pt.y > 1 && path.baseHeight ? (pt.y / bH) * canvas.height : pt.y));

      ctx.beginPath();
      ctx.moveTo(getPtX(path.points[0]), getPtY(path.points[0]));
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(getPtX(path.points[i]), getPtY(path.points[i]));
      }
      
      ctx.strokeStyle = path.type === 'eraser' ? 'rgba(0,0,0,1)' : tool.color;
      ctx.lineWidth = tool.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (path.type === 'highlighter') {
        ctx.globalAlpha = tool.opacity;
        ctx.globalCompositeOperation = 'multiply';
      } else if (path.type === 'eraser') {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.stroke();
    });
    
    // Reset defaults
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [annotations, pageNumber, currentPath, tools]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // ── Scroll-mode helpers ──────────────────────────────────────────────────────

  // Track which page is most visible via IntersectionObserver
  useEffect(() => {
    if (!readOnly || !numPages) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let best = null;
        let bestRatio = 0;
        entries.forEach(entry => {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = entry.target;
          }
        });
        if (best) {
          const pg = parseInt(best.dataset.page, 10);
          if (!isNaN(pg)) setPageNumber(pg);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: Array.from({ length: 21 }, (_, i) => i * 0.05),
      }
    );

    Object.values(pageRefsMap.current).forEach(el => {
      if (el) observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [numPages, readOnly]);

  // Detect scroll — make nav ghost while scrolling, solid again after idle
  const handleScrollActivity = useCallback(() => {
    setIsScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 1200);
  }, []);

  // Scroll to a specific page
  const scrollToPage = useCallback((pg) => {
    const el = pageRefsMap.current[pg];
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPageNumber(pg);
    }
  }, []);

  const goToPrev = useCallback(() => {
    const target = Math.max(1, pageNumber - 1);
    if (readOnly) scrollToPage(target);
    else setPageNumber(target);
  }, [pageNumber, readOnly, scrollToPage]);

  const goToNext = useCallback(() => {
    const target = Math.min(numPages || pageNumber, pageNumber + 1);
    if (readOnly) scrollToPage(target);
    else setPageNumber(target);
  }, [pageNumber, numPages, readOnly, scrollToPage]);

  // Register page element for observer + scroll lookup
  const setPageRef = useCallback((pg, el) => {
    if (!el) return;
    pageRefsMap.current[pg] = el;
    if (observerRef.current) observerRef.current.observe(el);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    return {
      x: rawX,
      y: rawY,
      nx: canvas.width > 0 ? rawX / canvas.width : 0,
      ny: canvas.height > 0 ? rawY / canvas.height : 0
    };
  };

  const startDrawing = (e) => {
    if (readOnly) return;
    if (e.target.tagName === 'INPUT') return; // Don't interrupt text input
    if (e.cancelable) e.preventDefault(); // prevent scrolling on touch
    const coords = getCoordinates(e);
    if (!coords) return;

    if (currentTool === 'text') {
      setTextInput({ x: coords.x, y: coords.y, nx: coords.nx, ny: coords.ny, value: '' });
      return;
    }

    setIsDrawing(true);
    setCurrentPath({
      type: currentTool,
      points: [coords],
      baseWidth: canvasRef.current?.width || 595.28,
      baseHeight: canvasRef.current?.height || 841.89
    });
  };

  const draw = (e) => {
    if (!isDrawing || readOnly) return;
    if (e.cancelable) e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentPath(prev => ({
      ...prev,
      points: [...prev.points, coords]
    }));
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    
    if (currentPath && currentPath.points.length > 0) {
      const canvas = canvasRef.current;
      const pathWithBase = {
        ...currentPath,
        baseWidth: canvas?.width || 595.28,
        baseHeight: canvas?.height || 841.89
      };
      applyAnnotationsChange(prev => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), pathWithBase]
      }));
    }
    setCurrentPath(null);
  };

  const clearPage = () => {
    Swal.fire({
      title: 'Clear Page Annotations?',
      text: "This will remove all drawings and text notes on this page.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7a2e46',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear page'
    }).then((result) => {
      if (result.isConfirmed) {
        applyAnnotationsChange(prev => ({
          ...prev,
          [pageNumber]: []
        }));
      }
    });
  };

  const deleteTextAnnotation = (indexToRemove) => {
    if (readOnly) return;
    applyAnnotationsChange(prev => {
      const currentPageAnnotations = prev[pageNumber] || [];
      const newAnnotations = currentPageAnnotations.filter((_, i) => i !== indexToRemove);
      return {
        ...prev,
        [pageNumber]: newAnnotations
      };
    });
  };

  const handleSave = () => {
    if (onSaveAnnotations) {
      onSaveAnnotations(annotations);
      clearDraft(documentUrl, 'pdf_annotations');
      setHasChanges(false);
      setDraftInfo(null);
    }
  };

  // Resize canvas when PDF page renders
  const onPageRenderSuccess = (pageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // We render at standard 1x scale internally to keep coordinates simple
    // The CSS transform scales it visually.
    const viewport = pageData.getViewport({ scale: 1.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Ensure CSS size matches
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    
    renderCanvas();
  };

  return (
    <div className="flex flex-col h-full bg-stone-200 dark:bg-stone-950 overflow-hidden relative select-none">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shrink-0 shadow-sm z-10 gap-2">

        {/* Pagination & Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">

          {/* Page indicator + inline Prev/Next */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={goToPrev}
              disabled={pageNumber <= 1}
              className="p-1 sm:p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 text-stone-700 dark:text-stone-300 transition-all touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="px-2 sm:px-3 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 font-mono select-none whitespace-nowrap">
              {pageNumber} / {numPages || '-'}
            </span>
            <button
              onClick={goToNext}
              disabled={pageNumber >= (numPages || 1)}
              className="p-1 sm:p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 text-stone-700 dark:text-stone-300 transition-all touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="h-5 sm:h-6 w-px bg-stone-300 dark:bg-stone-700"></div>

          {/* Zoom controls: accessible on mobile */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={() => setScale(s => Math.max(0.6, parseFloat((s - 0.15).toFixed(2))))}
              className="p-1 sm:p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold text-stone-700 dark:text-stone-300 min-w-[36px] sm:w-12 text-center hover:bg-white dark:hover:bg-stone-700 rounded py-0.5 transition-colors"
              title="Reset to Fit Width (100%)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => setScale(s => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))))}
              className="p-1 sm:p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Drawing Tools (non-readOnly only) */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Live Tri-State Sync Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 select-none">
              {hasChanges ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-800 dark:text-amber-300 font-medium">Draft Buffered Locally</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Cloud Synced</span>
                </>
              )}
            </div>

            {/* Segmented Markup Tools */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-1 border border-stone-200 dark:border-stone-700">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${
                  currentTool === 'pen'
                    ? 'bg-[#7a2e46] text-white shadow-sm ring-1 ring-[#7a2e46]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700'
                }`}
                title="Pen Markup (Red Ink)"
                aria-label="Pen markup tool"
              >
                <Pen className="w-4 h-4" />
                <span className="hidden xl:inline">Pen</span>
              </button>
              <button
                onClick={() => setCurrentTool('highlighter')}
                className={`p-2 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${
                  currentTool === 'highlighter'
                    ? 'bg-amber-500 text-stone-950 shadow-sm ring-1 ring-amber-500'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700'
                }`}
                title="Highlighter (Yellow Emphasis)"
                aria-label="Highlighter markup tool"
              >
                <Highlighter className="w-4 h-4" />
                <span className="hidden xl:inline">Highlight</span>
              </button>
              <button
                onClick={() => setCurrentTool('text')}
                className={`p-2 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${
                  currentTool === 'text'
                    ? 'bg-[#7a2e46] text-white shadow-sm ring-1 ring-[#7a2e46]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700'
                }`}
                title="Text Note Tool"
                aria-label="Text note tool"
              >
                <Type className="w-4 h-4" />
                <span className="hidden xl:inline">Note</span>
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${
                  currentTool === 'eraser'
                    ? 'bg-stone-800 text-white shadow-sm ring-1 ring-stone-800'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700'
                }`}
                title="Eraser Tool"
                aria-label="Eraser tool"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden xl:inline">Eraser</span>
              </button>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-1 border border-stone-200 dark:border-stone-700">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-2 rounded transition-colors text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 rounded transition-colors text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={clearPage}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
              title="Clear current page annotations"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`ml-1 sm:ml-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                hasChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Annotations</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Unsaved Draft Restoration Banner ─────────────────────────────────── */}
      {draftInfo && !readOnly && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-700/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 z-20 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Unsaved review draft detected from <strong>{formatDraftTime(draftInfo.timestamp)}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restoreDraft}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Draft
            </button>
            <button
              onClick={discardDraft}
              className="px-2 py-1 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── PDF Viewport ─────────────────────────────────────────────────────── */}
      {documentUrl ? (
        readOnly ? (
          /* ══ SCROLL MODE (read-only): all pages stacked ══ */
          <div
            ref={scrollContainerRef}
            onScroll={handleScrollActivity}
            className="flex-1 overflow-y-auto overflow-x-auto bg-stone-200 dark:bg-stone-950 flex flex-col items-center py-3 sm:py-6 px-1 sm:px-4 gap-3 sm:gap-4"
          >
            <Document
              file={documentUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-12 text-stone-500 font-medium">Loading document...</div>}
              error={<div className="p-12 text-red-500 font-medium bg-red-50 rounded-lg">Failed to load PDF. Please try again.</div>}
            >
              {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                <ReadOnlyPageWithAnnotations
                  key={pg}
                  pg={pg}
                  width={Math.round(containerWidth * scale)}
                  pageAnnotations={getPageAnnotations(annotations, pg)}
                  setPageRef={setPageRef}
                  tools={tools}
                />
              ))}
            </Document>

            {/* Spacer so last page isn't flush to bottom */}
            <div className="h-16 sm:h-24 shrink-0" />
          </div>
        ) : (
          /* ══ SINGLE-PAGE MODE (annotation): one page at a time ══ */
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-stone-200 dark:bg-stone-950 flex justify-center p-4 md:p-8"
            style={{ cursor: 'crosshair' }}
          >
            <div className="relative shadow-2xl transition-transform origin-top" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
              <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="p-12 text-stone-500 font-medium">Loading document...</div>}
                error={<div className="p-12 text-red-500 font-medium bg-red-50 rounded-lg">Failed to load PDF. Please try again.</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={onPageRenderSuccess}
                  className="pointer-events-none bg-white"
                  width={Math.min(800, containerWidth)}
                />
              </Document>

              {/* Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 touch-none"
                style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
              />

              {/* Text Input Overlay */}
              {textInput && (
                <input
                  autoFocus
                  type="text"
                  value={textInput.value}
                  onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                  onBlur={() => {
                    if (textInput.value.trim()) {
                      const canvas = canvasRef.current;
                      applyAnnotationsChange(prev => ({
                        ...prev,
                        [pageNumber]: [...(prev[pageNumber] || []), {
                          type: 'text',
                          text: textInput.value,
                          points: [{ 
                            x: textInput.x, 
                            y: textInput.y,
                            nx: textInput.nx ?? (canvas?.width ? textInput.x / canvas.width : 0),
                            ny: textInput.ny ?? (canvas?.height ? textInput.y / canvas.height : 0)
                          }],
                          baseWidth: canvas?.width || 595.28,
                          baseHeight: canvas?.height || 841.89
                        }]
                      }));
                    }
                    setTextInput(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  placeholder="Type note..."
                  className="absolute z-20 bg-white/95 border-2 border-[#7a2e46] dark:border-[#f8d070] outline-none text-[#7a2e46] dark:text-stone-900 px-2 py-1 rounded shadow-lg font-sans font-bold"
                  style={{ left: `${textInput.x}px`, top: `${textInput.y - 12}px`, fontSize: '15px', minWidth: '200px' }}
                />
              )}

              {/* Rendered Text Annotations */}
              {getPageAnnotations(annotations, pageNumber).map((path, idx) => {
                if (path.type !== 'text' || !path.points?.[0]) return null;
                const canvas = canvasRef.current;
                const pt = path.points[0];
                const bW = path.baseWidth || canvas?.width || 595.28;
                const bH = path.baseHeight || canvas?.height || 841.89;
                const leftPos = pt.nx != null ? pt.nx * (canvas?.width || bW) : (pt.x > 1 ? (pt.x / bW) * (canvas?.width || bW) : pt.x);
                const topPos = pt.ny != null ? (pt.ny * (canvas?.height || bH)) - 12 : ((pt.y > 1 ? (pt.y / bH) * (canvas?.height || bH) : pt.y) - 12);

                return (
                  <div
                    key={idx}
                    className="absolute z-10 group"
                    style={{ left: `${leftPos}px`, top: `${topPos}px` }}
                  >
                    <div className="relative bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm border border-[#7a2e46]/40 dark:border-[#f8d070]/40 px-2.5 py-1 rounded-md shadow-sm">
                      <span className="font-sans font-bold text-[#7a2e46] dark:text-[#f8d070] text-[14px] sm:text-[15px] whitespace-pre-wrap leading-tight">{path.text}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTextAnnotation(idx); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 cursor-pointer"
                        title="Delete text note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-full text-stone-500">
          No document provided
        </div>
      )}

      {/* ── Floating Prev / Next bar (scroll mode only, hidden on mobile so it doesn't block text) ── */}
      {readOnly && numPages && (
        <div
          className={`hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-30 items-center gap-1 bg-stone-900/85 dark:bg-stone-950/90 backdrop-blur-md rounded-full px-3 py-1.5 shadow-2xl ring-1 ring-white/10 transition-all duration-500 group/bar ${
            isScrolling
              ? 'opacity-0 pointer-events-none translate-y-2'
              : 'opacity-100 pointer-events-auto translate-y-0'
          }`}
        >
          <button
            onClick={goToPrev}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-full hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>

          <span className="text-white/60 text-xs font-mono px-3 border-x border-white/20">
            Page {pageNumber} of {numPages}
          </span>

          <button
            onClick={goToNext}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-full hover:bg-white/10 transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotatablePDFViewer;
