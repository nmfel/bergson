import { useEffect, useCallback } from 'react';
import { usePageStore } from '../store/pageStore';
import { useDatabase } from './useDatabase';

export const useSidebar = () => {
  const store = usePageStore();
  const setPages = usePageStore(state => state.setPages);
  const setIsLoading = usePageStore(state => state.setIsLoading);
  const { pageRepository } = useDatabase();

  const loadPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const pages = await pageRepository.getAllPages();
      setPages(pages);
    } catch (error) {
      console.error('Failed to load pages', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageRepository, setPages, setIsLoading]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  return {
    ...store,
    loadPages,
    pageRepository // Exposed for direct DB operations if needed
  };
};
