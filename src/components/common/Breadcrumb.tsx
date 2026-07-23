import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebar';
import { getPageUrl } from '../../utils/navigation';
import type { Page } from '../../types';

export const Breadcrumb: React.FC<{ pageId: string }> = ({ pageId }) => {
  const { pages } = useSidebar();
  const [path, setPath] = useState<Page[]>([]);

  useEffect(() => {
    const buildPath = (id: string, currentPath: Page[] = []): Page[] => {
      const page = pages.find(p => p.id === id);
      if (!page) return currentPath;
      
      const newPath = [page, ...currentPath];
      if (page.parentId) {
        return buildPath(page.parentId, newPath);
      }
      return newPath;
    };

    setPath(buildPath(pageId));
  }, [pageId, pages]);

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-text-muted select-none">
      <NavLink to="/app" className="hover:text-text-primary transition-colors flex items-center">
        <Home className="w-4 h-4" />
      </NavLink>
      {path.map((page, idx) => (
        <React.Fragment key={page.id}>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <NavLink 
            to={getPageUrl(page)} 
            className={`hover:text-text-primary transition-colors truncate max-w-[150px] ${idx === path.length - 1 ? 'text-text-primary font-medium' : ''}`}
          >
            {page.title}
          </NavLink>
        </React.Fragment>
      ))}
    </div>
  );
};
