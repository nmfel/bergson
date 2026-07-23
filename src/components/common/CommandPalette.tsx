import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, LayoutDashboard, Hash } from 'lucide-react';
import { usePageStore } from '../../store/pageStore';
import { cn } from '../../utils';
import type { Page } from '../../types';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { pages } = usePageStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut to open (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to ensure DOM is ready before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Filter pages based on query
  const filteredPages = pages.filter(page => {
    if (page.isDeleted) return false;
    
    const searchLower = query.toLowerCase();
    
    // If querying specific tags (e.g., "#work")
    if (searchLower.startsWith('#')) {
      const tagQuery = searchLower.slice(1);
      return page.tags?.some(tag => tag.toLowerCase().includes(tagQuery));
    }
    
    // Normal search: Match title OR match tags
    const matchesTitle = page.title.toLowerCase().includes(searchLower);
    const matchesTag = page.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    
    return matchesTitle || matchesTag;
  });

  // Handle keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredPages.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedPage = filteredPages[selectedIndex];
      if (selectedPage) {
        navigateToPage(selectedPage);
      }
    }
  };

  const navigateToPage = (page: Page) => {
    setIsOpen(false);
    if (page.type === 'page') {
      navigate(`/app/page/${page.id}`);
    } else if (page.type === 'whiteboard') {
      navigate(`/app/whiteboard/${page.id}`);
    }
  };

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 sm:pt-48">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-text-primary text-lg placeholder:text-text-muted"
            placeholder="Search pages or type # to search tags..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="text-xs text-text-muted font-mono bg-surface-hover px-1.5 py-0.5 rounded ml-2">ESC</div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredPages.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              No results found.
            </div>
          ) : (
            filteredPages.map((page, index) => {
              const isSelected = index === selectedIndex;
              
              let Icon = FileText;
              if (page.type === 'whiteboard') Icon = LayoutDashboard;

              return (
                <div
                  key={page.id}
                  onClick={() => navigateToPage(page)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-accent/10" : "hover:bg-surface-hover"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {page.icon ? (
                      <span className="text-xl w-5 flex justify-center">{page.icon}</span>
                    ) : (
                      <Icon className={cn("w-5 h-5", isSelected ? "text-accent" : "text-text-muted")} />
                    )}
                    <span className={cn(
                      "font-medium",
                      isSelected ? "text-accent" : "text-text-primary"
                    )}>
                      {page.title || 'Untitled'}
                    </span>
                  </div>
                  
                  {/* Tags Preview */}
                  {page.tags && page.tags.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {page.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-surface-hover text-text-muted px-1.5 py-0.5 rounded border border-border/50">
                          <Hash className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                      {page.tags.length > 3 && (
                        <span className="text-[10px] text-text-muted">+{page.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-surface-hover text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <span className="font-mono bg-surface border border-border px-1 rounded">↑</span>
            <span className="font-mono bg-surface border border-border px-1 rounded">↓</span>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono bg-surface border border-border px-1 rounded">Enter</span>
            <span>Open</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="font-mono bg-surface border border-border px-1 rounded">#</span>
            <span>Search tags</span>
          </div>
        </div>
      </div>
    </div>
  );
};
