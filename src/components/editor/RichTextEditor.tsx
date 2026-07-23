import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Block } from './Block';
import { SlashCommand } from './SlashCommand';
import { PageMentionMenu } from './PageMentionMenu';
import { useEditorStore } from '../../store/editorStore';
import { useDatabase } from '../../hooks/useDatabase';
import type { Block as BlockType } from '../../types';

interface RichTextEditorProps {
  pageId: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ pageId }) => {
  const { blocks, setBlocks, addBlock, updateBlock, activeBlockId, setActiveBlock } = useEditorStore();
  const { blockRepository } = useDatabase();
  
  const [slashMenu, setSlashMenu] = useState<{ isOpen: boolean; top: number; left: number; blockId: string | null; query: string }>({
    isOpen: false, top: 0, left: 0, blockId: null, query: ''
  });
  
  const [mentionMenu, setMentionMenu] = useState<{ isOpen: boolean; top: number; left: number; blockId: string | null; query: string }>({
    isOpen: false, top: 0, left: 0, blockId: null, query: ''
  });


  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverState, setDragOverState] = useState<{ index: number; position: 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    const loadBlocks = async () => {
      const data = await blockRepository.getBlocksByPageId(pageId);
      if (data.length === 0) {
        // Create initial empty block
        const newBlock = { pageId, type: 'text' as const, content: '', order: 0 };
        const id = await blockRepository.createBlock(newBlock);
        setBlocks([{ ...newBlock, id }]);
        setActiveBlock(id);
      } else {
        setBlocks(data);
      }
    };
    loadBlocks();
  }, [pageId, blockRepository, setBlocks, setActiveBlock]);
  const saveTimeoutsRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const pendingUpdatesRef = useRef<{ [key: string]: Partial<BlockType> }>({});

  // Flush pending saves on unmount or visibility change
  useEffect(() => {
    const flushSaves = () => {
      Object.entries(pendingUpdatesRef.current).forEach(([id, updates]) => {
        blockRepository.updateBlock(id, updates).catch(console.error);
      });
      pendingUpdatesRef.current = {};
      Object.values(saveTimeoutsRef.current).forEach(clearTimeout);
      saveTimeoutsRef.current = {};
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSaves();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushSaves();
    };
  }, []);
  const handleUpdate = useCallback((id: string, content: string, type?: BlockType['type']) => {
    const updates: Partial<BlockType> = { content };
    if (type) updates.type = type;
    
    updateBlock(id, updates);

    // Debounce save to DB per block
    pendingUpdatesRef.current[id] = { ...pendingUpdatesRef.current[id], ...updates };
    
    if (saveTimeoutsRef.current[id]) clearTimeout(saveTimeoutsRef.current[id]);
    saveTimeoutsRef.current[id] = setTimeout(async () => {
      const toSave = pendingUpdatesRef.current[id];
      delete pendingUpdatesRef.current[id];
      delete saveTimeoutsRef.current[id];
      if (toSave) {
        await blockRepository.updateBlock(id, toSave).catch(console.error);
      }
    }, 1000);
  }, [updateBlock]);

  const handleAddBelow = useCallback(async (id: string, newType: BlockType['type'] = 'text') => {
    const currentIndex = blocks.findIndex(b => b.id === id);
    const newBlock = { pageId, type: newType, content: '', order: currentIndex + 1 };
    
    // Optimistic UI
    const tempId = 'temp-' + Date.now();
    addBlock({ ...newBlock, id: tempId }, currentIndex + 1);
    setActiveBlock(tempId);

    // Save to DB and reorder
    const dbId = await blockRepository.createBlock(newBlock);
    updateBlock(tempId, { id: dbId });
    setActiveBlock(dbId);
    
    // Update order in DB
    const updatedBlocks = useEditorStore.getState().blocks;
    await blockRepository.reorderBlocks(pageId, updatedBlocks.map(b => b.id!));
  }, [blocks, pageId, addBlock, setActiveBlock, blockRepository, updateBlock]);

  const handleDelete = useCallback(async (id: string) => {
    if (blocks.length <= 1) {
      // If it's the last block, just reset it to an empty text block
      const lastBlock = blocks[0];
      if (lastBlock.type !== 'text' || lastBlock.content !== '') {
        handleUpdate(lastBlock.id!, '', 'text');
      }
      return; 
    }
    
    // Optimistic UI
    const currentIndex = blocks.findIndex(b => b.id === id);
    const newBlocks = blocks.filter(b => b.id !== id);
    useEditorStore.setState({ blocks: newBlocks });
    
    if (activeBlockId === id) {
      const nextIndex = Math.max(0, currentIndex - 1);
      setActiveBlock(newBlocks[nextIndex].id!);
    }

    // DB sync
    await blockRepository.deleteBlock(id);
    
    // Update order in DB
    const updatedBlocks = useEditorStore.getState().blocks;
    await blockRepository.reorderBlocks(pageId, updatedBlocks.map(b => b.id!));
  }, [blocks, pageId, activeBlockId, setActiveBlock, blockRepository]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Provide a space instead of the index number to absolutely guarantee no numbers can ever be pasted
      e.dataTransfer.setData('text/plain', ' ');
      e.dataTransfer.setData('application/x-bergson-block', index.toString());
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    
    // Calculate if we are in the top half or bottom half of the block
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'top' : 'bottom';

    if (!dragOverState || dragOverState.index !== index || dragOverState.position !== position) {
      setDragOverState({ index, position });
    }
  }, [dragOverState]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverState(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || !dragOverState) {
      setDraggedIndex(null);
      setDragOverState(null);
      return;
    }

    const { index: targetDropIndex, position } = dragOverState;
    
    // If dropping on itself, or if inserting logically in the same place, do nothing
    if (draggedIndex === targetDropIndex) {
      setDraggedIndex(null);
      setDragOverState(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    
    // We want to insert BEFORE the drop target if position is 'top', or AFTER if 'bottom'.
    // If we removed an item BEFORE the dropIndex, the actual index of the target
    // in the new array has shifted left by 1.
    let targetIndex = targetDropIndex;
    if (position === 'bottom') {
      targetIndex += 1;
    }
    
    // Adjust for the removed dragged block if it was before the target
    const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    
    newBlocks.splice(insertIndex, 0, draggedBlock);

    // Update orders locally
    newBlocks.forEach((block, idx) => {
      block.order = idx;
    });

    useEditorStore.setState({ blocks: newBlocks });
    setDraggedIndex(null);
    setDragOverState(null);

    // Save to DB
    await blockRepository.reorderBlocks(pageId, newBlocks.map(b => b.id!));
  }, [blocks, draggedIndex, dragOverState, pageId, blockRepository]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, index: number) => {
    if (slashMenu.isOpen || mentionMenu.isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // If code block or quote, continue same type, else text
      const currentBlock = blocks[index];
      const nextType = currentBlock.type === 'todo' ? 'todo' : 'text';
      handleAddBelow(id, nextType);
    } else if (e.key === 'Backspace') {
      const currentBlock = blocks[index];
      if (currentBlock.content === '') {
        e.preventDefault();
        // If it's an empty non-text block, convert to text first
        if (currentBlock.type !== 'text') {
          handleUpdate(id, '', 'text');
        } else {
          handleDelete(id);
        }
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setActiveBlock(blocks[index - 1].id!);
    } else if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      e.preventDefault();
      setActiveBlock(blocks[index + 1].id!);
    }
  }, [blocks, handleAddBelow, handleDelete, handleUpdate, setActiveBlock, slashMenu.isOpen, mentionMenu.isOpen]);

  const handleSlashSelect = (type: BlockType['type']) => {
    if (!slashMenu.blockId) return;
    handleUpdate(slashMenu.blockId, '', type);
    setSlashMenu(prev => ({ ...prev, isOpen: false, query: '' }));
  };

  const handleMentionSelect = (page: any) => {
    if (!mentionMenu.blockId) return;
    const block = blocks.find(b => b.id === mentionMenu.blockId);
    if (block) {
      const content = block.content;
      // Find the last [[ to replace it. This is more robust than regex matching the end of string.
      const lastIndex = content.lastIndexOf('[[');
      if (lastIndex !== -1) {
        // We replace from the last `[[` to the end, or if we know the exact query length, we could use that.
        // But since we just want to replace the current `[[...` being typed:
        // Actually, better to just cut off everything after `[[` (since they are typing it at the end) 
        // OR replace the `[[` + query. 
        // Let's replace the `[[` and whatever follows it up to the cursor.
        // Since we don't have cursor position here, we'll replace the last `[[` and everything after it.
        // This works perfectly if they are typing at the end of the block.
        const newContent = content.substring(0, lastIndex) + `[[${page.title}]] `;
        handleUpdate(mentionMenu.blockId, newContent);
        window.dispatchEvent(new CustomEvent('force-update-block', { detail: { id: mentionMenu.blockId, content: newContent } }));
      } else {
        // Fallback if not found
        const newContent = content + ` [[${page.title}]] `;
        handleUpdate(mentionMenu.blockId, newContent);
        window.dispatchEvent(new CustomEvent('force-update-block', { detail: { id: mentionMenu.blockId, content: newContent } }));
      }
    }
    setMentionMenu(prev => ({ ...prev, isOpen: false, query: '' }));
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const lastBlock = blocks[blocks.length - 1];
      if (!lastBlock) return;
      if (lastBlock.content === '' && lastBlock.type === 'text') {
        setActiveBlock(lastBlock.id!);
      } else {
        handleAddBelow(lastBlock.id!, 'text');
      }
    }
  };

  return (
    <div 
      className="relative w-full pb-64 pl-10 min-h-screen" 
      onClick={handleContainerClick}
      onPaste={async (e) => {
        try {
          const text = e.clipboardData.getData('text/plain');
          if (!text) return;
          const parsed = JSON.parse(text);
          if (parsed.type === 'bergson-block' && parsed.data) {
            e.preventDefault();
            const blockData = parsed.data;
            const currentIndex = activeBlockId 
              ? blocks.findIndex(b => b.id === activeBlockId) 
              : blocks.length - 1;
            const insertIndex = currentIndex >= 0 ? currentIndex + 1 : blocks.length;
            
            const newBlock = { 
              pageId, 
              type: blockData.type, 
              content: blockData.content, 
              order: insertIndex 
            };
            
            const tempId = 'temp-' + Date.now();
            addBlock({ ...newBlock, id: tempId }, insertIndex);
            setActiveBlock(tempId);
            
            const dbId = await blockRepository.createBlock(newBlock);
            updateBlock(tempId, { id: dbId });
            setActiveBlock(dbId);
            
            const updatedBlocks = useEditorStore.getState().blocks;
            await blockRepository.reorderBlocks(pageId, updatedBlocks.map(b => b.id!));
          }
        } catch (err) {
          // Normal text paste, allow default
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDropCapture={(e) => {
        if (Array.from(e.dataTransfer.types).includes('application/x-bergson-block')) {
          e.preventDefault();
          e.stopPropagation();
          handleDrop(e);
        }
      }}
    >
      <div className="flex flex-col">
        {blocks.map((block, index) => (
          <Block
            key={block.type + block.id}
            block={block}
            index={index}
            isActive={activeBlockId === block.id}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onAddBelow={handleAddBelow}
            onFocus={setActiveBlock}
            onKeyDown={handleKeyDown}
            onOpenSlashMenu={(top, left, blockId, query) => setSlashMenu({ isOpen: true, top, left, blockId, query })}
            onCloseSlashMenu={() => setSlashMenu(prev => ({ ...prev, isOpen: false, query: '' }))}
            onOpenMentionMenu={(top, left, blockId, query) => setMentionMenu({ isOpen: true, top, left, blockId, query })}
            onCloseMentionMenu={() => setMentionMenu(prev => ({ ...prev, isOpen: false, query: '' }))}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            dragOverPosition={dragOverState?.index === index ? dragOverState.position : null}
          />
        ))}
      </div>

      <SlashCommand
        isOpen={slashMenu.isOpen}
        onClose={() => setSlashMenu(prev => ({ ...prev, isOpen: false, query: '' }))}
        onSelect={handleSlashSelect}
        position={{ top: slashMenu.top, left: slashMenu.left }}
        query={slashMenu.query}
      />
      
      <PageMentionMenu
        isOpen={mentionMenu.isOpen}
        onClose={() => setMentionMenu(prev => ({ ...prev, isOpen: false, query: '' }))}
        onSelect={handleMentionSelect}
        position={{ top: mentionMenu.top, left: mentionMenu.left }}
        query={mentionMenu.query}
      />
    </div>
  );
};
