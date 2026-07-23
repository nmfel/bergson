import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageManagement } from '@/hooks/usePageManagement';
import { useSidebar } from '@/hooks/useSidebar';
import type { Page } from '@/types';

export const TrashPage: React.FC = () => {
  const { getTrashedPages, restorePage, permanentDeletePage, emptyTrash } = usePageManagement();
  const { loadPages, pages } = useSidebar();
  const [trashedPages, setTrashedPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = async () => {
    // Only set loading to true if we don't have trashedPages yet to prevent flickering
    if (trashedPages.length === 0) setLoading(true);
    const result = await getTrashedPages();
    setTrashedPages(result);
    setLoading(false);
  };

  useEffect(() => {
    loadTrash();
  }, [pages]);

  const handleRestore = async (id: string) => {
    await restorePage(id);
    await loadPages();
    loadTrash();
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this page? This action cannot be undone.')) {
      await permanentDeletePage(id);
      loadTrash();
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm('Are you sure you want to empty the trash? All items will be permanently deleted.')) {
      await emptyTrash();
      loadTrash();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-5xl w-full mx-auto p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
              <Trash2 className="w-8 h-8 text-red-400" />
              Trash
            </h1>
            <p className="text-text-secondary">
              Items in trash will be automatically deleted after 30 days.
            </p>
          </div>
          
          {trashedPages.length > 0 && (
            <Button 
              variant="destructive" 
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-none gap-2"
              onClick={handleEmptyTrash}
            >
              <AlertTriangle className="w-4 h-4" />
              Empty Trash
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-text-muted py-12">Loading...</div>
        ) : trashedPages.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg text-center py-16 text-text-muted flex flex-col items-center justify-center gap-4">
            <Trash2 className="w-12 h-12 text-border" />
            <p>Trash is empty</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {trashedPages.map(page => (
                <div key={page.id} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-4">
                    {page.icon ? (
                      <span className="text-xl leading-none w-6 h-6 flex items-center justify-center">{page.icon}</span>
                    ) : page.type === 'whiteboard' ? (
                      <LayoutDashboard className="w-6 h-6 text-purple-400" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-400" />
                    )}
                    <div>
                      <div className="text-text-primary font-medium">{page.title}</div>
                      <div className="text-xs text-text-muted">
                        Deleted {page.deletedAt ? new Date(page.deletedAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-text-secondary hover:text-green-400 hover:bg-green-500/10 gap-2"
                      onClick={() => handleRestore(page.id!)}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-text-secondary hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handlePermanentDelete(page.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
