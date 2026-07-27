import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageManagement } from '@/hooks/usePageManagement';
import { useRecentPages } from '@/hooks/useRecentPages';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

const WhiteboardEditor = lazy(() => import('@/components/whiteboard/WhiteboardEditor').then(m => ({ default: m.WhiteboardEditor })));
import { useSidebar } from '@/hooks/useSidebar';
import type { Page } from '@/types';
import { toast } from 'sonner';

export const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPage, updatePage, deletePage, toggleFavorite } = usePageManagement();
  const { pages, loadPages } = useSidebar();
  const { addRecentPage } = useRecentPages();
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      if (!id) return;
      if (!page) setLoading(true);
      try {
        const data = await getPage(id);
        if (data && data.type === 'whiteboard') {
          setPage(data);
          setTitle(data.title);
          addRecentPage(id);
        } else {
          toast.error("Whiteboard not found");
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
  }, [id, getPage, navigate, addRecentPage]);

  // Auto-save title
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (page && title !== page.title) {
        await updatePage(page.id!, { title });
        setPage({ ...page, title });
        await loadPages();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, page, updatePage, loadPages]);

  // Sync title from store
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

  const handleFavorite = async () => {
    if (!page) return;
    await toggleFavorite(page.id!);
    setPage({ ...page, isFavorite: !page.isFavorite });
    await loadPages();
  };

  const handleUpdatePage = async (data: Partial<Page>) => {
    if (!page) return;
    await updatePage(page.id!, data);
    setPage({ ...page, ...data });
    await loadPages();
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-text-muted">Loading whiteboard...</div>;
  }

  if (!page) {
    return <div className="flex-1 flex items-center justify-center text-text-muted">Whiteboard not found</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Slim top bar: breadcrumb + actions only */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0 z-30">
        <Breadcrumb pageId={page.id!} />
        
        <div className="flex items-center gap-1">
          <div className="text-xs text-text-muted flex items-center gap-1 mr-3">
            <Clock className="w-3 h-3" />
            {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'recently'}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleFavorite}
            className={page.isFavorite ? "text-yellow-400 hover:text-yellow-500" : "text-text-muted hover:text-text-primary"}
          >
            <Star className={`w-4 h-4 ${page.isFavorite ? "fill-yellow-400" : ""}`} />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="text-text-muted hover:text-red-400">
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Full-bleed whiteboard */}
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Loading whiteboard editor...</div>}>
          <WhiteboardEditor
            page={page}
            title={title}
            setTitle={setTitle}
            onUpdatePage={handleUpdatePage}
          />
        </Suspense>
      </div>

      <DeleteConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={page.title}
      />
    </div>
  );
};
