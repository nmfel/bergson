import { useState, useEffect, useCallback } from 'react';
import type { Page } from '../types';
import { useDatabase } from './useDatabase';

const MAX_RECENT_PAGES = 10;
const RECENT_PAGES_KEY = 'bergson_recent_pages';

export const useRecentPages = () => {
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const { pageRepository } = useDatabase();

  const loadRecentPages = useCallback(async () => {
    try {
      const saved = localStorage.getItem(RECENT_PAGES_KEY);
      if (!saved) return;
      
      const pageIds: string[] = JSON.parse(saved);
      const loadedPages: Page[] = [];
      
      for (const id of pageIds) {
        const page = await pageRepository.getPageById(id);
        if (page) {
          loadedPages.push(page);
        }
      }
      
      setRecentPages(loadedPages);
    } catch (error) {
      console.error('Failed to load recent pages', error);
    }
  }, [pageRepository]);

  useEffect(() => {
    loadRecentPages();
  }, [loadRecentPages]);

  const addRecentPage = useCallback((pageId: string) => {
    try {
      const saved = localStorage.getItem(RECENT_PAGES_KEY);
      let pageIds: string[] = saved ? JSON.parse(saved) : [];
      
      // Remove if already exists
      pageIds = pageIds.filter(id => id !== pageId);
      
      // Add to front
      pageIds.unshift(pageId);
      
      // Trim to max
      if (pageIds.length > MAX_RECENT_PAGES) {
        pageIds = pageIds.slice(0, MAX_RECENT_PAGES);
      }
      
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(pageIds));
      // Optionally reload to update state immediately if needed, 
      // but usually only needed when viewing the homepage.
    } catch (error) {
      console.error('Failed to save recent page', error);
    }
  }, []);

  return {
    recentPages,
    addRecentPage,
    loadRecentPages
  };
};
