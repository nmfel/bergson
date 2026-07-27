import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertTriangle, Layers, Check, ChevronLeft, ChevronRight, LayoutGrid, Square, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { MAX_PDF_SIZE_BYTES } from '../../utils/pdfStorage';
import { pdfjsLib } from '../../utils/pdfWorkerInit';


export interface PdfImportOptions {
  pages: number[];
  layoutMode: 'single-widget' | 'separate-cards';
}

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  pageCount: number;
  showLayoutOptions?: boolean;
  onConfirmImport: (options: PdfImportOptions) => void;
}

export function parsePageSelection(inputStr: string, totalPages: number): number[] {
  if (!inputStr.trim()) return [1];
  const pagesSet = new Set<number>();
  const parts = inputStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(totalPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pagesSet.add(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pagesSet.add(pageNum);
      }
    }
  }

  const result = Array.from(pagesSet).sort((a, b) => a - b);
  return result.length > 0 ? result : [1];
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  isOpen,
  onClose,
  file,
  pageCount,
  showLayoutOptions = true,
  onConfirmImport
}) => {
  const [importMode, setImportMode] = useState<'all' | 'custom'>('all');
  const [customInput, setCustomInput] = useState<string>('1-10');
  const [layoutMode, setLayoutMode] = useState<'single-widget' | 'separate-cards'>('single-widget');
  
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewScale, setPreviewScale] = useState<number>(1.2);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    setCustomInput(`1-${Math.min(pageCount || 1, 10)}`);
    setPreviewPage(1);
    setPreviewScale(1.2);
  }, [file, pageCount]);

  // Load PDF Doc for Preview
  useEffect(() => {
    if (!isOpen || !file) return;

    let isMounted = true;
    setPreviewLoading(true);

    file.arrayBuffer().then(buffer => {
      const uint8 = new Uint8Array(buffer);
      pdfjsLib.getDocument({ data: uint8 }).promise.then(pdf => {
        if (isMounted) {
          pdfDocRef.current = pdf;
          renderPreview(pdf, 1, previewScale);
        }
      }).catch(err => {
        console.error('Preview PDF load error:', err);
        setPreviewLoading(false);
      });
    });

    return () => {
      isMounted = false;
      pdfDocRef.current = null;
    };
  }, [isOpen, file]);

  const renderPreview = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number, scaleVal: number = previewScale) => {
    if (!previewCanvasRef.current) return;
    setPreviewLoading(true);
    try {
      const validPage = Math.max(1, Math.min(pageNum, pdf.numPages));
      const page = await pdf.getPage(validPage);
      
      // Internal canvas resolution rendered high-res (1.5) for crisp sharp text
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = previewCanvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Set CSS display dimensions driven by scaleVal so zoom in/out physically expands/shrinks canvas!
      const baseHeight = 340;
      const baseWidth = (viewport.width / viewport.height) * baseHeight;
      canvas.style.width = `${Math.round(baseWidth * scaleVal)}px`;
      canvas.style.height = `${Math.round(baseHeight * scaleVal)}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }
    } catch (e) {
      console.error('Render preview error:', e);
    } finally {
      setPreviewLoading(false);
    }
  };


  useEffect(() => {
    if (pdfDocRef.current) {
      const p = Math.max(1, Math.min(previewPage, pageCount));
      renderPreview(pdfDocRef.current, p, previewScale);
    }
  }, [previewPage, pageCount, previewScale]);


  useEffect(() => {
    if (importMode === 'custom') {
      const pages = parsePageSelection(customInput, pageCount);
      if (pages.length > 0) {
        setPreviewPage(pages[0]);
      }
    } else {
      setPreviewPage(1);
    }
  }, [customInput, importMode, pageCount]);


  if (!isOpen || !file) return null;

  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const isTooLarge = file.size > MAX_PDF_SIZE_BYTES;

  const handlePrevPreview = () => {
    if (previewPage > 1) setPreviewPage(prev => prev - 1);
  };

  const handleNextPreview = () => {
    if (previewPage < pageCount) setPreviewPage(prev => prev + 1);
  };

  const handleConfirm = () => {
    let pagesToImport: number[] = [];
    if (importMode === 'all') {
      pagesToImport = Array.from({ length: pageCount }, (_, i) => i + 1);
    } else {
      pagesToImport = parsePageSelection(customInput, pageCount);
    }

    onConfirmImport({
      pages: pagesToImport,
      layoutMode
    });
    onClose();
  };

  const selectedPagesCount = importMode === 'all' 
    ? pageCount 
    : parsePageSelection(customInput, pageCount).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-4xl w-full p-6 text-text-primary space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-border pb-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Import PDF Document</h3>
            <p className="text-xs text-text-muted truncate max-w-[480px]">{file.name}</p>
          </div>
        </div>

        {/* File Info */}
        <div className="flex items-center justify-between text-xs bg-surface-hover p-3 rounded-lg border border-border">
          <span className="text-text-muted">Size: <strong className="text-text-primary">{sizeMB} MB</strong></span>
          <span className="text-text-muted">Total Pages: <strong className="text-text-primary">{pageCount} pages</strong></span>
        </div>

        {isTooLarge && (
          <div className="flex items-start space-x-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">File size exceeds recommended limit ({sizeMB} MB &gt; 25 MB)</p>
              <p className="mt-1 opacity-90">To keep local storage light and fast, we recommend importing specific pages.</p>
            </div>
          </div>
        )}

        {/* Custom Input & Large Live Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch bg-surface-hover p-4 rounded-xl border border-border">
          {/* Left Panel: Options & Input (5 cols) */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Selection Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('all')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      importMode === 'all'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-hover text-text-primary'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1" />
                    All ({pageCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('custom')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      importMode === 'custom'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-hover text-text-primary'
                    }`}
                  >
                    <FileText className="w-4 h-4 mb-1" />
                    Custom
                  </button>
                </div>
              </div>

              {importMode === 'custom' ? (
                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Enter Page Numbers / Ranges</label>
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder="e.g. 1-5, 24, 129"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
                  />
                  <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed">
                    Examples: <code className="bg-surface px-1 py-0.5 rounded">1-10</code> or <code className="bg-surface px-1 py-0.5 rounded">2, 24, 129</code>
                  </p>
                </div>
              ) : (
                <div className="text-xs text-text-muted">
                  Importing all <strong>{pageCount}</strong> pages of this document.
                </div>
              )}
            </div>

            {/* Layout Mode Selector for Whiteboard */}
            {showLayoutOptions && (
              <div className="pt-3 border-t border-border/60 space-y-1.5">
                <label className="text-[11px] font-semibold text-text-muted block uppercase tracking-wider">Canvas Placement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('single-widget')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-medium transition-all ${
                      layoutMode === 'single-widget'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text-muted hover:text-text-primary'
                    }`}
                    title="Single viewer widget with page switcher"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Single Viewer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('separate-cards')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-medium transition-all ${
                      layoutMode === 'separate-cards'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text-muted hover:text-text-primary'
                    }`}
                    title="Split selected pages as individual side-by-side cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Split Cards</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Large High-Res Live Page Preview (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-between p-4 bg-surface rounded-xl border border-border relative min-h-[420px]">
            {/* Page Nav & Zoom Header */}
            <div className="flex items-center justify-between w-full mb-3 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handlePrevPreview}
                  disabled={previewPage <= 1}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-surface-hover hover:bg-border disabled:opacity-30 transition-colors text-xs text-text-primary"
                  title="Preview Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                
                <span className="text-xs text-text-primary font-semibold px-1">
                  Page {previewPage} of {pageCount}
                </span>

                <button
                  type="button"
                  onClick={handleNextPreview}
                  disabled={previewPage >= pageCount}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-surface-hover hover:bg-border disabled:opacity-30 transition-colors text-xs text-text-primary"
                  title="Preview Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Zoom Controls */}
              <div className="flex items-center space-x-1 bg-surface-hover/80 border border-border rounded-lg px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.max(0.7, prev - 0.2))}
                  className="p-1 rounded hover:bg-border transition-colors text-text-muted hover:text-text-primary"
                  title="Zoom Out Preview"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono w-8 text-center">{Math.round(previewScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.min(2.5, prev + 0.2))}
                  className="p-1 rounded hover:bg-border transition-colors text-text-muted hover:text-text-primary"
                  title="Zoom In Preview"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(1.2)}
                  className="p-1 rounded hover:bg-border transition-colors text-text-muted hover:text-text-primary ml-0.5"
                  title="Reset Preview Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {previewLoading && (
              <div className="absolute inset-0 bg-surface/90 flex items-center justify-center text-xs text-text-muted animate-pulse rounded-xl z-10">
                Loading page preview...
              </div>
            )}

            <div className="flex items-center justify-center w-full h-[360px] overflow-auto rounded-lg border border-border/80 shadow-md bg-white p-2">
              <canvas ref={previewCanvasRef} className="shadow-md rounded border border-border/40 transition-all duration-150 shrink-0" />
            </div>

          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-text-muted">
            Selected: <strong className="text-primary">{selectedPagesCount} page(s)</strong>
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-medium bg-primary text-white hover:bg-primary/90 rounded-lg shadow transition-colors flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import ({selectedPagesCount} pages)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
