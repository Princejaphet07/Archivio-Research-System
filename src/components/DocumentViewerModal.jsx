import React, { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Download, FileText, AlertTriangle, RefreshCw, CheckCircle2, Clock, RotateCcw, Tag } from 'lucide-react';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase/config';
import AnnotatablePDFViewer from './AnnotatablePDFViewer';
import Swal from 'sweetalert2';
import { saveDraft, getDraft, clearDraft, formatDraftTime } from '../utils/draftStorage';

// Helper to parse revision notes into structured directives and page notes
const parseRevisionNote = (rawNote) => {
  if (!rawNote || typeof rawNote !== 'string') {
    return { pageNotes: [], generalLines: [], generalNote: '', allDirectives: [] };
  }

  const lines = rawNote.split('\n');
  const pageNotes = [];
  const generalLines = [];
  const allDirectives = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Pattern 1: [Page 2 - Part: General Objective]: comment or [Page 2 | General Objective]: comment or [Page 2 - General Objective]
    const p1 = trimmed.match(/^\[Page\s*(\d+)\s*(?:-|\||\/)\s*(?:Part:\s*)?([^\]]+)\]\s*(?::|-)?\s*(.*)$/i);
    if (p1) {
      const item = {
        id: `p1-${i}`,
        page: p1[1].trim(),
        part: p1[2].trim(),
        comment: p1[3]?.trim() || '',
        raw: trimmed,
        isPageNote: true
      };
      pageNotes.push(item);
      allDirectives.push(item);
      continue;
    }

    // Pattern 2: [Page 2]: General Objective or [Page 2]: General Objective - comment or [Page 2]
    const p2 = trimmed.match(/^\[Page\s*(\d+)\]\s*(?::|-)?\s*(.*)$/i);
    if (p2) {
      const page = p2[1].trim();
      const rest = p2[2]?.trim() || '';
      let item;
      if (!rest) {
        item = {
          id: `p2-${i}`,
          page,
          part: 'Entire Page',
          comment: '',
          raw: trimmed,
          isPageNote: true
        };
      } else {
        const subParts = rest.split(/\s*(?::|-)\s*/);
        if (subParts.length >= 2) {
          item = {
            id: `p2-${i}`,
            page,
            part: subParts[0].replace(/^Part:\s*/i, '').trim(),
            comment: subParts.slice(1).join(' - ').trim(),
            raw: trimmed,
            isPageNote: true
          };
        } else {
          item = {
            id: `p2-${i}`,
            page,
            part: '',
            comment: rest.replace(/^Part:\s*/i, '').trim(),
            raw: trimmed,
            isPageNote: true
          };
        }
      }
      pageNotes.push(item);
      allDirectives.push(item);
      continue;
    }

    // Pattern 3: Page 2: General Objective or Page 2 - Part: General Objective or Pg 2: General Objective
    const p3 = trimmed.match(/^(?:Page|Pg\.?)\s*(\d+)\s*(?::|-|\()\s*(?:Part:\s*)?([^:)\n]+)(?:\))?\s*(?::|-)?\s*(.*)$/i);
    if (p3) {
      const item = {
        id: `p3-${i}`,
        page: p3[1].trim(),
        part: p3[2].trim(),
        comment: p3[3]?.trim() || '',
        raw: trimmed,
        isPageNote: true
      };
      pageNotes.push(item);
      allDirectives.push(item);
      continue;
    }

    // Pattern 4: Page 2 alone: e.g. "Page 2"
    const p4 = trimmed.match(/^(?:Page|Pg\.?)\s*(\d+)\s*$/i);
    if (p4) {
      const item = {
        id: `p4-${i}`,
        page: p4[1].trim(),
        part: 'Entire Page',
        comment: '',
        raw: trimmed,
        isPageNote: true
      };
      pageNotes.push(item);
      allDirectives.push(item);
      continue;
    }

    // Pattern 5: Non-document feedback or general directive: [Feedback: ...] or [Directive: ...] or [Part: ...]
    const p5 = trimmed.match(/^\[(?:Feedback|Directive|Section|Part):\s*([^\]]+)\]\s*(?::|-)?\s*(.*)$/i);
    if (p5) {
      const item = {
        id: `p5-${i}`,
        page: '',
        part: p5[1].trim(),
        comment: p5[2]?.trim() || '',
        raw: trimmed,
        isPageNote: false
      };
      pageNotes.push(item);
      allDirectives.push(item);
      continue;
    }

    // Pattern 5.5: Numbered line e.g. "1. elaborate more this page" or "2. in research objectives..."
    const pNum = trimmed.match(/^(\d+)(?:\.|\))\s+(.*)$/);
    if (pNum) {
      const seq = pNum[1].trim();
      const commentText = pNum[2]?.trim() || trimmed;
      const item = {
        id: `pnum-${i}`,
        seq,
        page: '',
        part: '',
        comment: commentText,
        raw: trimmed,
        isPageNote: false
      };
      allDirectives.push(item);
      continue;
    }

    // Pattern 6: General line (e.g. general remarks without explicit page)
    generalLines.push(trimmed);
    allDirectives.push({
      id: `gen-${i}`,
      page: '',
      part: '',
      comment: trimmed,
      raw: trimmed,
      isPageNote: false
    });
  }

  return {
    pageNotes,
    generalLines,
    generalNote: generalLines.join('\n'),
    allDirectives
  };
};

