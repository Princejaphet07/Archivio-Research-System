import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

const DocumentViewerModal = ({ isOpen, onClose, documentUrl, documentTitle }) => {
  const [iframeError, setIframeError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  if (!isOpen) return null;

  // Determine file type
  const lowerUrl = documentUrl?.toLowerCase() || '';
  const isDocx = lowerUrl.includes('.docx') || lowerUrl.includes('.doc');
  const isPdf = lowerUrl.includes('.pdf');

  // Build the viewer URL
  // For PDFs and DOCX: Use Google Docs Viewer which handles cross-origin embedding properly
  // This avoids Chrome blocking the iframe due to X-Frame-Options or CORS headers
  const getViewerUrl = () => {
    if (!documentUrl) return '';
    if (isDocx || isPdf) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`;
    }
    // For images or other embeddable content, use directly
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

        {/* Viewer Body */}
        <div className="flex-1 w-full h-full bg-stone-200 dark:bg-stone-950 relative">
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
      </div>
    </div>
  );
};

export default DocumentViewerModal;
