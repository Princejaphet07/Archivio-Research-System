import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Pen, Highlighter, Eraser, Type, Trash2, Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import Swal from 'sweetalert2';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const AnnotatablePDFViewer = ({ documentUrl, initialAnnotations = {}, onSaveAnnotations, readOnly = false }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  
  // annotations = { [pageNumber]: [ { type, points, color, size } ] }
  const [annotations, setAnnotations] = useState(initialAnnotations || {});
  const [currentTool, setCurrentTool] = useState('pen'); // 'pen', 'highlighter', 'eraser', 'text'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Settings for tools
  const tools = {
    pen: { color: '#ef4444', size: 2, globalCompositeOperation: 'source-over', opacity: 1 },
    highlighter: { color: '#fcd34d', size: 15, globalCompositeOperation: 'multiply', opacity: 0.6 },
    eraser: { color: '#ffffff', size: 20, globalCompositeOperation: 'destination-out', opacity: 1 }
  };

  useEffect(() => {
    if (initialAnnotations) {
      setAnnotations(initialAnnotations);
    }
  }, [initialAnnotations]);

  // Render all paths for the current page
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pageAnnotations = annotations[pageNumber] || [];
    const allPaths = currentPath ? [...pageAnnotations, currentPath] : pageAnnotations;

    allPaths.forEach(path => {
      if (!path.points || path.points.length === 0 || path.type === 'text') return;
      
      const tool = tools[path.type] || tools.pen;
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
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
  }, [annotations, pageNumber, currentPath]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

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

    // Coordinates relative to the canvas internal resolution (1:1 with CSS size right now because we set width/height to offsetWidth)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (readOnly) return;
    if (e.target.tagName === 'INPUT') return; // Don't interrupt text input
    if (e.cancelable) e.preventDefault(); // prevent scrolling on touch
    const coords = getCoordinates(e);
    if (!coords) return;

    if (currentTool === 'text') {
      setTextInput({ x: coords.x, y: coords.y, value: '' });
      return;
    }

    setIsDrawing(true);
    setCurrentPath({
      type: currentTool,
      points: [coords]
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
      setAnnotations(prev => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), currentPath]
      }));
      setHasChanges(true);
    }
    setCurrentPath(null);
  };

  const clearPage = () => {
    Swal.fire({
      title: 'Clear Page?',
      text: "This will remove all annotations on the current page.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
      if (result.isConfirmed) {
        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: []
        }));
        setHasChanges(true);
      }
    });
  };

  const deleteTextAnnotation = (indexToRemove) => {
    if (readOnly) return;
    setAnnotations(prev => {
      const currentPageAnnotations = prev[pageNumber] || [];
      const newAnnotations = currentPageAnnotations.filter((_, i) => i !== indexToRemove);
      return {
        ...prev,
        [pageNumber]: newAnnotations
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSaveAnnotations) {
      onSaveAnnotations(annotations);
      setHasChanges(false);
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
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shrink-0 shadow-sm z-10">
        
        {/* Pagination & Zoom */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
            <button 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-50 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-medium text-stone-700 dark:text-stone-300 font-mono">
              {pageNumber} / {numPages || '-'}
            </span>
            <button 
              onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
              disabled={pageNumber >= numPages}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 disabled:opacity-50 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="h-6 w-px bg-stone-300 dark:bg-stone-700 hidden sm:block"></div>

          <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-1 hidden sm:flex">
            <button 
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium text-stone-700 dark:text-stone-300 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawing Tools */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
              <button 
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${currentTool === 'pen' ? 'bg-white dark:bg-stone-700 text-[#7a2e46] dark:text-[#f8d070] shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'}`}
                title="Pen (Red)"
              >
                <Pen className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentTool('highlighter')}
                className={`p-2 rounded transition-colors ${currentTool === 'highlighter' ? 'bg-white dark:bg-stone-700 text-amber-500 shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'}`}
                title="Highlighter (Yellow)"
              >
                <Highlighter className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentTool('text')}
                className={`p-2 rounded transition-colors ${currentTool === 'text' ? 'bg-white dark:bg-stone-700 text-[#7a2e46] dark:text-[#f8d070] shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'}`}
                title="Text Tool"
              >
                <Type className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${currentTool === 'eraser' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'}`}
                title="Eraser"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={clearPage}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
              title="Clear current page"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button 
              onClick={handleSave}
              disabled={!hasChanges}
              className={`ml-2 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                hasChanges 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        )}
      </div>

      {/* PDF Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-stone-200 dark:bg-stone-950 flex justify-center p-4 md:p-8"
        style={{ cursor: readOnly ? 'default' : 'crosshair' }}
      >
        {documentUrl ? (
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
                width={800} // fixed base width, scale applied via CSS
              />
            </Document>

            {/* Drawing Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-10 touch-none"
              style={{ 
                cursor: readOnly ? 'default' : 'crosshair',
                pointerEvents: readOnly ? 'none' : 'auto'
              }}
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
                    setAnnotations(prev => ({
                      ...prev,
                      [pageNumber]: [...(prev[pageNumber] || []), {
                        type: 'text',
                        text: textInput.value,
                        points: [{ x: textInput.x, y: textInput.y }]
                      }]
                    }));
                    setHasChanges(true);
                  }
                  setTextInput(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
                placeholder="Type..."
                className="absolute z-20 bg-white/90 border-2 border-[#7a2e46] dark:border-[#f8d070] outline-none text-[#7a2e46] dark:text-stone-900 px-2 py-1 rounded shadow-lg font-sans font-bold"
                style={{
                  left: `${textInput.x}px`,
                  top: `${textInput.y - 12}px`,
                  fontSize: '16px',
                  minWidth: '200px'
                }}
              />
            )}

            {/* Rendered Text Annotations */}
            {(annotations[pageNumber] || []).map((path, idx) => {
              if (path.type !== 'text') return null;
              return (
                <div
                  key={idx}
                  className="absolute z-10 group"
                  style={{
                    left: `${path.points[0].x}px`,
                    top: `${path.points[0].y - 12}px`
                  }}
                >
                  <div className="relative bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border border-[#7a2e46]/30 dark:border-[#f8d070]/30 px-2 py-1 rounded shadow-sm">
                    <span className="font-sans font-bold text-[#7a2e46] dark:text-[#f8d070] text-[16px] whitespace-pre-wrap leading-tight">{path.text}</span>
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTextAnnotation(idx);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                        title="Delete text"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500">
            No document provided
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotatablePDFViewer;
