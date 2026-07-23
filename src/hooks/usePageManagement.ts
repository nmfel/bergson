import { useCallback } from 'react';
import { useDatabase } from './useDatabase';
import type { Page } from '../types';
import { toast } from 'sonner';

export const usePageManagement = () => {
  const { pageRepository, blockRepository } = useDatabase();

  const createPage = useCallback(async (data: { title: string; type: 'page' | 'whiteboard'; parentId?: string }): Promise<Page> => {
    try {
      const id = await pageRepository.createPage({
        title: data.title,
        type: data.type,
        parentId: data.parentId || null,
        content: '[]',
        isFavorite: false,
      });
      toast.success(`${data.type === 'page' ? 'Page' : 'Whiteboard'} created successfully`);
      return (await pageRepository.getPageById(id)) as Page;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }, [pageRepository]);

  const updatePage = useCallback(async (id: string, data: Partial<Page>): Promise<void> => {
    try {
      await pageRepository.updatePage(id, data);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }, [pageRepository]);

  const deletePage = useCallback(async (id: string): Promise<void> => {
    try {
      await pageRepository.softDeletePage(id);
      toast.success('Moved to trash');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }, [pageRepository]);

  const restorePage = useCallback(async (id: string) => {
    try {
      await pageRepository.restorePage(id);
      toast.success("Page restored from trash");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore page");
      return false;
    }
  }, [pageRepository]);

  const permanentDeletePage = useCallback(async (id: string) => {
    try {
      await pageRepository.deletePage(id);
      toast.success("Page permanently deleted");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to permanently delete page");
      return false;
    }
  }, [pageRepository]);

  const emptyTrash = useCallback(async () => {
    try {
      const trashed = await pageRepository.getTrashedPages();
      for (const page of trashed) {
        if (page.id) await pageRepository.deletePage(page.id);
      }
      toast.success("Trash emptied");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to empty trash");
      return false;
    }
  }, [pageRepository]);

  const duplicatePage = useCallback(async (id: string): Promise<Page | undefined> => {
    try {
      const page = await pageRepository.getPageById(id);
      if (!page) return undefined;

      const newId = await pageRepository.createPage({
        title: `${page.title} (Copy)`,
        type: page.type,
        parentId: page.parentId,
        content: page.content,
        isFavorite: false,
      });

      if (page.type === 'page') {
        const blocks = await blockRepository.getBlocksByPageId(id);
        for (const block of blocks) {
          await blockRepository.createBlock({ ...block, pageId: newId });
        }
      }

      toast.success('Duplicated successfully');
      return (await pageRepository.getPageById(newId)) as Page;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }, [pageRepository, blockRepository]);

  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    try {
      const page = await pageRepository.getPageById(id);
      if (!page) return;
      await pageRepository.updatePage(id, { isFavorite: !page.isFavorite });
      if (!page.isFavorite) {
        toast.success('Added to favorites');
      } else {
        toast.success('Removed from favorites');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    }
  }, [pageRepository]);

  const getPage = useCallback(async (id: string): Promise<Page | undefined> => {
    return await pageRepository.getPageById(id);
  }, [pageRepository]);

  const getTrashedPages = useCallback(async () => {
    return await pageRepository.getTrashedPages();
  }, [pageRepository]);

  return {
    createPage,
    updatePage,
    deletePage,
    restorePage,
    permanentDeletePage,
    emptyTrash,
    getTrashedPages,
    duplicatePage,
    toggleFavorite,
    getPage
  };
};
