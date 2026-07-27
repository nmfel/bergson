import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { pdfjsLib } from '../../utils/pdfWorkerInit';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PdfCanvasViewerProps {
  pdfUrl: string;
  initialPage?: number;
  startPage?: number;
  endPage?: number;
  pages?: number[];
  className?: string;
  onPageChange?: (page: number) => void;
  onLoadSuccess?: (pdf: pdfjsLib.PDFDocumentProxy) => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfUrl,
  initialPage = 1,
  startPage = 1,
  endPage,
  pages,
  className = '',
  onPageChange,
  onLoadSuccess
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const renderTaskRef = useRef<any>(null);

  // Compute exact allowed pages array
  const allowedPages = useMemo(() => {
    if (pages && Array.isArray(pages) && pages.length > 0) {
      return pages;
    }
    const maxPage = endPage || 1;
    const result: number[] = [];
    for (let i = startPage; i <= maxPage; i++) {
      result.push(i);
    }
    return result.length > 0 ? result : [1];
  }, [pages, startPage, endPage]);

  const currentPage = allowedPages[pageIndex] || allowedPages[0] || 1;

  // Load PDF Document
  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
    loadingTask.promise
      .then(pdf => {
        if (!isMounted) return;
        setPdfDoc(pdf);
        const firstIdx = allowedPages.indexOf(initialPage) !== -1 ? allowedPages.indexOf(initialPage) : 0;
        setPageIndex(firstIdx);
        setIsLoading(false);
        if (onLoadSuccess) onLoadSuccess(pdf);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      loadingTask.destroy();
    };
  }, [pdfUrl, allowedPages, initialPage]);

  // Render Current Page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas
      };

      const renderTask = page.render(renderContext);

      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('PDF Page Render Error:', err);
      }
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Clean up canvas memory on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
    };
  }, []);

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      const nextIdx = pageIndex - 1;
      setPageIndex(nextIdx);
      if (onPageChange) onPageChange(allowedPages[nextIdx]);
    }
  };

  const handleNextPage = () => {
    if (pageIndex < allowedPages.length - 1) {
      const nextIdx = pageIndex + 1;
      setPageIndex(nextIdx);
      if (onPageChange) onPageChange(allowedPages[nextIdx]);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.0);

  return (
    <div ref={containerRef} className={`flex flex-col items-center bg-surface-hover/30 border border-border rounded-xl p-3 select-none ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between w-full mb-3 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary shadow-sm">
        {/* Page Nav */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={pageIndex <= 0}
            className="p-1 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const input = window.prompt(`Jump directly to page number:`, String(currentPage));
              if (input) {
                const pageNum = parseInt(input, 10);
                if (!isNaN(pageNum)) {
                  let foundIdx = allowedPages.indexOf(pageNum);
                  if (foundIdx === -1 && pageNum >= 1 && pageNum <= allowedPages.length) {
                    foundIdx = pageNum - 1;
                  } else if (foundIdx === -1) {
                    foundIdx = allowedPages.reduce((closestIdx, p, idx) => {
                      return Math.abs(p - pageNum) < Math.abs(allowedPages[closestIdx] - pageNum) ? idx : closestIdx;
                    }, 0);
                  }

                  setPageIndex(foundIdx);
                  if (onPageChange) onPageChange(allowedPages[foundIdx]);
                }
              }
            }}
            className="font-semibold text-[11px] px-1.5 py-0.5 hover:bg-surface-hover rounded transition-colors text-text-primary hover:text-primary cursor-pointer border border-transparent hover:border-border/60"
            title="Click to jump directly to any page number"
          >
            Page {currentPage} ({pageIndex + 1} of {allowedPages.length})
          </button>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={pageIndex >= allowedPages.length - 1}
            className="p-1 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 border-l border-border pl-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-surface-hover transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-surface-hover transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors ml-1"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PDF Canvas Display */}
      <div className="relative overflow-x-auto w-full flex items-center justify-center p-3 rounded-lg bg-white dark:bg-zinc-900 shadow-inner min-h-[300px]">
        {isLoading && (
          <div className="py-12 px-8 text-xs text-text-muted animate-pulse flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Rendering PDF page...</span>
          </div>
        )}

        {error && (
          <div className="py-8 px-6 text-xs text-red-500 text-center">
            {error}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-md rounded transition-all duration-150 ${isLoading ? 'hidden' : 'block'}`}
        />
      </div>
    </div>
  );
};