const DocumentViewerModal = ({ 
  isOpen, 
  onClose, 
  documentUrl, 
  documentTitle, 
  role, 
  initialNote, 
  onSaveNote, 
  initialAnnotations = {}, 
  onSaveAnnotations,
  isResubmitted = false,
  previousNote = '',
  previousAnnotations = {},
  studentReply = ''
}) => {
  const [iframeError, setIframeError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [note, setNote] = useState(initialNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [quickPage, setQuickPage] = useState('1');
  const [quickComment, setQuickComment] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [showPreviousOverlay, setShowPreviousOverlay] = useState(false);
  const [noteDraftInfo, setNoteDraftInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage] = useState(null);

  // Determine file type
  const lowerUrl = (resolvedUrl || documentUrl || '').toLowerCase();
  const lowerTitle = (documentTitle || '').toLowerCase();
  const isVideo = lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('.mkv') || lowerTitle.includes('video');
  const isPdf = lowerUrl.includes('.pdf');
  const isDocx = lowerUrl.includes('.docx') || lowerUrl.includes('.doc');
  const isDocument = (isPdf || isDocx || lowerUrl.includes('.pptx') || lowerUrl.includes('.ppt') || lowerUrl.includes('.xlsx') || lowerUrl.includes('.xls') || lowerUrl.includes('.txt') || lowerTitle.includes('manuscript') || lowerTitle.includes('document')) && !isVideo && !lowerUrl.includes('youtube') && !lowerUrl.includes('vimeo') && !lowerUrl.includes('github') && !lowerUrl.includes('figma');

  const handleViewerPageChange = useCallback((pageNum, total) => {
    if (pageNum) {
      setCurrentPage(pageNum);
      if (total) setTotalPages(total);
      if (isDocument) {
        setQuickPage(String(pageNum));
      }
    }
  }, [isDocument]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setJumpPage(null);
      if (isDocument) {
        setQuickPage('1');
      } else {
        setQuickPage('');
      }
    }
  }, [isOpen, documentUrl, isDocument]);

  // Sync initial note and check for unsaved local draft
  useEffect(() => {
    setNote(initialNote || '');
    setShowPreviousOverlay(false);
    if (role === 'adviser' && documentUrl && isOpen) {
      const cached = getDraft(documentUrl, 'review_note');
      if (cached && cached.data && typeof cached.data === 'string' && cached.data.trim()) {
        if (!initialNote || cached.data.trim() !== initialNote.trim()) {
          setNoteDraftInfo(cached);
        }
      }
    }
  }, [documentUrl, isOpen, role, initialNote]);

  const handleRestoreNoteDraft = () => {
    if (noteDraftInfo?.data) {
      setNote(noteDraftInfo.data);
      setNoteDraftInfo(null);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Restored Note Draft',
        showConfirmButton: false,
        timer: 1500
      });
    }
  };

  const handleDiscardNoteDraft = () => {
    clearDraft(documentUrl, 'review_note');
    setNoteDraftInfo(null);
  };

  const handleNoteChange = (newVal) => {
    setNote(newVal);
    if (role === 'adviser' && documentUrl) {
      saveDraft(documentUrl, 'review_note', newVal);
    }
  };

  const hasUnsavedNote = Boolean(
    role === 'adviser' && 
    note.trim() && 
    note.trim() !== (initialNote || '').trim()
  );

  const handleSafeClose = useCallback(() => {
    if (hasUnsavedNote) {
      Swal.fire({
        title: 'Unsaved Revision Notes',
        text: 'You have drafted revision notes that haven\'t been committed. Your draft is buffered in local storage.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7a2e46',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Exit Anyway',
        cancelButtonText: 'Keep Editing'
      }).then((res) => {
        if (res.isConfirmed) {
          onClose();
        }
      });
      return;
    }
    onClose();
  }, [hasUnsavedNote, onClose]);

  // Keyboard navigation: Escape key defensively triggers safe close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSafeClose]);

  // Extract floating text notes from initialAnnotations (active annotations on document)
  const extractedCurrentNotes = React.useMemo(() => {
    if (!initialAnnotations || typeof initialAnnotations !== 'object') return [];
    const notes = [];
    Object.keys(initialAnnotations).forEach(page => {
      const items = initialAnnotations[page];
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.type === 'text' && item.text && item.text.trim()) {
            notes.push({ page, text: item.text.trim() });
          }
        });
      }
    });
    return notes;
  }, [initialAnnotations]);

  // Extract floating text notes from previousAnnotations
  const extractedPreviousNotes = React.useMemo(() => {
    if (!previousAnnotations || typeof previousAnnotations !== 'object') return [];
    const notes = [];
    Object.keys(previousAnnotations).forEach(page => {
      const items = previousAnnotations[page];
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.type === 'text' && item.text && item.text.trim()) {
            notes.push({ page, text: item.text.trim() });
          }
        });
      }
    });
    return notes;
  }, [previousAnnotations]);

  // Count highlights or pen marks in previousAnnotations
  const previousHighlightsCount = React.useMemo(() => {
    if (!previousAnnotations || typeof previousAnnotations !== 'object') return 0;
    let count = 0;
    Object.keys(previousAnnotations).forEach(page => {
      const items = previousAnnotations[page];
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.type === 'highlighter' || item.type === 'pen') {
            count++;
          }
        });
      }
    });
    return count;
  }, [previousAnnotations]);

  // Active note string
  const activeNoteText = isResubmitted ? (note || previousNote) : (note || previousNote);

  // Parsed quick page notes, general notes, and all directives
  const { pageNotes, generalLines, generalNote, allDirectives } = React.useMemo(() => {
    return parseRevisionNote(activeNoteText);
  }, [activeNoteText]);

  // Directives for student view
  const displayPageNotes = pageNotes || [];
  const studentAllDirectives = allDirectives || [];

  // For adviser view: parse current note to display all added directives
  const adviserAllDirectives = React.useMemo(() => {
    return parseRevisionNote(note).allDirectives || [];
  }, [note]);

  // Scroll to specific page in PDF viewer
  const scrollToPage = (pageNum) => {
    if (!pageNum) return;
    const num = parseInt(pageNum, 10);
    if (isNaN(num) || num < 1) return;
    setJumpPage({ page: num, ts: Date.now() });
    const pageEl = document.querySelector(`[data-page="${num}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pageEl.classList.add('ring-4', 'ring-[#7a2e46]', 'dark:ring-[#f8d070]', 'ring-offset-2');
      setTimeout(() => {
        pageEl.classList.remove('ring-4', 'ring-[#7a2e46]', 'dark:ring-[#f8d070]', 'ring-offset-2');
      }, 2000);
    }
  };

  // Add quick page note to adviser's note text
  const handleAddQuickNote = () => {
    const c = quickComment.trim();
    if (!c) return;

    let tag = '';
    if (isDocument) {
      const p = quickPage.trim() || String(currentPage || 1);
      tag = `[Page ${p}]: ${c}`;
    } else {
      tag = `[Directive]: ${c}`;
    }

    const updated = (note && note.trim()) ? `${note.trim()}\n${tag}` : tag;
    setNote(updated);
    if (role === 'adviser' && documentUrl) {
      saveDraft(documentUrl, 'review_note', updated);
    }
    setQuickComment('');
    if (isDocument) setQuickPage(String(currentPage || 1));
  };

  // Remove a specific directive item from adviser's note text
  const handleRemoveDirective = async (targetItem) => {
    if (!note) return;
    const lines = note.split('\n');
    let removed = false;
    const remaining = lines.filter(l => {
      if (removed) return true;
      const trimmed = l.trim();
      if (!trimmed) return false;
      if (targetItem.raw && trimmed === targetItem.raw) {
        removed = true;
        return false;
      }
      if (targetItem.comment && (trimmed === targetItem.comment || trimmed.includes(targetItem.comment))) {
        removed = true;
        return false;
      }
      return true;
    });
    const updated = remaining.join('\n');
    setNote(updated);
    if (role === 'adviser' && documentUrl) {
      saveDraft(documentUrl, 'review_note', updated);
    }
    if (onSaveNote) {
      await onSaveNote(updated, updated.trim() ? 'replace' : 'clear', { replace: true });
    }
  };

  // Save revision directives and notify
  const handleRequestRevision = async () => {
    let noteToSave = (note && note.trim()) ? note.trim() : '';

    // If adviser has an un-added comment in the input box, bundle it in!
    if (quickComment.trim()) {
      const c = quickComment.trim();
      let tag = '';
      if (isDocument) {
        const p = quickPage.trim() || String(currentPage || 1);
        tag = `[Page ${p}]: ${c}`;
      } else {
        tag = `[Directive]: ${c}`;
      }

      if (!noteToSave.includes(tag)) {
        noteToSave = noteToSave ? `${noteToSave}\n${tag}` : tag;
      }
      setQuickComment('');
      if (isDocument) setQuickPage(String(currentPage || 1));
    }

    // Auto-tag any directive lines with the active page where adviser commented it
    if (isDocument && noteToSave) {
      const activePg = quickPage?.trim() || String(currentPage || 1);
      const lines = noteToSave.split('\n').map(l => l.trim()).filter(Boolean);
      const taggedLines = lines.map(line => {
        if (/^\[Page\s*\d+/i.test(line) || /^Page\s*\d+/i.test(line) || /^Pg\.?\s*\d+/i.test(line)) {
          return line;
        }
        if (/^\[(?:Directive|Feedback|Part|Section):/i.test(line)) {
          return line;
        }
        return `[Page ${activePg}]: ${line}`;
      });
      noteToSave = taggedLines.join('\n');
    }

    if (!noteToSave.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Revision Directives Required',
        text: 'Please type what needs revision before issuing a revision request.',
        confirmButtonColor: '#7a2e46'
      });
      return;
    }

    setNote(noteToSave);
    if (role === 'adviser' && documentUrl) {
      saveDraft(documentUrl, 'review_note', noteToSave);
    }

    if (!onSaveNote) return;
    setIsSaving(true);
    await onSaveNote(noteToSave, 'revision');
    if (documentUrl) clearDraft(documentUrl, 'review_note');
    setNoteDraftInfo(null);
    setIsSaving(false);
  };

  // Automatically resolve Firebase Storage relative paths to full download URLs
  useEffect(() => {
    if (!documentUrl) {
      setResolvedUrl('');
      return;
    }
    if (documentUrl.startsWith('http') || documentUrl.startsWith('data:')) {
      setResolvedUrl(documentUrl);
    } else {
      getDownloadURL(ref(storage, documentUrl))
        .then(url => setResolvedUrl(url))
        .catch(err => {
          console.error("Failed to resolve document URL:", err);
          setResolvedUrl(documentUrl); // fallback
        });
    }
  }, [documentUrl]);

  // Update note if initialNote changes (e.g. when opening a different document)
  useEffect(() => {
    setNote(initialNote || '');
  }, [initialNote]);

  if (!isOpen) return null;

  const hasAnnotations = (initialAnnotations && Object.keys(initialAnnotations).length > 0) || 
                         (previousAnnotations && Object.keys(previousAnnotations).length > 0);
  const showNotesPanel = role === 'adviser' || (role === 'student' && (initialNote || previousNote || isResubmitted || hasAnnotations));


  // Build the viewer URL
  const getViewerUrl = () => {
    if (!resolvedUrl) return '';
    if (isDocx) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
    }
    if (isPdf) {
      // Use Mozilla's PDF.js web viewer to reliably render large PDFs without native browser restrictions
      return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(resolvedUrl)}`;
    }
    return resolvedUrl;
  };

  const viewerUrl = getViewerUrl();

  const handleIframeError = () => {
    setIframeError(true);
  };

  const handleRetry = () => {
    setIframeError(false);
    setLoadAttempt(prev => prev + 1);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleSafeClose(); }}
    >
      {/* Modal Container */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-document-title"
        className="bg-white dark:bg-stone-900 w-full max-w-6xl h-[100dvh] sm:h-[92vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative transform transition-all"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-[#7a2e46]/10 dark:bg-[#f8d070]/10 flex items-center justify-center text-[#7a2e46] dark:text-[#f8d070] shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 id="modal-document-title" className="font-bold text-gray-900 dark:text-stone-100 text-[14px] sm:text-[15px] truncate max-w-[140px] xs:max-w-[220px] sm:max-w-none">{documentTitle || 'Document Viewer'}</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-stone-400">Archival Quality Preview</p>
            </div>

            {/* Tri-state Notes Sync Pill for Adviser */}
            {role === 'adviser' && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 select-none ml-2">
                {hasUnsavedNote ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-amber-800 dark:text-amber-300 font-medium">Draft Note Buffered</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-stone-600 dark:text-stone-300 font-medium">Notes Saved</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <a 
              href={resolvedUrl || documentUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>
            
            <a 
              href={resolvedUrl || documentUrl} 
              download
              className="flex items-center gap-1.5 p-2 sm:px-4 sm:py-2 bg-[#7a2e46] hover:bg-[#5f2135] dark:bg-[#f8d070] dark:hover:bg-[#f3bc3d] text-white dark:text-stone-900 rounded-lg text-sm font-bold transition-colors touch-manipulation"
              title="Download Document"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-0.5 sm:mx-1"></div>

            <button 
              onClick={handleSafeClose}
              className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors touch-manipulation cursor-pointer"
              aria-label="Close document viewer modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body & Notes Panel */}
        <div className="flex-1 flex w-full h-full overflow-hidden relative">
          <div className="flex-1 h-full bg-stone-200 dark:bg-stone-950 relative overflow-hidden">
            {!resolvedUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 dark:text-stone-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7a2e46] dark:border-[#f8d070] mb-4"></div>
              <p>Loading document...</p>
            </div>
          ) : iframeError ? (
            /* Fallback UI when iframe is blocked */
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 dark:text-stone-400 gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-lg font-semibold text-stone-700 dark:text-stone-300">Preview Unavailable</h4>
              <p className="text-sm text-center max-w-md">
                The document preview was blocked by your browser. You can still view it by opening in a new tab or downloading it.
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
                <a
                  href={resolvedUrl || documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#7a2e46] text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open PDF
                </a>
              </div>
            </div>
          ) : isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-black p-4">
              <video 
                controls 
                autoPlay 
                src={resolvedUrl} 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full relative">
              {showPreviousOverlay && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-stone-950 font-bold px-4 py-1.5 rounded-full shadow-xl text-xs flex items-center gap-2 border border-amber-300 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                  <span className="w-2 h-2 rounded-full bg-stone-950 animate-ping"></span>
                  <span>Viewing Previous Highlights & Notes Overlay (Read-only)</span>
                </div>
              )}
              <AnnotatablePDFViewer 
                documentUrl={resolvedUrl} 
                initialAnnotations={showPreviousOverlay ? previousAnnotations : initialAnnotations}
                onSaveAnnotations={showPreviousOverlay ? undefined : onSaveAnnotations}
                readOnly={role !== 'adviser' || showPreviousOverlay}
                onPageChange={handleViewerPageChange}
                jumpPage={jumpPage}
              />
            </div>
          ) : (
            <iframe 
              key={loadAttempt}
              src={viewerUrl}
              className="w-full h-full border-0"
              title="Document Viewer"
              onError={handleIframeError}
              allowFullScreen
            />
          )}
          </div>

          {/* Revision Notes Panel */}
          {showNotesPanel && (
            <div className="w-[340px] sm:w-[360px] h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shrink-0">
              <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200 truncate">
                    {isResubmitted ? 'Review Resubmission' : 'Revision Notes'}
                  </h3>
                </div>
                {isResubmitted && (
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 shrink-0">
                    🔄 Resubmitted
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* ── View Previous Revision Request Card ── */}
                {isResubmitted && (
                  <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl p-3.5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/60">
                      <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wide">
                        <span className="text-base">📋</span>
                        <span>View Previous Revision Request</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                      The student submitted a new revised file. Verify if they corrected the requested parts:
                    </p>

                    {/* Previous Adviser Text Note */}
                    {previousNote ? (
                      <div className="bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                        <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>💬</span> Previous Feedback Note
                        </div>
                        <p className="text-xs text-stone-800 dark:text-stone-200 font-medium whitespace-pre-wrap">
                          {previousNote}
                        </p>
                      </div>
                    ) : (
                      <p className="italic text-stone-400 text-xs bg-white dark:bg-stone-900 p-2 rounded border border-amber-200/50">
                        No previous note text was attached.
                      </p>
                    )}

                    {/* Previous Floating Notes on Canvas */}
                    {extractedPreviousNotes.length > 0 && (
                      <div className="bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
                        <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <span>📌</span> Notes from Previous Paper
                        </div>
                        <ul className="space-y-1">
                          {extractedPreviousNotes.map((pn, idx) => (
                            <li key={idx} className="text-xs text-stone-700 dark:text-stone-200 flex items-start gap-1">
                              <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">[Page {pn.page}]:</span>
                              <span className="italic font-medium">"{pn.text}"</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Toggle Previous Highlights on Paper */}
                    {(extractedPreviousNotes.length > 0 || previousHighlightsCount > 0) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowPreviousOverlay(prev => !prev)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                            showPreviousOverlay
                              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300 dark:ring-amber-800'
                              : 'bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 shadow-sm'
                          }`}
                        >
                          <span>{showPreviousOverlay ? '🙈' : '👁️'}</span>
                          <span>
                            {showPreviousOverlay ? 'Hide Previous Highlights' : 'Show Previous Highlights on Paper'}
                          </span>
                        </button>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 text-center mt-1">
                          {showPreviousOverlay
                            ? 'Displaying previous highlights & floating notes for comparison.'
                            : 'Temporarily overlay previous highlights onto document.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Adviser Feedback / New Notes Area */}
                {role === 'adviser' ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-0.5">
                        {isResubmitted ? 'New Evaluation' : 'Revision Directives & Notes'}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {isResubmitted 
                          ? 'If the student still needs changes, add directives below. Every directive is saved.' 
                          : 'Add specific revision directives. Each comment saves and remains visible to students.'}
                      </p>
                    </div>

                    {/* Saved Revision Directives for this document */}
                    {adviserAllDirectives.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/70 rounded-xl shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📋</span>
                            <span>Saved Directives ({adviserAllDirectives.length})</span>
                          </p>
                          <span className="text-[9px] text-amber-700 dark:text-amber-300 font-semibold">
                            Visible to students
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5">
                          {adviserAllDirectives.map((d, idx) => {
                            const targetPage = d.page || (d.raw ? (d.raw.match(/\[Page\s*(\d+)\]/i)?.[1] || d.raw.match(/(?:Page|Pg\.?)\s*(\d+)/i)?.[1]) : null) || null;
                            let cleanComment = d.comment || d.raw || '';
                            cleanComment = cleanComment.replace(/^\[Page\s*\d+[^\]]*\]\s*(?::|-)?\s*/i, '');
                            cleanComment = cleanComment.replace(/^(?:Page|Pg\.?)\s*\d+\s*(?::|-)?\s*/i, '');
                            cleanComment = cleanComment.replace(/^\d+(?:\.|\))\s*/, '').trim();
                            if (!cleanComment) cleanComment = d.raw || (targetPage ? `Directive on Page ${targetPage}` : `Remark #${idx + 1}`);

                            return (
                              <div 
                                key={d.id || idx}
                                onClick={() => {
                                  if (targetPage) scrollToPage(targetPage);
                                }}
                                className="flex items-center justify-between gap-2.5 p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-all cursor-pointer group select-none"
                                title={targetPage ? `Click to jump to Page ${targetPage}` : `Remark #${idx + 1}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {/* Yellow sequence order badge */}
                                  <span 
                                    className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center shrink-0 border border-amber-200/90 dark:border-amber-800/60 shadow-2xs group-hover:bg-[#7a2e46] group-hover:text-white dark:group-hover:bg-[#f8d070] dark:group-hover:text-stone-950 transition-colors"
                                    title={`Remark #${idx + 1}${targetPage ? ` (Page ${targetPage})` : ''}`}
                                  >
                                    {idx + 1}
                                  </span>

                                  {/* Note comment text - fully clickable */}
                                  <div className="min-w-0 flex-1">
                                    {d.part && d.part !== 'Entire Page' && (
                                      <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 mr-1.5">
                                        {d.part}:
                                      </span>
                                    )}
                                    <span className="text-xs text-stone-700 dark:text-stone-200 font-medium group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                                      {cleanComment}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {targetPage && (
                                    <span className="text-[10px] font-bold text-stone-400 group-hover:text-[#7a2e46] dark:group-hover:text-[#f8d070] transition-colors">
                                      Pg {targetPage} →
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveDirective(d);
                                    }}
                                    className="text-stone-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold cursor-pointer transition-colors"
                                    title="Remove this directive"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick Add Page Note Widget */}
                    <div className="flex flex-col gap-2 p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                          {isDocument ? 'Add Page Directive' : 'Add Directive'}
                        </p>
                        <span className="text-[9px] text-stone-400">
                          {isDocument ? `Current: Page ${currentPage} of ${totalPages || 1}` : 'Document Feedback'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {isDocument && (
                          <div className="relative flex items-center">
                            <span className="absolute left-2 text-[10px] text-stone-400 pointer-events-none font-bold">Pg</span>
                            <input 
                              type="text" 
                              placeholder="Pg #"
                              value={quickPage}
                              onChange={e => setQuickPage(e.target.value)}
                              className="w-16 p-2 pl-6 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-1 focus:ring-[#7a2e46] dark:focus:ring-[#f8d070] outline-none text-stone-800 dark:text-stone-200 placeholder-stone-400 font-bold"
                              title="Page number (auto-detected, editable)"
                            />
                          </div>
                        )}
                        <input 
                          type="text" 
                          placeholder={isDocument ? "What needs revision on this page? (e.g. Methodology, Table 2)" : "Type what needs revision..."}
                          value={quickComment}
                          onChange={e => setQuickComment(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddQuickNote();
                            }
                          }}
                          className="flex-1 p-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-1 focus:ring-[#7a2e46] dark:focus:ring-[#f8d070] outline-none text-stone-800 dark:text-stone-200 placeholder-stone-400"
                        />
                        <button 
                          type="button"
                          onClick={handleAddQuickNote}
                          className="px-3 py-1 bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 rounded-lg hover:bg-[#5f2135] dark:hover:bg-[#f3bc3d] font-bold text-xs transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                          title="Add Directive to List"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Unsaved Note Draft Banner */}
                    {noteDraftInfo && (
                      <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">Unsaved draft ({formatDraftTime(noteDraftInfo.timestamp)})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleRestoreNoteDraft}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={handleDiscardNoteDraft}
                            className="px-1.5 py-0.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-[11px] cursor-pointer"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Academic Directives Tags */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-stone-400" />
                          Directive Shortcuts
                        </span>
                        <span className="text-[9px] text-stone-400">Click to insert</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['Format & Layout', 'Methodology', 'Literature Review', 'Statistical Data', 'APA & Citations'].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setQuickComment(prev => prev ? `${prev} - ${cat}` : cat);
                            }}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-stone-100 hover:bg-[#7a2e46]/10 hover:text-[#7a2e46] dark:bg-stone-800 dark:hover:bg-[#f8d070]/10 dark:hover:text-[#f8d070] text-stone-600 dark:text-stone-300 rounded-md border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                          >
                            +{cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {studentReply && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 shadow-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5 mb-1">
                          <span>💬</span> Student Resubmission Note
                        </p>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 italic whitespace-pre-wrap leading-relaxed">
                          "{studentReply}"
                        </p>
                      </div>
                    )}

                    {/* Overall Directives / Summary Textarea */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        Overall Directives / Remarks
                      </label>
                      <textarea 
                        value={note}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        placeholder="Type any general feedback or edit directives summary here..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#7a2e46] dark:focus:ring-[#f8d070] focus:border-transparent outline-none resize-none transition-all dark:text-stone-200 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Header info */}
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wide">
                        <span className="text-base">📋</span>
                        <span>{isResubmitted ? 'Previous Revision Feedback' : 'Revision Feedback Required'}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-snug">
                        Please review the requested changes below and update your document accordingly.
                      </p>
                    </div>

                    {studentReply && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 shadow-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5 mb-1">
                          <span>💬</span> Your Resubmission Note
                        </p>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 italic whitespace-pre-wrap leading-relaxed">
                          "{studentReply}"
                        </p>
                      </div>
                    )}

                    {/* All Revision Directives / Notes from Adviser */}
                    {studentAllDirectives.length > 0 && (
                      <div className="flex flex-col gap-2.5 p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span>💬</span>
                            <span>{isResubmitted ? 'Previous Revision Directives' : 'Adviser Revision Note'}</span>
                          </p>
                          <span className="text-[9px] font-bold text-[#7a2e46] dark:text-[#f8d070] bg-[#7a2e46]/10 dark:bg-[#f8d070]/10 px-2 py-0.5 rounded-full">
                            {studentAllDirectives.length} Item{studentAllDirectives.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {studentAllDirectives.map((d, idx) => {
                            const targetPage = d.page || (d.raw ? (d.raw.match(/\[Page\s*(\d+)\]/i)?.[1] || d.raw.match(/(?:Page|Pg\.?)\s*(\d+)/i)?.[1]) : null) || null;
                            let cleanComment = d.comment || d.raw || '';
                            cleanComment = cleanComment.replace(/^\[Page\s*\d+[^\]]*\]\s*(?::|-)?\s*/i, '');
                            cleanComment = cleanComment.replace(/^(?:Page|Pg\.?)\s*\d+\s*(?::|-)?\s*/i, '');
                            cleanComment = cleanComment.replace(/^\d+(?:\.|\))\s*/, '').trim();
                            if (!cleanComment) cleanComment = d.raw || (targetPage ? `Directive on Page ${targetPage}` : `Remark #${idx + 1}`);

                            return (
                              <div 
                                key={d.id || idx}
                                onClick={() => {
                                  if (targetPage && isDocument) scrollToPage(targetPage);
                                }}
                                className={`flex items-center justify-between gap-2.5 p-2.5 bg-white dark:bg-stone-900 border border-amber-200/90 dark:border-amber-800/60 rounded-xl shadow-xs transition-all group select-none ${
                                  isDocument && targetPage ? 'cursor-pointer hover:border-[#7a2e46] dark:hover:border-[#f8d070] hover:bg-amber-50/20 dark:hover:bg-amber-950/20' : ''
                                }`}
                                title={isDocument && targetPage ? `Click to jump to Page ${targetPage}` : `Remark #${idx + 1}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {/* Yellow sequence order badge */}
                                  <span 
                                    className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center shrink-0 border border-amber-200/90 dark:border-amber-800/60 shadow-2xs group-hover:bg-[#7a2e46] group-hover:text-white dark:group-hover:bg-[#f8d070] dark:group-hover:text-stone-950 transition-colors"
                                    title={`Remark #${idx + 1}${targetPage ? ` (Page ${targetPage})` : ''}`}
                                  >
                                    {idx + 1}
                                  </span>

                                  {/* Note comment text - fully clickable */}
                                  <div className="min-w-0 flex-1">
                                    {d.part && d.part !== 'Entire Page' && (
                                      <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 mr-1.5">
                                        {d.part}:
                                      </span>
                                    )}
                                    <span className="text-xs text-stone-800 dark:text-stone-200 font-medium leading-relaxed group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                                      {cleanComment}
                                    </span>
                                  </div>
                                </div>

                                {isDocument && targetPage && (
                                  <span className="text-[10px] font-bold text-stone-400 group-hover:text-[#7a2e46] dark:group-hover:text-[#f8d070] shrink-0 transition-colors">
                                    Pg {targetPage} →
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Floating Sticky Notes on PDF Document */}
                    {extractedCurrentNotes.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <span>📌</span>
                            <span>Sticky Notes on Document</span>
                          </p>
                          <span className="text-[9px] text-stone-400">
                            {extractedCurrentNotes.length} pinned note{extractedCurrentNotes.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {extractedCurrentNotes.map((noteItem, idx) => (
                            <div 
                              key={idx}
                              onClick={() => scrollToPage(noteItem.page)}
                              className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-stone-900 border border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400 transition-colors cursor-pointer group"
                              title={`Click to jump to Page ${noteItem.page}`}
                            >
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0 group-hover:bg-[#7a2e46] group-hover:text-white transition-colors">
                                Pg {noteItem.page}
                              </span>
                              <span className="text-xs text-stone-800 dark:text-stone-200 italic font-medium flex-1">
                                "{noteItem.text}"
                              </span>
                              <span className="text-[10px] text-stone-400 group-hover:text-[#7a2e46] dark:group-hover:text-[#f8d070] shrink-0 font-medium">
                                →
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {studentAllDirectives.length === 0 && extractedCurrentNotes.length === 0 && (
                      <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl p-4 text-center">
                        <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                          No revision notes provided for this document.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {role === 'adviser' && (
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex flex-col gap-2.5">
                  <button 
                    onClick={handleRequestRevision}
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 bg-[#7a2e46] hover:bg-[#5f2135] active:bg-[#4a1224] dark:bg-[#f8d070] dark:hover:bg-[#f3bc3d] text-white dark:text-stone-950 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-white dark:text-stone-950" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Submitting Directives...
                      </>
                    ) : (
                      <>
                        <span>{isResubmitted ? '🔄' : '📝'}</span>
                        <span>{isResubmitted ? 'Request Follow-up Revision' : 'Request Revision'}</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={async () => {
                      if (!onSaveNote) return;
                      setIsSaving(true);
                      setNote('');
                      await onSaveNote('', 'approved');
                      if (documentUrl) clearDraft(documentUrl, 'review_note');
                      setNoteDraftInfo(null);
                      setIsSaving(false);
                    }}
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Approving...
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
