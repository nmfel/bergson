import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { Toolbar, type ToolType } from './Toolbar';
import { usePageManagement } from '../../hooks/usePageManagement';
import { IconPicker } from '../common/IconPicker';
import { StatusPicker } from '../common/StatusPicker';
import { TagPicker } from '../common/TagPicker';
import { LayoutDashboard } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { compressImage } from '../../utils/image';
import { extractAndStoreImagesFromJson, resolveImagesInJson, clearBlobCache } from '../../utils/imageStorage';
import { useSettingsStore } from '../../store/settingsStore';
import { PageSelectModal } from '../common/PageSelectModal';
import { ImageCropModal } from '../common/ImageCropModal';
import { useNavigate } from 'react-router-dom';
import { Crop, ArrowUp, ArrowDown, Lock, Unlock, ChevronLeft, ChevronRight, Copy, Trash2, ExternalLink } from 'lucide-react';



import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Minimap } from './Minimap';
import { PdfImportModal, type PdfImportOptions } from '../common/PdfImportModal';
import { storePdfToDB, resolvePdfUrl } from '../../utils/pdfStorage';
import { pdfjsLib } from '../../utils/pdfWorkerInit';



import type { Page } from '../../types';


interface WhiteboardEditorProps {
  page: Page;
  title: string;
  setTitle: (title: string) => void;
  onUpdatePage: (data: Partial<Page>) => Promise<void>;
}

const createArrowPathStr = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const headlen = 15;
    const x3 = x2 - headlen * Math.cos(angle - Math.PI / 6);
    const y3 = y2 - headlen * Math.sin(angle - Math.PI / 6);
    const x4 = x2 - headlen * Math.cos(angle + Math.PI / 6);
    const y4 = y2 - headlen * Math.sin(angle + Math.PI / 6);
    return `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${x3} ${y3} M ${x2} ${y2} L ${x4} ${y4}`;
};

