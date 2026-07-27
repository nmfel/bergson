import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, Star, Folder, Search, Activity, CalendarDays, X, Leaf, PenTool } from 'lucide-react';
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

  const handleQuickJournal = async () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const journalTitle = `Journal: ${today}`;
    
    // Check if journal for today already exists
    const existing = pages.find(p => p.title === journalTitle && p.type === 'page');
    if (existing) {
      navigate(getPageUrl(existing));
    } else {
      const page = await createPage({ title: journalTitle, type: 'page' });
      navigate(getPageUrl(page));
    }
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

  const renderCard = (page: Page) => {
    const Icon = page.type === 'whiteboard' ? LayoutDashboard : FileText;
    const colorClass = page.type === 'whiteboard' ? 'text-purple-400' : 'text-blue-400';
    
    return (
      <div 
        key={page.id} 
        onClick={() => navigate(getPageUrl(page))}
        className="group relative flex flex-col gap-4 p-5 cursor-pointer overflow-hidden rounded-[20px] border border-border/40 bg-surface/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-accent/40 hover:bg-surface/50"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="flex items-start justify-between gap-3 z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-background/60 border border-border/30 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {page.icon ? (
                <span className="text-xl leading-none">{page.icon}</span>
              ) : (
                <Icon className={cn("w-5 h-5 transition-colors", colorClass, "group-hover:text-accent")} />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-text-primary group-hover:text-accent transition-colors truncate">{page.title}</span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">
                {page.type === 'page' ? 'Document' : 'Whiteboard'}
              </span>
            </div>
          </div>
          {page.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/20 shrink-0 mt-1" />}
        </div>
        
        <div className="text-[10px] text-text-muted flex justify-between mt-auto pt-3 border-t border-border/20 z-10">
          <span className="flex items-center gap-1.5 font-mono"><CalendarDays className="w-3.5 h-3.5" /> {new Date(page.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background selection:bg-accent/20 flex flex-col">
      <div className="max-w-5xl w-full mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-20">
        
        {/* Organic Header */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 text-accent text-xs font-mono border border-accent/15">
              <Leaf className="w-3.5 h-3.5 text-accent animate-pulse" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl font-serif">
              {greeting}, User.
            </h1>
          </div>

          {/* Quick Info & Stats */}
          <div className="bg-surface/30 border border-border/30 rounded-[24px] p-5 flex flex-col gap-3 min-w-[220px] shadow-sm relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-bl-full pointer-events-none" />
            <div className="text-xs uppercase tracking-wider text-text-muted font-mono">Your Digital Garden</div>
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold font-serif text-text-primary">{stats.pages}</span>
                <span className="text-[10px] text-text-muted">Pages</span>
              </div>
              <div className="w-px h-8 bg-border/40" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold font-serif text-text-primary">{stats.whiteboards}</span>
                <span className="text-[10px] text-text-muted">Whiteboards</span>
              </div>
            </div>
            <Button 
              onClick={handleQuickJournal} 
              variant="outline" 
              className="mt-2 w-full rounded-xl border-accent/30 hover:border-accent hover:bg-accent/5 text-accent hover:text-accent gap-2 text-xs py-1.5 font-medium"
            >
              <PenTool className="w-3.5 h-3.5" /> Capture Today
            </Button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
            <input 
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Recall a thought, concept or board..."
              className="w-full bg-surface/20 hover:bg-surface/40 focus:bg-background border border-border/40 focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all rounded-2xl h-11 pl-11 pr-11 text-text-primary placeholder:text-text-muted/70 outline-none shadow-sm text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {!searchQuery && (
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded bg-background px-1.5 font-mono text-[9px] font-medium text-text-muted/70 border border-border/50 pointer-events-none">
                <span>⌘</span>K
              </kbd>
            )}
          </div>
          <div className="flex gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <Button variant="outline" className="rounded-xl border-border/40 hover:border-blue-400/40 hover:bg-blue-400/5 hover:text-blue-400 gap-2 shrink-0 text-xs py-1.5" onClick={() => handleOpenCreateModal('page')}>
              <FileText className="w-3.5 h-3.5" /> New Page
            </Button>
            <Button variant="outline" className="rounded-xl border-border/40 hover:border-purple-400/40 hover:bg-purple-400/5 hover:text-purple-400 gap-2 shrink-0 text-xs py-1.5" onClick={() => handleOpenCreateModal('whiteboard')}>
              <LayoutDashboard className="w-3.5 h-3.5" /> New Whiteboard
            </Button>
          </div>
        </div>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 ml-1 font-mono">
              <Star className="w-3.5 h-3.5 text-yellow-400" /> Favorites
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favorites.slice(0, 4).map(page => renderCard(page))}
            </div>
          </div>
        )}

        {/* Recent Pages Section */}
        {recentPages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2 ml-1 font-mono">
              <Activity className="w-3.5 h-3.5 text-accent" /> Recently Visited
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recentPages.slice(0, 4).map(page => renderCard(page))}
            </div>
          </div>
        )}

        {/* All Documents Section */}
        <div className="space-y-6 pt-4 border-t border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider ml-1 font-mono">
              Knowledge Base
            </h2>
            <div className="flex gap-1 p-1 bg-surface/20 rounded-xl border border-border/40 inline-flex w-fit overflow-x-auto hide-scrollbar backdrop-blur-sm">
              <button 
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap", activeTab === 'all' ? "bg-background shadow-sm text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-background/55")}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button 
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap", activeTab === 'page' ? "bg-blue-400/10 text-blue-400 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-background/55")}
                onClick={() => setActiveTab('page')}
              >
                Pages
              </button>
              <button 
                className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap", activeTab === 'whiteboard' ? "bg-purple-400/10 text-purple-400 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-background/55")}
                onClick={() => setActiveTab('whiteboard')}
              >
                Whiteboards
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center text-text-muted py-12 text-sm font-mono animate-pulse">Retrieving garden records...</div>
          ) : filteredPages.length === 0 ? (
            <div className="bg-surface/20 border border-border/30 rounded-[24px] text-center py-16 flex flex-col items-center justify-center backdrop-blur-sm">
              <Folder className="w-10 h-10 text-text-muted mb-4 opacity-40" />
              <p className="text-text-primary font-medium">No documents found</p>
              <p className="text-text-muted max-w-sm mt-2 text-xs">Get started by creating a new document using the actions above.</p>
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
