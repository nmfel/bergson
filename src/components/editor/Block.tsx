import React, { useRef, useState, useEffect } from 'react';
import type { Block as BlockType } from '../../types';
import { BlockToolbar } from './BlockToolbar';
import { useMarkdownShortcuts } from '../../hooks/useMarkdownShortcuts';
import { cn } from '../../utils';
import { compressImage } from '../../utils/image';
import { storeImageToDB, resolveImageUrl } from '../../utils/imageStorage';
import { Image as ImageIcon, Plus, Link as LinkIcon, FileText, LayoutDashboard, Pencil, Crop as CropIcon } from 'lucide-react';
import { PageSelectModal } from '../common/PageSelectModal';
import { ImageCropModal } from '../common/ImageCropModal';
import { useNavigate } from 'react-router-dom';
import { TableBlock } from './TableBlock';
import { KanbanBlock } from './KanbanBlock';
import { ColumnsBlock } from './ColumnsBlock';
interface BlockProps {
  block: BlockType;
  index: number;
  isActive: boolean;
  onUpdate: (id: string, content: string, type?: BlockType['type']) => void;
  onDelete: (id: string) => void;
  onAddBelow: (id: string) => void;
  onFocus: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent, id: string, index: number) => void;
  onOpenSlashMenu: (top: number, left: number, blockId: string, query: string) => void;
  onCloseSlashMenu: () => void;
  onOpenMentionMenu: (top: number, left: number, blockId: string, query: string) => void;
  onCloseMentionMenu: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  dragOverPosition: 'top' | 'bottom' | null;
}

const BookmarkBlock: React.FC<{
  block: BlockType;
  onUpdate: (id: string, content: string, type?: BlockType['type']) => void;
  onFocus: (id: string) => void;
  contentEditableRef: React.RefObject<HTMLDivElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}> = ({ block, onUpdate, onFocus, contentEditableRef, handleKeyDown }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  let metadata: any = null;
  if (block.content) {
    try {
      metadata = JSON.parse(block.content);
    } catch {
      metadata = { url: block.content, title: block.content };
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(finalUrl)}`);
      const data = await res.json();
      if (data.status === 'success') {
        const payload = {
          url: data.data.url || finalUrl,
          title: data.data.title || finalUrl,
          description: data.data.description || '',
          image: data.data.image?.url || '',
          logo: data.data.logo?.url || ''
        };
        onUpdate(block.id!, JSON.stringify(payload));
      } else {
        onUpdate(block.id!, JSON.stringify({ url: finalUrl, title: finalUrl }));
      }
    } catch (err) {
      onUpdate(block.id!, JSON.stringify({ url: finalUrl, title: finalUrl }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!metadata) {
    return (
      <div className="w-full flex items-center bg-surface border border-border rounded-lg p-3 my-1">
        <LinkIcon className="w-5 h-5 text-text-muted mr-3 shrink-0" />
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a web link (e.g. google.com) and press Enter..."
            className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm min-w-0"
            autoFocus
          />
          <button type="submit" disabled={isLoading} className="text-xs font-medium bg-accent text-white px-3 py-1.5 rounded hover:bg-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap">
            {isLoading ? 'Loading...' : 'Add Link'}
          </button>
        </form>
        <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
      </div>
    );
  }

  const navigateToUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(metadata.url, '_blank');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.prompt("Enter new website URL to bookmark:", metadata.url);
    if (!url) return;
    
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    
    onUpdate(block.id!, '', 'link');
    fetch(`https://api.microlink.io?url=${encodeURIComponent(finalUrl)}`)
      .then(res => res.json())
      .then(data => {
        onUpdate(block.id!, JSON.stringify({
          url: finalUrl,
          title: data.data?.title || finalUrl,
          description: data.data?.description || '',
          image: data.data?.image?.url || '',
        }));
      })
      .catch(() => {
        onUpdate(block.id!, JSON.stringify({ url: finalUrl, title: finalUrl }));
      });
  };

  return (
    <div 
      className="w-full relative flex h-24 bg-surface border border-border hover:bg-surface-hover transition-colors rounded-lg overflow-hidden my-1 cursor-pointer group"
      onClick={navigateToUrl}
    >
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
        <div className="text-sm font-medium text-text-primary line-clamp-1">{metadata.title}</div>
        {metadata.description && (
          <div className="text-xs text-text-muted line-clamp-2 mt-1">{metadata.description}</div>
        )}
        <div className="text-[10px] text-text-muted mt-2 truncate flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          {metadata.url}
        </div>
      </div>
      {metadata.image && (
        <img src={metadata.image} alt={metadata.title} className="w-32 h-full object-cover shrink-0 border-l border-border" />
      )}
      
      {/* Edit Button */}
      <button 
        onClick={handleEdit}
        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all rounded-md bg-surface-hover/80 backdrop-blur-sm shadow-sm"
        title="Edit Link"
      >
        <Pencil className="w-4 h-4" />
      </button>

      <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
    </div>
  );
};