const globalPendingWhiteboardSaves: Record<string, string> = {};

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ page, title, setTitle, onUpdatePage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  
  const { theme, panOnEmptyClick } = useSettingsStore();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor, setActiveColor] = useState<string>(isDarkMode ? '#e5e5e5' : '#1a1a1a');
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  
  const navigate = useNavigate();

  // History state for undo/redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const isHistoryUpdate = useRef(false);

  const { updatePage } = usePageManagement();
  
  const isDrawing = useRef(false);
  const shapeRef = useRef<fabric.Object | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const saveTimeout = useRef<number | null>(null);
  
  // Pan state
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const spaceHeld = useRef(false);
  
  // Grid tracking for CSS background sync
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });
  const [gridZoom, setGridZoom] = useState(1);
  
  // Page link selection
  const [pageSelectPos, setPageSelectPos] = useState<{x: number, y: number} | null>(null);
  const [selectedLinkObj, setSelectedLinkObj] = useState<any>(null);
  const [editingLinkObj, setEditingLinkObj] = useState<any>(null);
  
  // Image crop selection
  const [croppingImageObj, setCroppingImageObj] = useState<fabric.Image | null>(null);

  // PDF import & hover toolbar state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [, setUpdateCounter] = useState(0);

  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(false);
  const hideToolbarTimerRef = useRef<any>(null);

  const showToolbar = useCallback(() => {
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current);
      hideToolbarTimerRef.current = null;
    }
    setIsToolbarVisible(true);
  }, []);

  const scheduleHideToolbar = useCallback(() => {
    if (!hideToolbarTimerRef.current) {
      hideToolbarTimerRef.current = setTimeout(() => {
        setIsToolbarVisible(false);
        hideToolbarTimerRef.current = null;
      }, 300);
    }
  }, []);

  const handleSelectObject = useCallback((obj: fabric.Object | null) => {
    setActiveObject(obj);
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current);
      hideToolbarTimerRef.current = null;
    }
    setIsToolbarVisible(false);
  }, []);




  const handleDuplicateObject = useCallback(() => {
    const canvas = fabricRef.current;
    const activeObj = canvas?.getActiveObject();
    if (!canvas || !activeObj) return;

    const customProps = [
      'bookmarkUrl', 'internalPageId', 'internalPageType', 'id', 'fromId', 'toId', 
      'isArrow', 'fromX', 'fromY', 'toX', 'toY',
      'pdfProtocolUrl', 'pdfStartPage', 'pdfEndPage', 'pdfCurrentPage', 'pdfPageCount', 'pdfPageNum', 'pdfIsSingleViewer', 'pdfPages'
    ];

    activeObj.clone((cloned: fabric.Object) => {
      cloned.set({
        left: (cloned.left || 0) + 30,
        top: (cloned.top || 0) + 30
      });
      (cloned as any).id = `obj_${Math.random().toString(36).substr(2, 9)}`;

      customProps.forEach(prop => {
        (cloned as any)[prop] = (activeObj as any)[prop];
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      handleSelectObject(cloned);
    }, customProps);
  }, [handleSelectObject]);


  const handleDeleteObject = useCallback(() => {
    const canvas = fabricRef.current;
    const activeObj = canvas?.getActiveObject();
    if (!canvas || !activeObj) return;

    canvas.remove(activeObj);
    canvas.discardActiveObject();
    canvas.renderAll();
    handleSelectObject(null);
  }, [handleSelectObject]);




  // Keep settings in refs so event handlers always see latest value
  const activeToolRef = useRef<ToolType>(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  const activeColorRef = useRef<string>(activeColor);
  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);

  const panOnEmptyClickRef = useRef<boolean>(panOnEmptyClick);
  useEffect(() => { panOnEmptyClickRef.current = panOnEmptyClick; }, [panOnEmptyClick]);

  const syncGrid = useCallback((canvas: fabric.Canvas) => {
    const vpt = canvas.viewportTransform!;
    setGridOffset({ x: vpt[4], y: vpt[5] });
    setGridZoom(canvas.getZoom());
  }, []);

  const pendingSaveRef = useRef<string | null>(null);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current && page.id) {
        const toSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        globalPendingWhiteboardSaves[page.id] = toSave;
        extractAndStoreImagesFromJson(JSON.parse(toSave)).then(optimized => {
           updatePage(page.id!, { content: JSON.stringify(optimized) }).then(() => {
              if (globalPendingWhiteboardSaves[page.id!] === toSave) {
                 delete globalPendingWhiteboardSaves[page.id!];
              }
           }).catch(console.error);
        });
      }
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
      clearBlobCache();
    };
  }, [page.id, updatePage]);

  const saveStateToDB = useCallback((jsonStr: string) => {
    if (!page.id) return;
    pendingSaveRef.current = jsonStr;
    globalPendingWhiteboardSaves[page.id] = jsonStr;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(async () => {
      const toSave = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (toSave) {
        try {
          const optimized = await extractAndStoreImagesFromJson(JSON.parse(toSave));
          await updatePage(page.id!, { content: JSON.stringify(optimized) });
          if (globalPendingWhiteboardSaves[page.id!] === toSave) {
             delete globalPendingWhiteboardSaves[page.id!];
          }
        } catch (error) {
          console.error(error);
        }
      }
    }, 1000);
  }, [page.id, updatePage]);

  const CUSTOM_FABRIC_PROPERTIES = [
    'bookmarkUrl', 'internalPageId', 'internalPageType', 'id', 'fromId', 'toId', 
    'isArrow', 'fromX', 'fromY', 'toX', 'toY',
    'pdfProtocolUrl', 'pdfStartPage', 'pdfEndPage', 'pdfCurrentPage', 'pdfPageCount', 'pdfPageNum', 'pdfIsSingleViewer', 'pdfPages'
  ];


  const restorePdfObjectsOnCanvas = useCallback(async (canvas: fabric.Canvas) => {
    const objects = canvas.getObjects();
    for (const obj of objects) {
      const pdfUrlProtocol = (obj as any).pdfProtocolUrl;
      if (pdfUrlProtocol) {
        // If image element is already valid and loaded, skip heavy re-render to prevent lag
        const el = (obj as any)._element;
        if (el && el.src && el.src.length > 100 && el.complete) {
          continue;
        }

        try {
          const pdfUrl = await resolvePdfUrl(pdfUrlProtocol);
          if (pdfUrl) {
            const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
            const pdf = await loadingTask.promise;
            const pageNum = (obj as any).pdfCurrentPage || (obj as any).pdfPageNum || (obj as any).pdfStartPage || 1;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.2 });

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            const ctx = tempCanvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            await page.render({ canvasContext: ctx, viewport, canvas: tempCanvas }).promise;

            const imgUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
            const imgEl = new Image();
            imgEl.onload = () => {
              (obj as any).setElement(imgEl);
              canvas.renderAll();
            };
            imgEl.src = imgUrl;

            // Immediately free canvas memory
            tempCanvas.width = 0;
            tempCanvas.height = 0;
          }
        } catch (err) {
          console.error('Error restoring PDF canvas object on mount:', err);
        }
      }
    }
    canvas.renderAll();
  }, []);


  const pushToHistory = useCallback(() => {
    if (!fabricRef.current || isHistoryUpdate.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON(CUSTOM_FABRIC_PROPERTIES));
    
    setUndoStack(prev => {
      const newStack = [...prev, json];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setRedoStack([]);
    saveStateToDB(json);
  }, [saveStateToDB]);

  const handleUndo = useCallback(() => {
    if (undoStack.length <= 1 || !fabricRef.current) return;
    
    isHistoryUpdate.current = true;
    const canvas = fabricRef.current;
    
    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    
    canvas.loadFromJSON(previousState, async () => {
      await restorePdfObjectsOnCanvas(canvas);
      canvas.renderAll();
      syncGrid(canvas);
      saveStateToDB(previousState);
      isHistoryUpdate.current = false;
    });
  }, [undoStack, saveStateToDB, syncGrid, restorePdfObjectsOnCanvas]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !fabricRef.current) return;
    
    isHistoryUpdate.current = true;
    const canvas = fabricRef.current;
    
    const nextState = redoStack[redoStack.length - 1];
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, nextState]);
    
    canvas.loadFromJSON(nextState, async () => {
      await restorePdfObjectsOnCanvas(canvas);
      canvas.renderAll();
      syncGrid(canvas);
      saveStateToDB(nextState);
      isHistoryUpdate.current = false;
    });
  }, [redoStack, saveStateToDB, syncGrid, restorePdfObjectsOnCanvas]);


  // ─── Canvas Initialization ───
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      isDrawingMode: false,
      selection: true,
      backgroundColor: 'transparent',
      allowTouchScrolling: false,
    });
    fabricRef.current = canvas;

    let isDisposed = false;

    const contentToLoad = (page.id && globalPendingWhiteboardSaves[page.id]) ? globalPendingWhiteboardSaves[page.id] : page.content;
    if (contentToLoad && contentToLoad !== '[]') {
      try {
        resolveImagesInJson(JSON.parse(contentToLoad)).then(resolvedObj => {
          if (isDisposed) return;
          isHistoryUpdate.current = true;
          canvas.loadFromJSON(resolvedObj, async () => {
            if (isDisposed) return;
            await restorePdfObjectsOnCanvas(canvas);
            canvas.renderAll();
            syncGrid(canvas);
            setUndoStack([JSON.stringify(canvas.toJSON(CUSTOM_FABRIC_PROPERTIES))]);
            isHistoryUpdate.current = false;
          });
        });
      } catch (e) {
        console.error('Failed to load whiteboard content:', e);
      }
    } else {
       setUndoStack([JSON.stringify(canvas.toJSON(CUSTOM_FABRIC_PROPERTIES))]);
    }


    // Auto-save listeners
    canvas.on('object:modified', pushToHistory);
    canvas.on('text:changed', pushToHistory);
    canvas.on('object:added', (e) => {
        if (e.target && !(e.target as any).id) {
            (e.target as any).set('id', `obj_${Math.random().toString(36).substr(2, 9)}`);
        }
        if (isDrawing.current) return; 
        pushToHistory();
    });
    canvas.on('object:removed', pushToHistory);
    
    // Selection & Hover listeners for floating action toolbar
    canvas.on('selection:created', (e) => handleSelectObject(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => handleSelectObject(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => handleSelectObject(null));
    let mouseMoveRaf: number | null = null;
    canvas.on('mouse:move', (opt) => {
      if (mouseMoveRaf) return;
      mouseMoveRaf = requestAnimationFrame(() => {
        mouseMoveRaf = null;
        const active = canvas.getActiveObject();
        if (!active) return;

        const target = opt.target;
        const isOverActive = Boolean(target && (target === active || (active.type === 'activeSelection' && (active as any).contains?.(target))));

        if (isOverActive) {
          showToolbar();
        } else {
          scheduleHideToolbar();
        }
      });
    });




    
    // Smart Snapping and Arrows
    canvas.on('object:moving', (e) => {
       const movedObj = e.target;
       if (!movedObj) return;
       
       // Snap to grid (20px)
       const snap = 20;
       if (movedObj.left !== undefined) movedObj.set('left', Math.round(movedObj.left / snap) * snap);
       if (movedObj.top !== undefined) movedObj.set('top', Math.round(movedObj.top / snap) * snap);

       if (!(movedObj as any).id) return;
          canvas.getObjects().forEach(obj => {
           if ((obj as any).isArrow) {
               let fromX = (obj as any).fromX;
               let fromY = (obj as any).fromY;
               let changed = false;
               
               if ((obj as any).fromId === (movedObj as any).id) {
                   const center = movedObj.getCenterPoint();
                   fromX = center.x;
                   fromY = center.y;
                   (obj as any).fromX = fromX;
                   (obj as any).fromY = fromY;
                   changed = true;
               }
               
               let toX = (obj as any).toX;
               let toY = (obj as any).toY;
               if ((obj as any).toId === (movedObj as any).id) {
                   const center = movedObj.getCenterPoint();
                   toX = center.x;
                   toY = center.y;
                   (obj as any).toX = toX;
                   (obj as any).toY = toY;
                   changed = true;
               }

               if (changed) {
                  const pathStr = createArrowPathStr(fromX, fromY, toX, toY);
                  const tempPath = new fabric.Path(pathStr);
                  (obj as any).set({ 
                      path: tempPath.path as any,
                      left: tempPath.left,
                      top: tempPath.top,
                      width: tempPath.width,
                      height: tempPath.height,
                      pathOffset: tempPath.pathOffset
                  });
                  obj.setCoords();
               }
           }
       });
    });
    
    // Object selection tracking
    const updateSelectedObjects = () => {
      const activeObject = canvas.getActiveObject();
      
      // Link tracking
      if (activeObject && ((activeObject as any).bookmarkUrl || (activeObject as any).internalPageId)) {
        setSelectedLinkObj(activeObject);
      } else {
        setSelectedLinkObj(null);
      }
    };
    canvas.on('selection:created', updateSelectedObjects);
    canvas.on('selection:updated', updateSelectedObjects);
    canvas.on('selection:cleared', updateSelectedObjects);



    // ── Zoom (scroll wheel) ──

    canvas.on('mouse:wheel', (opt) => {
      const e = opt.e;
      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.998 ** delta;
      zoom = Math.max(0.05, Math.min(20, zoom));
      canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      e.preventDefault();
      e.stopPropagation();
      syncGrid(canvas);
    });

    // ── Pan (Alt+drag, middle-click, Space+drag, Hand tool, or empty space click) ──
    canvas.on('mouse:down', (opt) => {
      const e = opt.e as MouseEvent;
      // Allow panning with Alt+Drag, Middle-click (1), Right-click (2), Space+Drag, or Grab tool
      if (e.altKey || e.button === 1 || e.button === 2 || spaceHeld.current || activeToolRef.current === 'grab') {
        isPanning.current = true;
        canvas.selection = false;
        canvas.isDrawingMode = false;
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        lastPosX.current = e.clientX;
        lastPosY.current = e.clientY;
        canvas.defaultCursor = 'grabbing';
        canvas.setCursor('grabbing');
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isPanning.current) return;
      const e = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform!;
      vpt[4] += e.clientX - lastPosX.current;
      vpt[5] += e.clientY - lastPosY.current;
      canvas.requestRenderAll();
      lastPosX.current = e.clientX;
      lastPosY.current = e.clientY;
      syncGrid(canvas);
    });

    canvas.on('mouse:up', () => {
      if (isPanning.current) {
        isPanning.current = false;
        canvas.setViewportTransform(canvas.viewportTransform!);
        canvas.selection = activeToolRef.current === 'select';
        canvas.isDrawingMode = activeToolRef.current === 'pencil' && !spaceHeld.current;
        const tool = activeToolRef.current;
        const cursor = tool === 'grab' ? 'grab' : tool === 'select' ? 'default' : (tool === 'eraser' ? 'cell' : 'crosshair');
        canvas.defaultCursor = cursor;
        canvas.setCursor(cursor);
      }
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if we are typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      
      const activeObject = fabricRef.current?.getActiveObject();
      const isTextEditing = activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox') && (activeObject as any).isEditing;
      if (isTextEditing) return;

      if (e.code === 'Space' && !spaceHeld.current) {
        spaceHeld.current = true;
        if (fabricRef.current && activeToolRef.current !== 'grab') {
          fabricRef.current.isDrawingMode = false;
          fabricRef.current.defaultCursor = 'grab';
          fabricRef.current.setCursor('grab');
        }
        e.preventDefault();
      }
      
      // Single key tools
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setActiveTool('select');
        else if (key === 'p') setActiveTool('pencil');
        else if (key === 't') setActiveTool('text');
        else if (key === 'h') setActiveTool('grab');
        else if (key === 'r') setActiveTool('rectangle');
        else if (key === 'c') setActiveTool('circle');
        else if (key === 'l') setActiveTool('line');
        else if (key === 'a') setActiveTool('arrow');
        else if (key === 'e') setActiveTool('eraser');
      }

      // Copy / Paste shortcuts
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
           activeObject.clone((cloned: fabric.Object) => {
               const json = cloned.toJSON(['bookmarkUrl', 'internalPageId', 'internalPageType', 'id', 'fromId', 'toId', 'isArrow', 'fromX', 'fromY', 'toX', 'toY']);
               navigator.clipboard.writeText(JSON.stringify({ type: 'bergson-wb', data: json })).catch(console.error);
           });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        navigator.clipboard.readText().then(text => {
           try {
              const parsed = JSON.parse(text);
              if (parsed.type === 'bergson-wb' && parsed.data) {
                 fabric.util.enlivenObjects([parsed.data], (objects: fabric.Object[]) => {
                    const obj = objects[0];
                    if (obj) {
                        obj.set({
                            left: (obj.left || 0) + 20,
                            top: (obj.top || 0) + 20,
                            evented: true,
                        });
                        if (obj.type === 'activeSelection') {
                            obj.canvas = canvas;
                            (obj as fabric.ActiveSelection).forEachObject(sub => {
                                canvas.add(sub);
                            });
                            obj.setCoords();
                            canvas.setActiveObject(obj);
                        } else {
                            canvas.add(obj);
                            canvas.setActiveObject(obj);
                        }
                        canvas.requestRenderAll();
                        pushToHistory();
                    }
                 }, '');
              }
           } catch (err) {}
        }).catch(console.error);
      }

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        handleRedo();
        e.preventDefault();
      }
      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeToolRef.current === 'select') {
         const activeObjects = canvas.getActiveObjects();
         if (activeObjects.length > 0) {
             activeObjects.forEach(obj => canvas.remove(obj));
             canvas.discardActiveObject();
             canvas.requestRenderAll();
         }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        if (fabricRef.current && activeToolRef.current !== 'grab') {
          const tool = activeToolRef.current;
          fabricRef.current.isDrawingMode = tool === 'pencil';
          const cursor = tool === 'select' ? 'default' : (tool === 'eraser' ? 'cell' : 'crosshair');
          fabricRef.current.defaultCursor = cursor;
          fabricRef.current.setCursor(cursor);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && fabricRef.current) {
        fabricRef.current.setWidth(containerRef.current.clientWidth);
        fabricRef.current.setHeight(containerRef.current.clientHeight);
        fabricRef.current.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Prevent async operations (like image loading in loadFromJSON) from throwing if they finish after dispose
      canvas.renderAll = () => canvas;
      canvas.clearContext = () => canvas;
      
      try {
        canvas.dispose();
      } catch (e) {
        // Ignore dispose errors
      }
      fabricRef.current = null;
    };
  }, [page.id, handleSelectObject, pushToHistory, restorePdfObjectsOnCanvas, syncGrid]);



  // ─── Tool Switching & Color ───
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'pencil';
    canvas.selection = activeTool === 'select';
    
    let cursor = 'crosshair';
    if (activeTool === 'select') cursor = 'default';
    if (activeTool === 'grab') cursor = 'grab';
    if (activeTool === 'eraser') cursor = 'cell';
    
    canvas.defaultCursor = cursor;

    // Apply color to selected objects if active tool is select
    if (activeTool === 'select') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            let modified = false;
            activeObjects.forEach(obj => {
               if (obj.type === 'path' || obj.type === 'line' || obj.type === 'rect' || obj.type === 'circle') {
                   if(obj.type === 'rect' || obj.type === 'circle') {
                        // For shapes, we use color for stroke, keep fill transparent. Or maybe fill? Let's use stroke.
                        if (obj.stroke !== activeColor) {
                            obj.set('stroke', activeColor);
                            modified = true;
                        }
                   } else {
                       if (obj.stroke !== activeColor) {
                           obj.set('stroke', activeColor);
                           modified = true;
                       }
                   }
               } else if (obj.type === 'i-text') {
                   if (obj.fill !== activeColor) {
                       obj.set('fill', activeColor);
                       modified = true;
                   }
               }
            });
            if (modified) {
                canvas.requestRenderAll();
                pushToHistory();
            }
        }
    }

    canvas.getObjects().forEach(obj => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select' || activeTool === 'eraser';
    });

    if (activeTool === 'pencil') {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = 3;
    }

    const handleMouseDown = (o: fabric.IEvent) => {
      if (isPanning.current || spaceHeld.current) return;
      const tool = activeToolRef.current;
      const color = activeColorRef.current;
      
      if (tool === 'select' || tool === 'pencil' || tool === 'image' || tool === 'grab') return;

      if (tool === 'eraser') {
          if (o.target) {
              canvas.remove(o.target);
              canvas.requestRenderAll();
          }
          return;
      }

      const pointer = canvas.getPointer(o.e);
      isDrawing.current = true;
      startPos.current = { x: pointer.x, y: pointer.y };

      const fillTransparent = 'transparent';

      if (tool === 'rectangle') {
        const rect = new fabric.Rect({
          left: pointer.x, top: pointer.y, width: 0, height: 0,
          fill: fillTransparent, stroke: color, strokeWidth: 2,
          selectable: false, evented: false,
        });
        shapeRef.current = rect;
        canvas.add(rect);
      } else if (tool === 'circle') {
        const circle = new fabric.Circle({
          left: pointer.x, top: pointer.y, radius: 0,
          fill: fillTransparent, stroke: color, strokeWidth: 2,
          selectable: false, evented: false,
        });
        shapeRef.current = circle;
        canvas.add(circle);
      } else if (tool === 'diamond') {
        const points = [
          { x: pointer.x + 60, y: pointer.y },
          { x: pointer.x + 120, y: pointer.y + 60 },
          { x: pointer.x + 60, y: pointer.y + 120 },
          { x: pointer.x, y: pointer.y + 60 }
        ];
        const diamond = new fabric.Polygon(points, {
          left: pointer.x, top: pointer.y,
          fill: fillTransparent, stroke: color, strokeWidth: 2,
          selectable: true, evented: true,
        });
        canvas.add(diamond);
        canvas.setActiveObject(diamond);
        setActiveTool('select');
        isDrawing.current = false;
        pushToHistory();
      } else if (tool === 'cylinder') {
        const cylinder = new fabric.Rect({
          left: pointer.x, top: pointer.y, width: 140, height: 90,
          rx: 16, ry: 16,
          fill: fillTransparent, stroke: color, strokeWidth: 2,
          selectable: true, evented: true,
        });
        canvas.add(cylinder);
        canvas.setActiveObject(cylinder);
        setActiveTool('select');
        isDrawing.current = false;
        pushToHistory();
      } else if (tool === 'line') {

        const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: color, strokeWidth: 2, selectable: false, evented: false,
        });
        shapeRef.current = line;
        canvas.add(line);
      } else if (tool === 'arrow') {
        let fromX = pointer.x;
        let fromY = pointer.y;
        let fromId = null;
        if (o.target && o.target.type !== 'path') { // Don't snap to other arrows easily
            const center = o.target.getCenterPoint();
            fromX = center.x;
            fromY = center.y;
            fromId = (o.target as any).id;
        }
        const pathStr = createArrowPathStr(fromX, fromY, pointer.x, pointer.y);
        const path = new fabric.Path(pathStr, {
          fill: '', stroke: color, strokeWidth: 2, 
          selectable: true, evented: true, lockMovementX: true, lockMovementY: true
        });
        (path as any).isArrow = true;
        (path as any).fromId = fromId;
        (path as any).fromX = fromX;
        (path as any).fromY = fromY;
        (path as any).toX = pointer.x;
        (path as any).toY = pointer.y;
        shapeRef.current = path;
        canvas.add(path);
      } else if (tool === 'text') {
        const text = new fabric.IText('Text...', {
          left: pointer.x, top: pointer.y,
          fill: color, fontFamily: 'Inter, sans-serif', fontSize: 20,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool('select');
        isDrawing.current = false;
        pushToHistory();
      } else if (tool === 'sticky') {
        const sticky = new fabric.Textbox('Note...', {
          left: pointer.x, top: pointer.y, width: 220,
          fontSize: 16, fontFamily: 'Inter, sans-serif',
          fill: '#1a1a1a', backgroundColor: '#fef08a',
          padding: 16, splitByGrapheme: true,
        });
        canvas.add(sticky);
        canvas.setActiveObject(sticky);
        sticky.enterEditing();
        sticky.selectAll();
        setActiveTool('select');
        isDrawing.current = false;
        pushToHistory();
      } else if (tool === 'bookmark') {
        setActiveTool('select');
        isDrawing.current = false;
        const url = window.prompt('Enter website URL to bookmark:');
        if (!url) return;
        
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }

        const loadingText = new fabric.IText('Loading bookmark...', {
          left: pointer.x, top: pointer.y,
          fontSize: 16, fill: '#888', fontFamily: 'Inter', selectable: false
        });
        canvas.add(loadingText);
        
        fetch(`https://api.microlink.io?url=${encodeURIComponent(finalUrl)}`)
          .then(res => res.json())
          .then(data => {
            canvas.remove(loadingText);
            const titleStr = data.data?.title || finalUrl;
            const rect = new fabric.Rect({
              width: 300, height: 70, fill: isDarkMode ? '#252525' : '#f4f4f5', rx: 8, ry: 8, stroke: '#444', strokeWidth: 1
            });
            const title = new fabric.Text(titleStr.length > 35 ? titleStr.substring(0, 35) + '...' : titleStr, {
              left: 16, top: 14, fontSize: 15, fill: isDarkMode ? '#fff' : '#1a1a1a', fontFamily: 'Inter', fontWeight: 'bold'
            });
            const link = new fabric.Text(finalUrl.length > 40 ? finalUrl.substring(0, 40) + '...' : finalUrl, {
              left: 16, top: 38, fontSize: 12, fill: isDarkMode ? '#888' : '#666', fontFamily: 'Inter'
            });
            const group = new fabric.Group([rect, title, link], {
              left: pointer.x, top: pointer.y
            });
            (group as any).bookmarkUrl = finalUrl;
            canvas.add(group);
            pushToHistory();
          })
          .catch(() => {
            canvas.remove(loadingText);
          });
      } else if (tool === 'page-link') {
        setActiveTool('select');
        isDrawing.current = false;
        setPageSelectPos({ x: pointer.x, y: pointer.y });
      }
    };

    const handleMouseMove = (o: fabric.IEvent) => {
      if (!isDrawing.current || !shapeRef.current || isPanning.current) return;
      const pointer = canvas.getPointer(o.e);
      const sx = startPos.current.x;
      const sy = startPos.current.y;
      const tool = activeToolRef.current;

      if (tool === 'rectangle') {
        (shapeRef.current as fabric.Rect).set({
          left: Math.min(pointer.x, sx), top: Math.min(pointer.y, sy),
          width: Math.abs(pointer.x - sx), height: Math.abs(pointer.y - sy),
        });
      } else if (tool === 'circle') {
        const r = Math.max(Math.abs(pointer.x - sx), Math.abs(pointer.y - sy)) / 2;
        (shapeRef.current as fabric.Circle).set({
          left: Math.min(pointer.x, sx), top: Math.min(pointer.y, sy), radius: r,
        });
      } else if (tool === 'line') {
        (shapeRef.current as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
      } else if (tool === 'arrow') {
        const pathObj = shapeRef.current as fabric.Path;
        const fromX = (pathObj as any).fromX;
        const fromY = (pathObj as any).fromY;
        const pathStr = createArrowPathStr(fromX, fromY, pointer.x, pointer.y);
        const tempPath = new fabric.Path(pathStr);
        pathObj.set({ 
            path: tempPath.path as any,
            left: tempPath.left,
            top: tempPath.top,
            width: tempPath.width,
            height: tempPath.height,
            pathOffset: tempPath.pathOffset
        });
        (pathObj as any).toX = pointer.x;
        (pathObj as any).toY = pointer.y;
      }
      canvas.renderAll();
    };

    const handleMouseUp = (o: fabric.IEvent) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const pointer = canvas.getPointer(o.e);
      
      if (shapeRef.current) {
        if (activeToolRef.current === 'arrow') {
            const pathObj = shapeRef.current as fabric.Path;
            if (o.target && o.target !== pathObj) {
                const center = o.target.getCenterPoint();
                (pathObj as any).toId = (o.target as any).id;
                (pathObj as any).toX = center.x;
                (pathObj as any).toY = center.y;
                const pathStr = createArrowPathStr((pathObj as any).fromX, (pathObj as any).fromY, center.x, center.y);
                const tempPath = new fabric.Path(pathStr);
                pathObj.set({ 
                    path: tempPath.path as any,
                    left: tempPath.left,
                    top: tempPath.top,
                    width: tempPath.width,
                    height: tempPath.height,
                    pathOffset: tempPath.pathOffset
                });
            } else {
               // Check if it's too small (click without drag)
               if (Math.abs(pointer.x - (pathObj as any).fromX) < 5 && Math.abs(pointer.y - (pathObj as any).fromY) < 5) {
                   canvas.remove(pathObj);
                   shapeRef.current = null;
                   return;
               }
            }
        }
        
        if (shapeRef.current) {
            shapeRef.current.setCoords();
            shapeRef.current = null;
            pushToHistory();
        }
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    canvas.on('mouse:dblclick', (o) => {
      const target = o.target as any;
      if (!target || activeToolRef.current !== 'select') return;
      
      if (target.bookmarkUrl) {
        window.open(target.bookmarkUrl, '_blank');
      } else if (target.internalPageId) {
        window.location.hash = target.internalPageType === 'page' 
          ? `#/page/${target.internalPageId}` 
          : `#/whiteboard/${target.internalPageId}`;
      }
    });

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:dblclick');
    };
  }, [activeTool, activeColor, pushToHistory]);

  // ─── Actions ───
  const handleClear = () => {
    if (!fabricRef.current) return;
    if (confirm('Are you sure you want to clear the whiteboard?')) {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = 'transparent';
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setGridOffset({ x: 0, y: 0 });
      setGridZoom(1);
      pushToHistory();
    }
  };

  const handleImageSelect = async (file: File) => {
    if (!fabricRef.current) return;
    try {
      const dataUrl = await compressImage(file);
      
      fabric.Image.fromURL(dataUrl, (img) => {
        if (img.width! > 800) img.scaleToWidth(800);
        const canvas = fabricRef.current!;
        const vpt = canvas.viewportTransform!;
        const center = canvas.getCenter();
        img.set({
          left: (center.left - vpt[4]) / vpt[0],
          top: (center.top - vpt[5]) / vpt[0],
          originX: 'center', originY: 'center',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setActiveTool('select');
        pushToHistory();
      });
    } catch (error) {
      console.error('Failed to process image:', error);
    }
  };

  const handlePdfSelect = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      setPdfPageCount(pdf.numPages);
      setSelectedPdfFile(file);
      setPdfModalOpen(true);
    } catch (err) {
      console.error('Failed to read PDF:', err);
      toast.error('Failed to read PDF file');
    }
  };


  const handleConfirmPdfImport = async (options: PdfImportOptions) => {
    if (!selectedPdfFile || !fabricRef.current) return;
    const { pages, layoutMode } = options;
    if (pages.length === 0) return;

    try {
      const res = await storePdfToDB(selectedPdfFile, pdfPageCount);
      const pdfUrl = await resolvePdfUrl(res.protocolUrl);

      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      const pdf = await loadingTask.promise;
      const canvas = fabricRef.current!;
      const vpt = canvas.viewportTransform!;
      const center = canvas.getCenter();

      const startX = (center.left - vpt[4]) / vpt[0];
      const startY = (center.top - vpt[5]) / vpt[0];

      if (layoutMode === 'separate-cards') {
        // Import each selected page as a separate Fabric Image card side-by-side!
        let currentX = startX;
        for (let i = 0; i < pages.length; i++) {
          const pageNum = pages[i];
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;
          const ctx = tempCanvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas: tempCanvas }).promise;

          const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
          tempCanvas.width = 0;
          tempCanvas.height = 0;

          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(dataUrl, (img) => {
              if (img.width! > 550) img.scaleToWidth(550);
              (img as any).set({
                left: currentX,
                top: startY,
                originX: 'center', originY: 'center',
                pdfProtocolUrl: res.protocolUrl,
                pdfPageNum: pageNum,
                pdfPageCount: pdfPageCount,
                pdfIsSingleViewer: false
              });
              canvas.add(img);
              currentX += (img.width! * (img.scaleX || 1)) + 40;
              resolve();
            });
          });
        }
        canvas.renderAll();
        setActiveTool('select');
        pushToHistory();
        toast.success(`Imported ${pages.length} PDF page card(s) to Whiteboard`);
      } else {
        // Single Document Viewer mode
        const firstPage = pages[0];
        const lastPage = pages[pages.length - 1];
        const page = await pdf.getPage(firstPage);
        const viewport = page.getViewport({ scale: 1.2 });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas: tempCanvas }).promise;

        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
        tempCanvas.width = 0;
        tempCanvas.height = 0;

        fabric.Image.fromURL(dataUrl, (img) => {
          if (img.width! > 700) img.scaleToWidth(700);
          (img as any).set({
            left: startX,
            top: startY,
            originX: 'center', originY: 'center',
            pdfProtocolUrl: res.protocolUrl,
            pdfPages: pages,
            pdfStartPage: firstPage,
            pdfEndPage: lastPage,
            pdfCurrentPage: firstPage,
            pdfPageCount: pdfPageCount,
            pdfIsSingleViewer: true
          });


          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          setActiveTool('select');
          pushToHistory();
          toast.success(`Imported PDF document (${pages.length} pages)`);
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to embed PDF');
    }
  };

  const changePdfPageOnWhiteboard = async (obj: any, target: 'prev' | 'next' | number) => {
    if (!obj || !obj.pdfProtocolUrl) return;

    try {
      const pdfUrl = await resolvePdfUrl(obj.pdfProtocolUrl);
      if (!pdfUrl) {
        toast.error('PDF file data not found in storage');
        return;
      }

      const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      const pdf = await loadingTask.promise;
      const totalPages = obj.pdfPageCount || pdf.numPages;

      const allowedPages: number[] = obj.pdfPages && Array.isArray(obj.pdfPages) && obj.pdfPages.length > 0
        ? obj.pdfPages
        : Array.from({ length: obj.pdfEndPage ? (obj.pdfEndPage - (obj.pdfStartPage || 1) + 1) : totalPages }, (_, i) => (obj.pdfStartPage || 1) + i);

      const current = obj.pdfCurrentPage || allowedPages[0] || 1;
      const currentIndex = allowedPages.indexOf(current) !== -1 ? allowedPages.indexOf(current) : 0;

      let newIndex = currentIndex;
      if (target === 'next') newIndex = Math.min(allowedPages.length - 1, currentIndex + 1);
      else if (target === 'prev') newIndex = Math.max(0, currentIndex - 1);
      else if (typeof target === 'number') {
        const foundIdx = allowedPages.indexOf(target);
        if (foundIdx !== -1) {
          newIndex = foundIdx;
        } else if (target >= 1 && target <= allowedPages.length) {
          newIndex = target - 1;
        } else {
          newIndex = allowedPages.reduce((closestIdx, p, idx) => {
            return Math.abs(p - target) < Math.abs(allowedPages[closestIdx] - target) ? idx : closestIdx;
          }, 0);
        }
      }


      const newPage = allowedPages[newIndex];
      if (newPage === current && typeof target === 'string') return;

      const page = await pdf.getPage(newPage);
      const viewport = page.getViewport({ scale: 1.2 });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas: tempCanvas }).promise;

      const imgUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
      const imgEl = new Image();
      imgEl.onload = () => {
        obj.setElement(imgEl);
        obj.pdfCurrentPage = newPage;
        obj.pdfPageCount = totalPages;
        fabricRef.current?.renderAll();
        pushToHistory();
        setUpdateCounter(prev => prev + 1);
      };
      imgEl.src = imgUrl;

      // Free canvas memory
      tempCanvas.width = 0;
      tempCanvas.height = 0;

    } catch (err) {
      console.error('Failed to change PDF page:', err);
      toast.error('Failed to change PDF page');
    }
  };

  const handleExportPDF = () => {



    if (!fabricRef.current) return;
    
    // Temporarily reset viewport to capture everything
    const canvas = fabricRef.current;
    
    // Create a temporary clone to not disturb the current view if needed
    // But for a whiteboard, maybe capturing the current visible area is what they want?
    // Actually, capturing the bounding box of all objects is better.
    
    // Let's get the bounding box of all objects
    const objects = canvas.getObjects();
    if (objects.length === 0) {
       toast.error('Whiteboard is empty');
       return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
       const bound = obj.getBoundingRect(true, true);
       minX = Math.min(minX, bound.left);
       minY = Math.min(minY, bound.top);
       maxX = Math.max(maxX, bound.left + bound.width);
       maxY = Math.max(maxY, bound.top + bound.height);
    });
    
    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Temporarily add a solid background and reset viewport
    const originalBg = canvas.backgroundColor;
    const originalVpt = canvas.viewportTransform;
    canvas.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    if (originalVpt) {
       canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    }
    canvas.renderAll();

    // Prevent exceeding browser canvas limits (typically 16k)
    const maxDimension = 16000;
    const multiplier = Math.min(2, maxDimension / width, maxDimension / height);

    // Generate image from specific area
    const dataUrl = canvas.toDataURL({
       format: 'png',
       multiplier: multiplier,
       left: minX,
       top: minY,
       width: width,
       height: height
    });

    // Restore background and viewport
    canvas.backgroundColor = originalBg;
    if (originalVpt) {
       canvas.viewportTransform = originalVpt;
    }
    canvas.renderAll();
    
    const pdf = new jsPDF({
       orientation: width > height ? 'landscape' : 'portrait',
       unit: 'px',
       format: [width, height]
    });
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    pdf.save(`${title || 'Whiteboard'}.pdf`);
    toast.success('Exported to PDF successfully');
  };

  const handleExportImage = () => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    // Deselect objects for a clean export
    canvas.discardActiveObject();
    
    // Get bounding box
    const objects = canvas.getObjects();
    if (objects.length === 0) {
       toast.error('Whiteboard is empty');
       return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
       const bound = obj.getBoundingRect(true, true);
       minX = Math.min(minX, bound.left);
       minY = Math.min(minY, bound.top);
       maxX = Math.max(maxX, bound.left + bound.width);
       maxY = Math.max(maxY, bound.top + bound.height);
    });
    
    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    const width = maxX - minX;
    const height = maxY - minY;

    // Temporarily add a solid background and reset viewport
    const originalBg = canvas.backgroundColor;
    const originalVpt = canvas.viewportTransform;
    canvas.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    if (originalVpt) {
       canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    }
    canvas.renderAll();

    // Prevent exceeding browser canvas limits (typically 16k)
    const maxDimension = 16000;
    const multiplier = Math.min(2, maxDimension / width, maxDimension / height);

    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: multiplier,
      left: minX,
      top: minY,
      width: width,
      height: height
    });

    // Restore background and viewport
    canvas.backgroundColor = originalBg;
    if (originalVpt) {
       canvas.viewportTransform = originalVpt;
    }
    canvas.renderAll();

    const link = document.createElement('a');
    link.download = `${title || 'Whiteboard'}-HighRes.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Exported to Image successfully');
  };

  // ─── Grid CSS ───
  const gridSize = 40 * gridZoom;
  const gridStyle: React.CSSProperties = {
    backgroundImage: `radial-gradient(circle, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1.5px, transparent 1.5px)`,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${gridOffset.x}px ${gridOffset.y}px`,
  };

  // Dynamically update colors of bookmarks and links when theme changes
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    let hasChanges = false;
    canvas.getObjects().forEach(obj => {
      // Fix sticky notes that got the wrong color
      if (obj.type === 'textbox' && (obj as any).backgroundColor === '#fef08a') {
         obj.set('fill', '#1a1a1a');
         hasChanges = true;
      }
      // Flip default text colors dynamically
      if (obj.type === 'i-text' && (obj.fill === '#e5e5e5' || obj.fill === '#1a1a1a')) {
         obj.set('fill', isDarkMode ? '#e5e5e5' : '#1a1a1a');
         hasChanges = true;
      }
      
      // Update grouped objects (bookmarks & internal links)
      if (obj.type === 'group') {
         const group = obj as fabric.Group;
         if ((group as any).bookmarkUrl || (group as any).internalPageId) {
            group.getObjects().forEach(subObj => {
               if (subObj.type === 'rect') {
                  subObj.set('fill', isDarkMode ? '#252525' : '#f4f4f5');
                  hasChanges = true;
               } else if (subObj.type === 'text') {
                  // Title text
                  if (subObj.fill === '#fff' || subObj.fill === '#1a1a1a') {
                     subObj.set('fill', isDarkMode ? '#fff' : '#1a1a1a');
                     hasChanges = true;
                  }
               }
               // Link text
               if (subObj.fill === '#888' || subObj.fill === '#666') {
                  subObj.set('fill', isDarkMode ? '#888' : '#666');
                  hasChanges = true;
               }
            });
         }
      }
    });
    
    if (hasChanges) {
      canvas.requestRenderAll();
    }
  }, [isDarkMode]);

  return (
    <div 
      className="relative w-full h-full flex-1 overflow-hidden bg-background" 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={gridStyle} />
      
      {/* Fabric canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10" />

      {/* Floating Title / Icon / Status / Tags overlay (top-left) */}
      <div className="absolute top-4 left-5 z-20 flex flex-col pointer-events-auto w-80 bg-surface/60 backdrop-blur-md rounded-xl border border-border shadow-lg overflow-hidden">
        {/* Top row: Icon and Title */}
        <div className="flex items-start gap-2 px-3 py-3 border-b border-border/50">
          <IconPicker
            icon={page.icon}
            defaultIcon={<LayoutDashboard className="w-5 h-5 text-text-muted" />}
            onSelect={async (icon) => { await onUpdatePage({ icon }); }}
            className="shrink-0 pt-0.5"
          />
          <TextareaAutosize
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Whiteboard"
            className="text-lg font-semibold bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted w-full resize-none break-words overflow-hidden leading-tight"
            maxRows={3}
          />
        </div>
        
        {/* Bottom row: Status and Tags */}
        <div className="flex flex-col gap-2 px-3 py-2.5 bg-surface/30">
          <StatusPicker
            status={page.status}
            onSelect={async (status) => { await onUpdatePage({ status }); }}
          />
          <TagPicker
            tags={page.tags}
            onChange={async (tags) => { await onUpdatePage({ tags }); }}
          />
        </div>
      </div>

      {/* Toolbar (bottom center) */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        onClear={handleClear}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 1}
        canRedo={redoStack.length > 0}
        onImageSelect={handleImageSelect}
        onPdfSelect={handlePdfSelect}
        onExportPDF={handleExportPDF}
        onExportImage={handleExportImage}
      />
      
      <Minimap canvas={fabricRef.current} />

      <PdfImportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        file={selectedPdfFile}
        pageCount={pdfPageCount}
        onConfirmImport={handleConfirmPdfImport}
      />

      
      {activeObject && fabricRef.current && !(activeObject as any).isEditing && (
        <div 
          onMouseEnter={showToolbar}
          onMouseMove={showToolbar}
          onMouseLeave={scheduleHideToolbar}
          className={`absolute z-50 flex items-center gap-1 bg-surface border border-border shadow-xl rounded-lg p-1 transition-all duration-200 ${
            isToolbarVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}


          style={{ 
            top: `${Math.max(10, activeObject.getBoundingRect().top - 50)}px`, 
            left: `${Math.max(10, activeObject.getBoundingRect().left)}px` 
          }}
        >
          {/* Bring Forward */}
          <button
            type="button"
            className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary"
            title="Bring Forward"
            onClick={() => { fabricRef.current?.bringForward(activeObject); fabricRef.current?.renderAll(); pushToHistory(); }}
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Send Backward */}
          <button
            type="button"
            className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary"
            title="Send Backward"
            onClick={() => { fabricRef.current?.sendBackwards(activeObject); fabricRef.current?.renderAll(); pushToHistory(); }}
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Lock / Unlock */}
          <button
            type="button"
            className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary"
            title={activeObject.lockMovementX ? "Unlock Object" : "Lock Object"}
            onClick={() => { 
              const isLocked = activeObject.lockMovementX;
              activeObject.set({
                lockMovementX: !isLocked,
                lockMovementY: !isLocked,
                lockRotation: !isLocked,
                lockScalingX: !isLocked,
                lockScalingY: !isLocked,
              });
              fabricRef.current?.renderAll();
              pushToHistory();
              setUpdateCounter(prev => prev + 1);
            }}
          >
            {activeObject.lockMovementX ? <Lock className="w-4 h-4 text-accent" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Duplicate Object */}
          <button
            type="button"
            className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary"
            title="Duplicate Object"
            onClick={handleDuplicateObject}
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete Object */}
          <button
            type="button"
            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
            title="Delete Object"
            onClick={handleDeleteObject}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Contextual Actions per Object Type */}
          {(() => {
            // PDF Tools
            const isPdf = Boolean((activeObject as any).pdfProtocolUrl);
            if (isPdf) {
              const isSplitCard = (activeObject as any).pdfIsSingleViewer === false || Boolean((activeObject as any).pdfPageNum);
              if (isSplitCard) {
                return (
                  <>
                    <div className="w-px h-5 bg-border mx-0.5" />
                    <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded select-none whitespace-nowrap">
                      Page {(activeObject as any).pdfPageNum || (activeObject as any).pdfCurrentPage || 1}
                    </span>
                  </>
                );
              }

              const allowedPages: number[] | null = (activeObject as any).pdfPages && Array.isArray((activeObject as any).pdfPages) && (activeObject as any).pdfPages.length > 0
                ? (activeObject as any).pdfPages
                : null;

              const currentP = (activeObject as any).pdfCurrentPage || (activeObject as any).pdfStartPage || 1;
              const startP = (activeObject as any).pdfStartPage || 1;
              const endP = (activeObject as any).pdfEndPage || (activeObject as any).pdfPageCount || 1;

              const isFirst = allowedPages ? allowedPages.indexOf(currentP) <= 0 : currentP <= startP;
              const isLast = allowedPages ? allowedPages.indexOf(currentP) >= allowedPages.length - 1 : currentP >= endP;

              const displayLabel = allowedPages
                ? `Page ${currentP} (${allowedPages.indexOf(currentP) + 1} of ${allowedPages.length})`
                : `Page ${currentP} of ${endP}`;

              return (
                <>
                  <div className="w-px h-5 bg-border mx-0.5" />
                  <button
                    type="button"
                    className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary disabled:opacity-30"
                    title="Previous PDF Page"
                    disabled={isFirst}
                    onClick={() => changePdfPageOnWhiteboard(activeObject, 'prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = window.prompt(`Jump directly to page number:`, String(currentP));
                      if (input) {
                        const pageNum = parseInt(input, 10);
                        if (!isNaN(pageNum)) {
                          changePdfPageOnWhiteboard(activeObject, pageNum);
                        }
                      }
                    }}
                    className="text-xs font-semibold px-2 py-0.5 hover:bg-surface-hover rounded transition-colors text-text-primary hover:text-primary select-none whitespace-nowrap cursor-pointer flex items-center gap-1 border border-transparent hover:border-border/60"
                    title="Click to jump directly to any page number"
                  >
                    <span>{displayLabel}</span>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 hover:bg-surface-hover rounded transition-colors text-text-primary disabled:opacity-30"
                    title="Next PDF Page"
                    disabled={isLast}
                    onClick={() => changePdfPageOnWhiteboard(activeObject, 'next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              );
            }

            // Image Crop Tool
            const isImage = (activeObject as any).type === 'image' && !(activeObject as any).pdfProtocolUrl;
            if (isImage) {
              return (
                <>
                  <div className="w-px h-5 bg-border mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setCroppingImageObj(activeObject as fabric.Image)}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-surface-hover text-text-primary text-xs rounded transition-colors font-medium"
                    title="Crop Image"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Crop</span>
                  </button>
                </>
              );
            }

            // Bookmark / Page Link Tool
            const isLink = Boolean((activeObject as any).bookmarkUrl || (activeObject as any).internalPageId);
            if (isLink) {
              return (
                <>
                  <div className="w-px h-5 bg-border mx-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      if ((activeObject as any).bookmarkUrl) {
                        window.open((activeObject as any).bookmarkUrl, '_blank');
                      } else if ((activeObject as any).internalPageId) {
                        navigate((activeObject as any).internalPageType === 'page' 
                          ? `/app/page/${(activeObject as any).internalPageId}` 
                          : `/app/whiteboard/${(activeObject as any).internalPageId}`);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs rounded hover:bg-accent/90 transition-colors font-medium"
                    title="Open Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </button>
                </>
              );
            }

            return null;
          })()}
        </div>
      )}






      {/* Header overlay */}
      {selectedLinkObj && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button 
            onClick={() => {
              if (selectedLinkObj.bookmarkUrl) {
                const url = window.prompt('Enter new website URL to bookmark:', selectedLinkObj.bookmarkUrl);
                if (!url) return;
                let finalUrl = url.trim();
                if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
                
                const left = selectedLinkObj.left;
                const top = selectedLinkObj.top;
                
                if (fabricRef.current) {
                  fabricRef.current.remove(selectedLinkObj);
                }
                
                const loadingText = new fabric.IText('Loading bookmark...', {
                  left, top, fontSize: 16, fill: '#888', fontFamily: 'Inter', selectable: false
                });
                fabricRef.current?.add(loadingText);
                
                fetch(`https://api.microlink.io?url=${encodeURIComponent(finalUrl)}`)
                  .then(res => res.json())
                  .then(data => {
                    fabricRef.current?.remove(loadingText);
                    const titleStr = data.data?.title || finalUrl;
                    const rect = new fabric.Rect({
                      width: 300, height: 70, fill: isDarkMode ? '#252525' : '#f4f4f5', rx: 8, ry: 8, stroke: '#444', strokeWidth: 1
                    });
                    const title = new fabric.Text(titleStr.length > 35 ? titleStr.substring(0, 35) + '...' : titleStr, {
                      left: 16, top: 14, fontSize: 15, fill: '#fff', fontFamily: 'Inter', fontWeight: 'bold'
                    });
                    const link = new fabric.Text(finalUrl.length > 40 ? finalUrl.substring(0, 40) + '...' : finalUrl, {
                      left: 16, top: 38, fontSize: 12, fill: '#888', fontFamily: 'Inter'
                    });
                    const group = new fabric.Group([rect, title, link], { left, top });
                    (group as any).bookmarkUrl = finalUrl;
                    fabricRef.current?.add(group);
                    fabricRef.current?.setActiveObject(group);
                    pushToHistory();
                  })
                  .catch(() => fabricRef.current?.remove(loadingText));
              } else if (selectedLinkObj.internalPageId) {
                setEditingLinkObj(selectedLinkObj);
              }
            }}
            className="flex items-center gap-2 bg-surface-hover text-text-primary border border-border px-4 py-2 rounded-lg shadow-lg hover:bg-surface-hover transition-colors font-medium text-sm"
          >
            Edit
          </button>
          <button 
            onClick={() => {
              if (selectedLinkObj.bookmarkUrl) {
                window.open(selectedLinkObj.bookmarkUrl, '_blank');
              } else if (selectedLinkObj.internalPageId) {
                navigate(selectedLinkObj.internalPageType === 'page' 
                  ? `/app/page/${selectedLinkObj.internalPageId}` 
                  : `/app/whiteboard/${selectedLinkObj.internalPageId}`);
              }
            }}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg shadow-lg hover:bg-accent/90 transition-colors font-medium text-sm"
          >
            Open Link
          </button>
        </div>
      )}
      {editingLinkObj && (
        <PageSelectModal
          isOpen={true}
          onClose={() => setEditingLinkObj(null)}
          onSelect={(selectedPage) => {
            if (fabricRef.current && selectedPage.id) {
              const left = editingLinkObj.left;
              const top = editingLinkObj.top;
              fabricRef.current.remove(editingLinkObj);

              const rect = new fabric.Rect({
                width: 250, height: 44, fill: isDarkMode ? '#252525' : '#f4f4f5', rx: 8, ry: 8, stroke: '#555', strokeWidth: 1
              });
              const iconText = new fabric.Text(selectedPage.type === 'page' ? '📄' : '⬜', {
                left: 14, top: 12, fontSize: 16
              });
              const titleStr = selectedPage.title;
              const title = new fabric.Text(titleStr.length > 25 ? titleStr.substring(0, 25) + '...' : titleStr, {
                left: 42, top: 13, fontSize: 15, fill: isDarkMode ? '#fff' : '#1a1a1a', fontFamily: 'Inter', fontWeight: 'bold'
              });
              const group = new fabric.Group([rect, iconText, title], { left, top });
              (group as any).internalPageId = selectedPage.id;
              (group as any).internalPageType = selectedPage.type;
              
              fabricRef.current.add(group);
              fabricRef.current.setActiveObject(group);
              pushToHistory();
            }
            setEditingLinkObj(null);
          }}
        />
      )}
      {croppingImageObj && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setCroppingImageObj(null)}
          imageSrc={croppingImageObj.getSrc()}
          onComplete={(base64, cropDetails) => {
            if (fabricRef.current) {
              const oldImg = croppingImageObj;
              let left = oldImg.left || 0;
              let top = oldImg.top || 0;
              const scaleX = oldImg.scaleX || 1;
              const scaleY = oldImg.scaleY || 1;
              const angle = oldImg.angle || 0;

              if (cropDetails) {
                 const rad = (angle * Math.PI) / 180;
                 const dx = cropDetails.x * scaleX;
                 const dy = cropDetails.y * scaleY;
                 
                 left += dx * Math.cos(rad) - dy * Math.sin(rad);
                 top += dx * Math.sin(rad) + dy * Math.cos(rad);
              }

              fabric.Image.fromURL(base64, (newImg) => {
                newImg.set({
                  left,
                  top,
                  scaleX,
                  scaleY,
                  angle,
                  originX: oldImg.originX,
                  originY: oldImg.originY,
                });
                
                fabricRef.current?.remove(oldImg);
                fabricRef.current?.add(newImg);
                fabricRef.current?.setActiveObject(newImg);
                fabricRef.current?.renderAll();
                pushToHistory();
                
                setCroppingImageObj(null);
              });
            } else {
              setCroppingImageObj(null);
            }
          }}
        />
      )}
      {pageSelectPos && (
        <PageSelectModal
          isOpen={true}
          onClose={() => setPageSelectPos(null)}
          onSelect={(selectedPage) => {
            if (fabricRef.current && selectedPage.id) {
              const rect = new fabric.Rect({
                width: 250, height: 44, fill: isDarkMode ? '#252525' : '#f4f4f5', rx: 8, ry: 8, stroke: '#555', strokeWidth: 1
              });
              const iconText = new fabric.Text(selectedPage.type === 'page' ? '📄' : '⬜', {
                left: 14, top: 12, fontSize: 16
              });
              const titleStr = selectedPage.title;
              const title = new fabric.Text(titleStr.length > 25 ? titleStr.substring(0, 25) + '...' : titleStr, {
                left: 42, top: 13, fontSize: 15, fill: isDarkMode ? '#fff' : '#1a1a1a', fontFamily: 'Inter', fontWeight: 'bold'
              });
              const group = new fabric.Group([rect, iconText, title], {
                left: pageSelectPos.x, top: pageSelectPos.y
              });
              (group as any).internalPageId = selectedPage.id;
              (group as any).internalPageType = selectedPage.type;
              
              fabricRef.current.add(group);
              pushToHistory();
            }
            setPageSelectPos(null);
          }}
        />
      )}
    </div>
  );
};
