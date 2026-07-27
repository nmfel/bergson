import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash, Clock, FileText, Download, Link, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageManagement } from '@/hooks/usePageManagement';
import { useRecentPages } from '@/hooks/useRecentPages';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { IconPicker } from '@/components/common/IconPicker';
import { StatusPicker } from '@/components/common/StatusPicker';
import { TagPicker } from '@/components/common/TagPicker';
import { ImageCropModal } from '@/components/common/ImageCropModal';
import { useSidebar } from '@/hooks/useSidebar';
import { useSettingsStore } from '@/store/settingsStore';
import { useDatabase } from '@/hooks/useDatabase';
import { storeImageToDB, resolveImageUrl, clearBlobCache } from '@/utils/imageStorage';
import { cn } from '@/utils';
import type { Page, Block } from '@/types';
import { toast } from 'sonner';
import TextareaAutosize from 'react-textarea-autosize';

export const PageEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPage, updatePage, deletePage, toggleFavorite } = usePageManagement();
  const { pages, loadPages } = useSidebar();
  const { addRecentPage } = useRecentPages();
  const { fullWidth } = useSettingsStore();
  const { pageRepository, blockRepository } = useDatabase();
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<{ block: Block; pageTitle: string }[]>([]);
  const coverImageInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingCoverSrc, setPendingCoverSrc] = useState<string | null>(null);
  const [resolvedCoverSrc, setResolvedCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    if (page?.coverImage) {
      resolveImageUrl(page.coverImage)
        .then(url => setResolvedCoverSrc(url))
        .catch(() => setResolvedCoverSrc(null));
    } else {
      setResolvedCoverSrc(null);
    }
  }, [page?.coverImage]);

  useEffect(() => {
    const loadPage = async () => {
      if (!id) return;
      if (!page) setLoading(true);
      try {
        const data = await getPage(id);
        if (data && data.type === 'page') {
          setPage(data);
          setTitle(data.title);
          addRecentPage(id);
        } else {
          toast.error("Page not found");
          navigate('/app');
        }
      } catch (error) {
        console.error(error);
        navigate('/app');
      } finally {
        setLoading(false);
      }
    };
    loadPage();
    
    return () => {
      clearBlobCache();
    };
  }, [id, getPage, navigate, addRecentPage]);

  useEffect(() => {
    const handleNavigateToPage = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const title = customEvent.detail.title;
      const allPages = await pageRepository.getAllPages();
      const targetPage = allPages.find(p => p.title.toLowerCase() === title.toLowerCase());
      if (targetPage) {
        navigate(targetPage.type === 'page' ? `/app/page/${targetPage.id}` : `/app/whiteboard/${targetPage.id}`);
      }
    };
    window.addEventListener('navigate-to-page', handleNavigateToPage);
    return () => window.removeEventListener('navigate-to-page', handleNavigateToPage);
  }, [navigate]);

  useEffect(() => {
    const fetchBacklinks = async () => {
      if (!page) return;
      const allBlocks = await blockRepository.getAllBlocks();
      const allPages = await pageRepository.getAllPages();
      
      const links: { block: Block; pageTitle: string }[] = [];
      
      for (const block of allBlocks) {
        if (block.pageId === page.id) continue; // Skip self-references
        
        let isLink = false;
        if (block.type === 'page-link') {
            try {
               const meta = JSON.parse(block.content);
               if (meta.pageId === page.id) isLink = true;
            } catch (e) {}
        } else if (block.content && block.content.includes(`[[${page.title}]]`)) {
            isLink = true;
        }
        
        if (isLink) {
           const parentPage = allPages.find(p => p.id === block.pageId);
           if (parentPage) {
               links.push({ block, pageTitle: parentPage.title });
           }
        }
      }
      setBacklinks(links);
    };
    
    if (page && !loading) {
       fetchBacklinks();
    }
  }, [page?.id, page?.title, loading]);

  // Auto-save title
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (page && title !== page.title) {
        const oldTitle = page.title;
        await updatePage(page.id!, { title });
        
        // Auto-update all backlink blocks that used the old title
        const allBlocks = await blockRepository.getAllBlocks();
        for (const block of allBlocks) {
           if (block.content && block.content.includes(`[[${oldTitle}]]`)) {
               const newContent = block.content.replaceAll(`[[${oldTitle}]]`, `[[${title}]]`);
               await blockRepository.updateBlock(block.id!, { content: newContent });
           }
        }
        
        setPage({ ...page, title });
        await loadPages();
        // trigger a refetch of backlinks to re-render them with new title if necessary
        window.dispatchEvent(new Event('backlinks-updated'));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, page, updatePage, loadPages, blockRepository]);

  // Sync with external changes (e.g., sidebar rename)
  useEffect(() => {
    if (!id || !page) return;
    const storePage = pages.find(p => p.id === id);
    if (storePage && storePage.title !== page.title) {
      setPage(storePage);
      setTitle(storePage.title);
    }
  }, [pages, id, page]);

  const handleDelete = async () => {
    if (!page) return;
    await deletePage(page.id!);
    navigate('/app');
  };

  const handleToggleFavorite = async () => {
    if (!page) return;
    await toggleFavorite(page.id!);
    setPage({ ...page, isFavorite: !page.isFavorite });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !page) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingCoverSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  const handleCoverCropComplete = async (croppedUrl: string) => {
    if (!page) return;
    try {
      const hash = await storeImageToDB(croppedUrl);
      await updatePage(page.id!, { coverImage: hash });
      setPage({ ...page, coverImage: hash });
      await loadPages();
    } catch (err) {
      console.error('Failed to save cropped cover:', err);
      toast.error('Failed to save cover image');
    } finally {
      setPendingCoverSrc(null);
    }
  };

  const handleRemoveCover = async () => {
    if (!page) return;
    await updatePage(page.id!, { coverImage: '' });
    setPage({ ...page, coverImage: undefined });
    await loadPages();
  };

  if (loading) {
    return <div className="p-8 text-text-muted">Loading...</div>;
  }

  if (!page) return null;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header Info */}
      <div className="px-8 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <Breadcrumb pageId={page.id!} />
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-text-muted mr-4">
            <Clock className="w-3.5 h-3.5" />
            Edited {new Date(page.updatedAt).toLocaleString()}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-2"
            onClick={handleToggleFavorite}
          >
            <Star className={`w-4 h-4 ${page.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-2 print-hidden"
            onClick={() => window.print()}
            title="Export to PDF"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-text-secondary hover:text-red-400 hover:bg-red-500/10 px-2"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={coverImageInputRef} 
        onChange={handleCoverUpload}
      />

      {/* Cover Image */}
      {page.coverImage && (
        <div className="relative w-full h-48 md:h-64 group bg-surface">
          <img 
            src={resolvedCoverSrc || ''} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-background/80 backdrop-blur text-text-primary hover:bg-background shadow-sm"
              onClick={() => coverImageInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Change Cover
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="bg-background/80 backdrop-blur text-text-muted hover:text-red-400 hover:bg-background shadow-sm"
              onClick={handleRemoveCover}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className={cn(
        "w-full px-8 lg:px-12 pt-6 pb-32 animate-in fade-in duration-500 transition-all flex-1",
        fullWidth ? "max-w-none" : "max-w-4xl mx-auto",
        page.coverImage ? "-mt-10 relative z-10" : ""
      )}>
        
        {/* Optional Add Cover Button for pages without cover */}
        {!page.coverImage && (
          <div className="group/cover mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover/cover:opacity-100 transition-opacity text-text-muted hover:text-text-primary -ml-3"
              onClick={() => coverImageInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Add Cover
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 mb-4 group relative">
          <IconPicker 
            icon={page.icon} 
            defaultIcon={<FileText className="w-10 h-10 text-text-muted" />}
            onSelect={async (emoji) => {
              await updatePage(page.id!, { icon: emoji });
              setPage({ ...page, icon: emoji });
              await loadPages();
            }}
            className="p-2 -ml-2"
          />
          <TextareaAutosize
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="text-4xl font-bold bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted w-full resize-none break-words overflow-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4 pl-10">
          <StatusPicker 
            status={page.status} 
            onSelect={async (status) => {
              await updatePage(page.id!, { status });
              setPage({ ...page, status });
              await loadPages();
            }} 
          />
          <TagPicker 
            tags={page.tags}
            onChange={async (tags) => {
              await updatePage(page.id!, { tags });
              setPage({ ...page, tags });
              await loadPages();
            }}
          />
          <div className="text-sm text-text-muted">
            Last edited {page.updatedAt ? new Date(page.updatedAt).toLocaleString() : 'just now'}
          </div>
        </div>

        <div className="w-full">
          <RichTextEditor pageId={page.id!} />
        </div>

        {/* Backlinks Section */}
        {backlinks.length > 0 && (
          <div className="w-full mt-12 pt-8 border-t border-border animate-in fade-in">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Link className="w-5 h-5 text-text-muted" /> Backlinks
            </h3>
            <div className="flex flex-col gap-3">
              {backlinks.map((link, i) => (
                <div 
                  key={i} 
                  className="p-4 bg-surface rounded-xl border border-border hover:border-accent/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/app/page/${link.block.pageId}`)}
                >
                  <div className="text-sm font-medium text-accent mb-2 hover:underline">{link.pageTitle}</div>
                  <div className="text-sm text-text-secondary line-clamp-3 pl-4 border-l-2 border-border group-hover:border-accent/30 transition-colors">
                    {link.block.type === 'page-link' ? 'Page Link' : link.block.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={page.title}
        />

        <ImageCropModal 
          isOpen={!!pendingCoverSrc}
          onClose={() => setPendingCoverSrc(null)}
          imageSrc={pendingCoverSrc || ''}
          onComplete={handleCoverCropComplete}
          aspectRatio={3 / 1}
        />
      </div>
    );
  };