const PageLinkBlock: React.FC<{
  block: BlockType;
  onUpdate: (id: string, content: string, type?: BlockType['type']) => void;
  onFocus: (id: string) => void;
  contentEditableRef: React.RefObject<HTMLDivElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}> = ({ block, onUpdate, onFocus, contentEditableRef, handleKeyDown }) => {
  let metadata: any = null;
  if (block.content) {
    try {
      metadata = JSON.parse(block.content);
    } catch {
      metadata = null;
    }
  }

  if (!metadata) {
    return (
      <div className="w-full my-1">
        <PageSelectModal
          isOpen={true}
          onClose={() => {
            onUpdate(block.id!, '', 'text');
          }}
          onSelect={(page) => {
            onUpdate(block.id!, JSON.stringify({ pageId: page.id, title: page.title, type: page.type }));
          }}
        />
        <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
      </div>
    );
  }

  const navigate = useNavigate();

  const navigateToPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(metadata.type === 'page' ? `/app/page/${metadata.pageId}` : `/app/whiteboard/${metadata.pageId}`);
  };

  return (
    <div 
      className="w-full flex items-center gap-3 bg-surface border border-border hover:bg-surface-hover hover:border-accent/50 transition-colors rounded-lg p-3 my-1 cursor-pointer group"
      onClick={navigateToPage}
    >
      <div className="w-8 h-8 rounded-md bg-surface-hover flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
        {metadata.type === 'page' ? <FileText className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary line-clamp-1">{metadata.title}</div>
        <div className="text-xs text-text-muted">
          {metadata.type === 'page' ? 'Document' : 'Whiteboard'}
        </div>
      </div>
      
      {/* Edit Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onUpdate(block.id!, '', 'page-link'); }}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all rounded-md shrink-0"
        title="Edit Page Link"
      >
        <Pencil className="w-4 h-4" />
      </button>

      <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
    </div>
  );
};

const BlockComponent: React.FC<BlockProps> = ({
  block,
  index,
  isActive,
  onUpdate,
  onDelete,
  onAddBelow,
  onFocus,
  onKeyDown,
  onOpenSlashMenu,
  onCloseSlashMenu,
  onOpenMentionMenu,
  onCloseMentionMenu,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragOverPosition
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [resolvedImageSrc, setResolvedImageSrc] = useState<string>('');
  const [isInView, setIsInView] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const { checkShortcut } = useMarkdownShortcuts();
  
  // Lazy load observer
  useEffect(() => {
    if (block.type !== 'image') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' } // Load when within 200px of viewport
    );
    
    if (blockRef.current) observer.observe(blockRef.current);
    return () => observer.disconnect();
  }, [block.type]);

  useEffect(() => {
    if (block.type === 'image' && block.content && isInView) {
      if (block.content.startsWith('bergson-image://')) {
        resolveImageUrl(block.content).then(setResolvedImageSrc);
      } else {
        setResolvedImageSrc(block.content);
      }
    }
  }, [block.type, block.content, isInView]);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const refId = await storeImageToDB(dataUrl);
      onUpdate(block.id!, refId);
    } catch (error) {
      console.error('Failed to process image:', error);
    }
  };

  useEffect(() => {
    if (isActive && contentEditableRef.current && document.activeElement !== contentEditableRef.current) {
      contentEditableRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (sel) {
        try {
          range.selectNodeContents(contentEditableRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {
        }
      }
    }
  }, [isActive]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (isComposing.current) return;
    
    const text = e.currentTarget.textContent || '';
    
    if (text.startsWith('/')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const query = text.slice(1).toLowerCase();
      onOpenSlashMenu(rect.bottom + 8, rect.left, block.id!, query);
      onCloseMentionMenu();
    } else {
      onCloseSlashMenu();
      
      const match = text.match(/\[\[([^\]]*)$/);
      if (match) {
        const sel = window.getSelection();
        let rect = e.currentTarget.getBoundingClientRect();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          if (r.width !== 0 || r.height !== 0) {
            rect = r;
          }
        }
        onOpenMentionMenu(rect.bottom + 8, rect.left, block.id!, match[1]);
      } else {
        onCloseMentionMenu();
      }
    }

    const shortcut = checkShortcut(text, block.type);
    if (shortcut) {
      e.currentTarget.textContent = shortcut.textContent;
      onUpdate(block.id!, shortcut.textContent, shortcut.newType);
      return;
    }

    onUpdate(block.id!, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown(e, block.id!, index);
  };

  const renderContentEditable = (className: string, placeholder: string) => (
    <div 
      key="editor"
      ref={contentEditableRef}
      contentEditable
      suppressContentEditableWarning
      className={cn("outline-none min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-text-muted cursor-text break-words whitespace-pre-wrap", className)}
      data-placeholder={placeholder}
      onInput={handleInput}
      onCompositionStart={() => isComposing.current = true}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        onUpdate(block.id!, e.currentTarget.textContent || '');
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus(block.id!)}
      onBlur={() => {
        onCloseSlashMenu();
        onCloseMentionMenu();
        setIsHovered(false);
      }}
    />
  );
  
  const renderParsedContent = (className: string, placeholder: string) => {
     if (isActive) return renderContentEditable(className, placeholder);
     
     const rawText = block.content;
     if (!rawText) {
        return <div className={cn("min-h-[1.5em] cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-transparent group-hover/block:empty:before:text-text-muted/50 transition-colors", className)} data-placeholder={placeholder} onClick={() => onFocus(block.id!)}></div>;
     }
     
     const parts = rawText.split(/(\[\[.*?\]\])/g);
     
     return (
        <div key="viewer" className={cn("min-h-[1.5em] break-words whitespace-pre-wrap cursor-text", className)} onClick={() => onFocus(block.id!)}>
           {parts.map((part, i) => {
               if (part.startsWith('[[') && part.endsWith(']]')) {
                   const title = part.slice(2, -2);
                   return (
                       <span 
                           key={i} 
                           className="text-accent cursor-pointer hover:underline px-1 py-0.5 rounded bg-accent/10 transition-colors mx-0.5 inline-block"
                           onClick={(e) => {
                               e.stopPropagation();
                               const event = new CustomEvent('navigate-to-page', { detail: { title } });
                               window.dispatchEvent(event);
                           }}
                       >
                           {title}
                       </span>
                   );
               }
               return <span key={i}>{part}</span>;
           })}
           <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
        </div>
     );
  };

  useEffect(() => {
    if (block.type === 'image' || block.type === 'divider') {
      if (contentEditableRef.current) contentEditableRef.current.textContent = '';
      return;
    }
    if (contentEditableRef.current && contentEditableRef.current.textContent !== block.content) {
      contentEditableRef.current.textContent = block.content;
    }
  }, [block.type]);

  useEffect(() => {
    if (block.content === '' && contentEditableRef.current && contentEditableRef.current.textContent !== '') {
      contentEditableRef.current.textContent = '';
    }
  }, [block.content]);

  useEffect(() => {
    const handleForceUpdate = (e: any) => {
      if (e.detail.id === block.id && contentEditableRef.current) {
        contentEditableRef.current.textContent = e.detail.content;
        if (isActive) {
          const range = document.createRange();
          const sel = window.getSelection();
          if (sel) {
            try {
              range.selectNodeContents(contentEditableRef.current);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (err) {}
          }
        }
      }
    };
    window.addEventListener('force-update-block', handleForceUpdate);
    return () => window.removeEventListener('force-update-block', handleForceUpdate);
  }, [block.id, isActive]);

  const blockClasses = "relative group flex items-start pl-4 py-0.5 transition-colors";
  const activeClass = isActive ? "bg-popover/50 border-l-2 border-accent -ml-[2px]" : "hover:bg-popover/30 border-l-2 border-transparent";
  
  let dragOverClass = "";
  if (dragOverPosition === 'top') dragOverClass = "border-t-2 border-t-accent mt-[2px]";
  else if (dragOverPosition === 'bottom') dragOverClass = "border-b-2 border-b-accent mb-[2px]";

  const containerProps = {
    onDragStart,
    onDragOver,
    onDragEnd,
  };

  if (block.type === 'divider') {
    return (
      <div 
        {...containerProps}
        className={cn("group/block", blockClasses, activeClass, dragOverClass)} 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onFocus(block.id!)}
      >
        <BlockToolbar isVisible={isHovered} onDelete={() => onDelete(block.id!)} onAddBelow={() => onAddBelow(block.id!)} onCopy={() => {}} />
        <div className="w-full py-4"><hr className="border-border" /></div>
        <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
      </div>
    );
  }

  const renderInner = () => {
    switch (block.type) {
      case 'heading1': return renderParsedContent("text-4xl font-bold mt-4 mb-1", "Heading 1");
      case 'heading2': return renderParsedContent("text-3xl font-bold mt-3 mb-1", "Heading 2");
      case 'heading3': return renderParsedContent("text-2xl font-bold mt-2 mb-1", "Heading 3");
      case 'quote': return (
        <div className="border-l-4 border-accent pl-4 my-1 italic text-text-secondary w-full">
          {renderParsedContent("w-full", "Quote...")}
        </div>
      );
      case 'code': return (
        <div className="bg-popover rounded-md p-4 my-1 w-full font-mono text-sm overflow-x-auto text-blue-300">
          {renderParsedContent("w-full whitespace-pre-wrap", "Code...")}
        </div>
      );
      case 'bullet': return (
        <div className="flex items-start gap-2 w-full my-0.5">
          <span className="mt-1 text-text-primary">•</span>
          <div className="flex-1">{renderParsedContent("w-full", "List item")}</div>
        </div>
      );
      case 'numbered': return (
        <div className="flex items-start gap-2 w-full my-0.5">
          <span className="text-text-muted select-none">{index + 1}.</span>
          <div className="flex-1">{renderParsedContent("w-full", "List item")}</div>
        </div>
      );
      case 'todo': return (
        <div className="flex items-start gap-2 w-full my-0.5">
          <input 
            type="checkbox" 
            className="mt-1 accent-accent cursor-pointer"
            checked={block.content.startsWith('[x] ')}
            onChange={(e) => {
              const newContent = e.target.checked 
                ? '[x] ' + block.content.replace(/^\[x\] /, '') 
                : block.content.replace(/^\[x\] /, '');
              if (contentEditableRef.current) contentEditableRef.current.textContent = newContent;
              onUpdate(block.id!, newContent);
            }}
          />
          <div className="flex-1">{renderParsedContent("w-full", "To-do")}</div>
        </div>
      );
      case 'image':
        return (
          <div ref={blockRef} key={`image-wrapper-${block.id}`} className="w-full relative my-1">
            {!block.content ? (
              <div 
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-surface-hover cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-8 h-8 text-text-muted mb-2" />
                <span className="text-text-secondary text-sm font-medium">Click to upload image</span>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
              </div>
            ) : (
              <div className="w-full relative group inline-block min-h-[100px]">
                {resolvedImageSrc ? (
                  <img src={resolvedImageSrc} alt="Block image" className="max-w-full rounded-lg" loading="lazy" />
                ) : (
                  <div className="w-full h-32 bg-surface-hover animate-pulse rounded-lg flex items-center justify-center text-text-muted text-sm">
                    Loading image...
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setPendingImageSrc(resolvedImageSrc || block.content);
                    setCropModalOpen(true);
                  }}
                  className="flex items-center justify-center p-2 bg-surface/80 hover:bg-surface text-text-primary backdrop-blur-md rounded-md shadow-lg border border-border/50 transition-colors absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                  title="Crop Image"
                >
                  <CropIcon className="w-4 h-4" />
                </button>
    
                <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
              </div>
            )}
          </div>
        );
      case 'link':
        return (
          <BookmarkBlock 
            block={block} 
            onUpdate={onUpdate} 
            onFocus={onFocus} 
            contentEditableRef={contentEditableRef} 
            handleKeyDown={handleKeyDown} 
          />
        );
      case 'page-link':
        return (
          <PageLinkBlock 
            block={block} 
            onUpdate={onUpdate} 
            onFocus={onFocus} 
            contentEditableRef={contentEditableRef} 
            handleKeyDown={handleKeyDown} 
          />
        );
      case 'table':
        return (
          <div key={`table-${block.id}`} className="w-full relative group my-1">
            <TableBlock block={block} onUpdate={onUpdate} />
            <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
          </div>
        );
      case 'kanban':
        return (
          <div key={`kanban-${block.id}`} className="w-full relative group my-1">
            <KanbanBlock block={block} onUpdate={onUpdate} />
            <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
          </div>
        );
      case 'columns':
        return (
          <div key={`columns-${block.id}`} className="w-full relative group my-1">
            <ColumnsBlock block={block} onChange={onUpdate} autoFocus={isActive} />
            <div ref={contentEditableRef} contentEditable suppressContentEditableWarning className="hidden" onFocus={() => onFocus(block.id!)} onKeyDown={handleKeyDown}></div>
          </div>
        );
      case 'text':
      default:
        return renderParsedContent("w-full", "Type '/' for commands or '[[' for pages");
    }
  };

  return (
    <div 
      {...containerProps}
      className={cn("group/block", blockClasses, activeClass, dragOverClass)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible drop target extender for the left margin where the drag handle lives */}
      <div className="absolute -left-12 w-12 h-full top-0" />
      <BlockToolbar 
        isVisible={isHovered} 
        onDelete={() => onDelete(block.id!)} 
        onAddBelow={() => onAddBelow(block.id!)} 
        onCopy={() => {
          navigator.clipboard.writeText(JSON.stringify({ type: 'bergson-block', data: block })).catch(console.error);
        }}
      />
      <div key={block.type} className="w-full">
        {renderInner()}
      </div>
      
      {/* Quick Add Below Button */}
      <div 
        className="absolute -bottom-2 left-0 w-full h-4 z-10 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer group/add"
        onClick={(e) => {
          e.stopPropagation();
          onAddBelow(block.id!);
        }}
        title="Add block below"
      >
        <div className="absolute w-full h-px bg-accent scale-x-0 group-hover/add:scale-x-100 transition-transform origin-left"></div>
        <div className="w-5 h-5 rounded-sm bg-accent flex items-center justify-center text-white relative z-10 shadow-sm scale-75 group-hover/add:scale-100 transition-transform">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>

      <ImageCropModal 
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setPendingImageSrc(null);
        }}
        imageSrc={pendingImageSrc || ''}
        onComplete={async (croppedUrl) => {
          const refId = await storeImageToDB(croppedUrl);
          onUpdate(block.id!, refId);
          setCropModalOpen(false);
          setPendingImageSrc(null);
        }}
      />
    </div>
  );
};

export const Block = React.memo(BlockComponent, (prevProps, nextProps) => {
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.type === nextProps.block.type &&
    prevProps.block.content === nextProps.block.content &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.dragOverPosition === nextProps.dragOverPosition
  );
});
