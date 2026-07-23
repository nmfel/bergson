import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Search, FileText, LayoutDashboard, X } from 'lucide-react';
import type { Page } from '../../types';

interface PageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: Page) => void;
}

export const PageSelectModal: React.FC<PageSelectModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { pageRepository } = useDatabase();
  const [pages, setPages] = useState<Page[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPages();
      setQuery('');
    }
  }, [isOpen]);

  const loadPages = async () => {
    const allPages = await pageRepository.getAllPages();
    // Exclude folders
    setPages(allPages.filter(p => p.type === 'page' || p.type === 'whiteboard'));
  };

  const filteredPages = pages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-popover border border-border w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Link to Page</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              autoFocus
              placeholder="Search pages or whiteboards..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[300px] p-2 custom-scrollbar">
          {filteredPages.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No pages found matching "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredPages.map(page => (
                <button
                  key={page.id}
                  onClick={() => onSelect(page)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg text-left hover:bg-surface-hover group transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-surface-hover flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
                    {page.type === 'page' ? <FileText className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{page.title}</div>
                    <div className="text-xs text-text-muted truncate">
                      {page.type === 'page' ? 'Document' : 'Whiteboard'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
