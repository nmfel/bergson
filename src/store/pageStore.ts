import { create } from 'zustand';
import type { Page } from '../types';

interface PageState {
  pages: Page[];
  activePageId: string | null;
  searchQuery: string;
  expandedItems: string[];
  isLoading: boolean;
  
  // Actions
  setPages: (pages: Page[]) => void;
  setActivePage: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleExpand: (id: string) => void;
  addPage: (page: Page) => void;
  updatePage: (id: string, data: Partial<Page>) => void;
  deletePage: (id: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export const usePageStore = create<PageState>((set) => ({
  pages: [],
  activePageId: null,
  searchQuery: '',
  expandedItems: [],
  isLoading: true,

  setPages: (pages) => set({ pages }),
  
  setActivePage: (id) => set({ activePageId: id }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleExpand: (id) => set((state) => ({
    expandedItems: state.expandedItems.includes(id)
      ? state.expandedItems.filter(item => item !== id)
      : [...state.expandedItems, id]
  })),
  
  addPage: (page) => set((state) => ({
    pages: [...state.pages, page],
    // Expand parent if it exists when adding a sub-page
    expandedItems: page.parentId && !state.expandedItems.includes(page.parentId) 
      ? [...state.expandedItems, page.parentId] 
      : state.expandedItems
  })),
  
  updatePage: (id, data) => set((state) => ({
    pages: state.pages.map(page => 
      page.id === id ? { ...page, ...data, updatedAt: new Date() } : page
    )
  })),
  
  deletePage: (id) => set((state) => {
    // Also remove children recursively in a real app, but for store state we just filter
    // For simplicity, we just filter the exact id. DB handles cascade.
    return {
      pages: state.pages.filter(page => page.id !== id),
      activePageId: state.activePageId === id ? null : state.activePageId,
      expandedItems: state.expandedItems.filter(item => item !== id)
    };
  }),
  
  setIsLoading: (isLoading) => set({ isLoading })
}));
