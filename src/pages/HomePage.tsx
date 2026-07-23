import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, Star, Folder, Search, Clock, Activity, CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/useSidebar';
import { useRecentPages } from '@/hooks/useRecentPages';
import { getPageUrl } from '@/utils/navigation';
import { CreatePageModal } from '@/components/common/CreatePageModal';
import { usePageManagement } from '@/hooks/usePageManagement';
import { cn } from '@/utils';
import type { Page } from '@/types';

export const HomePage: React.FC = () => {
  const { pages, isLoading } = useSidebar();
  const { recentPages } = useRecentPages();
  const { createPage } = usePageManagement();
  const favorites = pages.filter(p => p.isFavorite);
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'page' | 'whiteboard'>('page');
  const [activeTab, setActiveTab] = useState<'all' | 'page' | 'whiteboard'>('all');
  const [greeting, setGreeting] = useState('Good day');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const handleNewPage = () => {
      setCreateType('page');
      setIsCreateModalOpen(true);
    };
    const handleNewWhiteboard = () => {
      setCreateType('whiteboard');
      setIsCreateModalOpen(true);
    };

    window.addEventListener('shortcut:new-page', handleNewPage);
    window.addEventListener('shortcut:new-whiteboard', handleNewWhiteboard);
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      window.removeEventListener('shortcut:new-page', handleNewPage);
      window.removeEventListener('shortcut:new-whiteboard', handleNewWhiteboard);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleOpenCreateModal = (type: 'page' | 'whiteboard') => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const handleCreate = async (data: { title: string; type: 'page' | 'whiteboard' }) => {
    const page = await createPage(data);
    setIsCreateModalOpen(false);
    navigate(getPageUrl(page));
  };

  const stats = useMemo(() => {
    return {
      pages: pages.filter(p => p.type === 'page').length,
      whiteboards: pages.filter(p => p.type === 'whiteboard').length,
    };
  }, [pages]);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (activeTab !== 'all') {
      result = result.filter(p => p.type === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }
    return result;
  }, [pages, activeTab, searchQuery]);


  const renderCard = (page: Page, isHero = false) => {
    const Icon = page.type === 'whiteboard' ? LayoutDashboard : FileText;
    const colorClass = page.type === 'whiteboard' ? 'text-purple-400' : 'text-blue-400';
    
    return (
      <div 
        key={page.id} 
        onClick={() => navigate(getPageUrl(page))}
        className={cn(
          "bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg hover:border-accent/30 hover:bg-surface-hover overflow-hidden relative",
          isHero && "p-6 sm:p-8 bg-gradient-to-br from-surface to-surface-hover border-accent/20 hover:border-accent/50"
        )}
      >
        {isHero && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -z-0 pointer-events-none" />
        )}
        
        <div className="flex items-start justify-between z-10 gap-3">
          <div className="flex items-center gap-3 text-text-primary font-medium flex-1 min-w-0">
            <div className={cn("w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center shrink-0 border border-border/50", isHero && "w-12 h-12 bg-background shadow-sm")}>
              {page.icon ? (
                <span className={cn("leading-none", isHero ? "text-2xl" : "text-xl")}>{page.icon}</span>
              ) : (
                <Icon className={cn("w-5 h-5", colorClass, isHero && "w-6 h-6")} />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className={cn("truncate group-hover:text-accent transition-colors", isHero && "text-lg font-semibold")}>{page.title}</span>
              {isHero && <span className="text-sm text-text-muted mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Last edited recently</span>}
            </div>
          </div>
          {page.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/20 shrink-0 mt-1" />}
        </div>
        
        {!isHero && (
          <div className="text-xs text-text-muted flex justify-between mt-auto z-10 pt-2 border-t border-border/50">
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(page.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background selection:bg-accent/20">
      <div className="max-w-5xl w-full mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-20">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
              <Activity className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              {greeting}, User.
            </h1>
            <p className="text-text-secondary text-lg">
              You have {stats.pages} pages and {stats.whiteboards} whiteboards in your brain space.
            </p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
            <input 
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your digital brain..."
              className="w-full bg-surface hover:bg-surface-hover focus:bg-background border border-border focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all rounded-xl h-12 pl-12 pr-12 text-text-primary placeholder:text-text-muted outline-none shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {!searchQuery && (
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center gap-1 rounded bg-background px-2 font-mono text-[10px] font-medium text-text-muted border border-border pointer-events-none">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <Button variant="outline" className="rounded-xl border-border hover:border-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400 gap-2 shrink-0" onClick={() => handleOpenCreateModal('page')}>
              <FileText className="w-4 h-4" /> New Page
            </Button>
            <Button variant="outline" className="rounded-xl border-border hover:border-purple-400/50 hover:bg-purple-400/10 hover:text-purple-400 gap-2 shrink-0" onClick={() => handleOpenCreateModal('whiteboard')}>
              <LayoutDashboard className="w-4 h-4" /> New Whiteboard
            </Button>
          </div>
        </div>



        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 ml-1">
              <Star className="w-4 h-4 text-yellow-400" /> Favorites
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favorites.slice(0, 4).map(page => renderCard(page))}
            </div>
          </div>
        )}

        {/* Recent Pages Section */}
        {recentPages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 ml-1">
              <Activity className="w-4 h-4 text-blue-400" /> Recently Viewed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recentPages.slice(0, 4).map(page => renderCard(page))}
            </div>
          </div>
        )}

        {/* All Documents Section */}
        <div className="space-y-6 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider ml-1">
              Knowledge Base
            </h2>
            <div className="flex gap-1 p-1 bg-surface rounded-lg border border-border inline-flex w-fit overflow-x-auto hide-scrollbar">
              <button 
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'all' ? "bg-background shadow-sm text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-background/50")}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button 
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'page' ? "bg-blue-400/10 text-blue-400 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-background/50")}
                onClick={() => setActiveTab('page')}
              >
                Pages
              </button>
              <button 
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'whiteboard' ? "bg-purple-400/10 text-purple-400 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-background/50")}
                onClick={() => setActiveTab('whiteboard')}
              >
                Whiteboards
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center text-text-muted py-12">Loading...</div>
          ) : filteredPages.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl text-center py-16 flex flex-col items-center justify-center">
              <Folder className="w-12 h-12 text-text-muted mb-4 opacity-50" />
              <p className="text-text-primary font-medium text-lg">No documents found</p>
              <p className="text-text-muted max-w-sm mt-2">Get started by creating a new document using the actions above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPages.map(page => renderCard(page))}
            </div>
          )}
        </div>
      </div>

      <CreatePageModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
        defaultType={createType}
      />
    </div>
  );
};
