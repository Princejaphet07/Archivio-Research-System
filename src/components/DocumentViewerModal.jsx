import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

const DocumentViewerModal = ({ isOpen, onClose, documentUrl, documentTitle, role, initialNote, onSaveNote }) => {
  const [iframeError, setIframeError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [note, setNote] = useState(initialNote || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update note if initialNote changes (e.g. when opening a different document)
  React.useEffect(() => {
    setNote(initialNote || '');
  }, [initialNote]);

  if (!isOpen) return null;

  const showNotesPanel = role === 'adviser' || (role === 'student' && initialNote);

  // Determine file type
  const lowerUrl = documentUrl?.toLowerCase() || '';
  const isDocx = lowerUrl.includes('.docx') || lowerUrl.includes('.doc');
  const isPdf = lowerUrl.includes('.pdf');

  // Build the viewer URL
  // For DOCX: Use Google Docs Viewer which handles cross-origin embedding properly
  // For PDFs: Use direct URL to utilize native browser PDF viewer and bypass Google Docs size limits
  const getViewerUrl = () => {
    if (!documentUrl) return '';
    if (isDocx) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`;
    }
    // For PDFs, images, or other embeddable content, use directly
    return documentUrl;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="bg-white dark:bg-stone-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative transform transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7a2e46]/10 dark:bg-[#f8d070]/10 flex items-center justify-center text-[#7a2e46] dark:text-[#f8d070]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-stone-100 text-[15px]">{documentTitle || 'Document Viewer'}</h3>
              <p className="text-xs text-gray-500 dark:text-stone-400">Secure Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href={documentUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>
            
            <a 
              href={documentUrl} 
              download
              className="flex items-center gap-2 px-4 py-2 bg-[#7a2e46] hover:bg-[#5f2135] dark:bg-[#f8d070] dark:hover:bg-[#f3bc3d] text-white dark:text-stone-900 rounded-lg text-sm font-bold transition-colors"
              title="Download Document"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1"></div>

            <button 
              onClick={onClose}
              className="p-2 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body & Notes Panel */}
        <div className="flex-1 flex w-full h-full overflow-hidden relative">
          {/* Main Viewer Area */}
          <div className="flex-1 h-full bg-stone-200 dark:bg-stone-950 relative overflow-hidden">
            {!documentUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-stone-500 dark:text-stone-400">
              <p>No document URL provided.</p>
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
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#7a2e46] hover:bg-[#5f2135] dark:bg-[#f8d070] dark:hover:bg-[#f3bc3d] text-white dark:text-stone-900 rounded-lg text-sm font-bold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            </div>
          ) : (
            <iframe 
              key={loadAttempt}
              src={viewerUrl} 
              title={documentTitle}
              className="w-full h-full border-0"
              allow="autoplay"
              onError={handleIframeError}
            />
          )}
          </div>

          {/* Revision Notes Panel */}
          {showNotesPanel && (
            <div className="w-[320px] h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shrink-0">
              <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2 bg-stone-50 dark:bg-stone-900/50">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
                <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200">Revision Notes</h3>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                {role === 'adviser' ? (
                  <div className="flex flex-col h-full gap-3">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Add specific feedback for this document (e.g. "Page 5 needs formatting", "Update the bibliography").
                    </p>
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Type your revision notes here..."
                      className="flex-1 w-full p-3 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#7a2e46] dark:focus:ring-[#f8d070] focus:border-transparent outline-none resize-none transition-all dark:text-stone-200"
                    />
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 h-full">
                    <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{note}</p>
                  </div>
                )}
              </div>

              {role === 'adviser' && (
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex flex-col gap-2">
                  <button 
                    onClick={async () => {
                      if (!onSaveNote) return;
                      setIsSaving(true);
                      await onSaveNote(note, 'revision');
                      setIsSaving(false);
                    }}
                    disabled={isSaving || !note.trim()}
                    className="w-full py-2.5 bg-[#7a2e46] hover:bg-[#5f2135] dark:bg-[#f8d070] dark:hover:bg-[#f3bc3d] text-white dark:text-stone-900 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Saving...
                      </>
                    ) : (
                      'Save Revision Note'
                    )}
                  </button>

                  <button 
                    onClick={async () => {
                      if (!onSaveNote) return;
                      setIsSaving(true);
                      setNote('');
                      await onSaveNote('', 'approved');
                      setIsSaving(false);
                    }}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                  >
                    Mark as Checked (No Revisions)
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
