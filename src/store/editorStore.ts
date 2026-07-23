import { create } from 'zustand';
import type { Block } from '../types';

interface EditorState {
  blocks: Block[];
  activeBlockId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setBlocks: (blocks: Block[]) => void;
  addBlock: (block: Block, index?: number) => void;
  updateBlock: (id: string, data: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  reorderBlocks: (blockIds: string[]) => void;
  setActiveBlock: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  blocks: [],
  activeBlockId: null,
  isLoading: false,
  error: null,

  setBlocks: (blocks) => set({ blocks: blocks.sort((a, b) => a.order - b.order) }),

  addBlock: (block, index) => set((state) => {
    const newBlocks = [...state.blocks];
    if (typeof index === 'number') {
      newBlocks.splice(index, 0, block);
    } else {
      newBlocks.push(block);
    }
    // Update order for all
    const updatedBlocks = newBlocks.map((b, i) => ({ ...b, order: i }));
    return { blocks: updatedBlocks };
  }),

  updateBlock: (id, data) => set((state) => ({
    blocks: state.blocks.map(b => (b.id === id ? { ...b, ...data } : b))
  })),

  deleteBlock: (id) => set((state) => {
    const newBlocks = state.blocks.filter(b => b.id !== id);
    return { 
      blocks: newBlocks.map((b, i) => ({ ...b, order: i })),
      activeBlockId: state.activeBlockId === id ? null : state.activeBlockId
    };
  }),

  reorderBlocks: (blockIds) => set((state) => {
    const blocksMap = new Map(state.blocks.map(b => [b.id, b]));
    const newBlocks = blockIds.map((id, index) => {
      const b = blocksMap.get(id)!;
      return { ...b, order: index };
    });
    return { blocks: newBlocks };
  }),

  setActiveBlock: (id) => set({ activeBlockId: id }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
}));
