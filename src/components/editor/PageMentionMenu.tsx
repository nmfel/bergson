import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { FileText, LayoutDashboard } from 'lucide-react';
import type { Page } from '../../types';

interface PageMentionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (page: Page) => void;
  position: { top: number; left: number };
  query: string;
}

export const PageMentionMenu: React.FC<PageMentionMenuProps> = ({ isOpen, onClose, onSelect, position, query }) => {
  const { pageRepository } = useDatabase();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedTop, setAdjustedTop] = useState(position.top);

  useEffect(() => {
    if (isOpen) {
      loadPages();
    }
  }, [isOpen]);

  const loadPages = async () => {
    const allPages = await pageRepository.getAllPages();
    setPages(allPages.filter(p => p.type === 'page' || p.type === 'whiteboard'));
  };

  const filteredPages = pages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));

  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (position.top + rect.height > window.innerHeight) {
        setAdjustedTop(Math.max(10, position.top - rect.height - 35));
      } else {
        setAdjustedTop(position.top);
      }
    }
  }, [isOpen, position.top, filteredPages.length]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredPages.length === 0) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredPages.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredPages.length) % filteredPages.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filteredPages[selectedIndex]);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, selectedIndex, onSelect, onClose, filteredPages]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden py-1 flex flex-col max-h-[300px]"
      style={{ top: adjustedTop, left: position.left }}
    >
      <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0">
        Link to Page
      </div>
      <div className="overflow-y-auto flex-1 overscroll-contain">
        {filteredPages.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-muted">No pages found</div>
        ) : (
          filteredPages.map((page, idx) => (
            <button
              key={page.id}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left
                ${idx === selectedIndex ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}
              `}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(page);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {page.type === 'page' ? <FileText className="w-4 h-4 shrink-0" /> : <LayoutDashboard className="w-4 h-4 shrink-0" />}
              <span className="truncate">{page.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
