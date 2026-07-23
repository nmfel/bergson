import React, { useState, useEffect } from 'react';
import type { Block, BlockType } from '../../types';
import { Block as BlockComponent } from './Block';
import { SlashCommand } from './SlashCommand';
import { SplitSquareHorizontal, Plus, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils';
import { safeParse } from '../../utils/safeParse';

interface ColumnsBlockProps {
  block: Block;
  onChange: (id: string, newContent: string) => void;
  autoFocus?: boolean;
}

interface ColumnData {
  layout: string[];
  columns: Block[][];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const ColumnsBlockComponent: React.FC<ColumnsBlockProps> = ({ block, onChange }) => {
  const [data, setData] = useState<ColumnData>({
    layout: ['1fr', '1fr'],
    columns: [[{ id: generateId(), pageId: block.pageId, type: 'text', content: '', order: 0 }], [{ id: generateId(), pageId: block.pageId, type: 'text', content: '', order: 0 }]]
  });
  const [activeNestedBlockId, setActiveNestedBlockId] = useState<string | null>(null);

  useEffect(() => {
    const defaultData: ColumnData = {
      layout: ['1fr', '1fr'],
      columns: [[{ id: generateId(), pageId: block.pageId, type: 'text', content: '', order: 0 }], [{ id: generateId(), pageId: block.pageId, type: 'text', content: '', order: 0 }]]
    };

    const parsedData = safeParse<ColumnData>(block.content, defaultData, (parsed, defaults) => {
      // Support old plain string array format
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        return {
          layout: parsed.map(() => '1fr'),
          columns: parsed.map((text: string) => [{
            id: generateId(), pageId: block.pageId, type: 'text', content: text, order: 0
          }])
        };
      }
      
      // Ensure layout and columns arrays exist
      return {
        ...defaults,
        ...parsed,
        layout: Array.isArray(parsed.layout) ? parsed.layout : defaults.layout,
        columns: Array.isArray(parsed.columns) ? parsed.columns : defaults.columns
      };
    });

    // Prevent endless loop by only setting if it changed structurally (not string comparison because UUIDs might generate, wait!)
    // Actually safeParse doesn't generate UUIDs unless it falls back to defaults or the old string array format.
    setData(parsedData);
    
    if (block.content !== JSON.stringify(parsedData)) {
      onChange(block.id!, JSON.stringify(parsedData));
    }
  }, [block.content, block.pageId]);

  const saveToParent = (newData: ColumnData) => {
    setData(newData);
    onChange(block.id!, JSON.stringify(newData));
  };

  const updateNestedBlock = (colIndex: number, blockId: string, content: string, type?: BlockType) => {
    const newData = { ...data, columns: [...data.columns] };
    const colBlocks = [...newData.columns[colIndex]];
    const bIndex = colBlocks.findIndex(b => b.id === blockId);
    if (bIndex > -1) {
      colBlocks[bIndex] = { ...colBlocks[bIndex], content, type: type || colBlocks[bIndex].type };
      newData.columns[colIndex] = colBlocks;
      saveToParent(newData);
    }
  };

  const addNestedBlockBelow = (colIndex: number, blockId: string) => {
    const newData = { ...data, columns: [...data.columns] };
    const colBlocks = [...newData.columns[colIndex]];
    const bIndex = colBlocks.findIndex(b => b.id === blockId);
    if (bIndex > -1) {
      const newId = generateId();
      colBlocks.splice(bIndex + 1, 0, { id: newId, pageId: block.pageId, type: 'text', content: '', order: 0 });
      // Reorder
      colBlocks.forEach((b, i) => b.order = i);
      newData.columns[colIndex] = colBlocks;
      saveToParent(newData);
      setTimeout(() => setActiveNestedBlockId(newId), 0);
    }
  };

  const deleteNestedBlock = (colIndex: number, blockId: string) => {
    const newData = { ...data, columns: [...data.columns] };
    const colBlocks = [...newData.columns[colIndex]];
    if (colBlocks.length <= 1) {
      // Don't delete last block, reset it
      colBlocks[0] = { ...colBlocks[0], type: 'text', content: '' };
    } else {
      const bIndex = colBlocks.findIndex(b => b.id === blockId);
      if (bIndex > -1) {
        colBlocks.splice(bIndex, 1);
        colBlocks.forEach((b, i) => b.order = i);
        if (bIndex > 0) setActiveNestedBlockId(colBlocks[bIndex - 1].id!);
      }
    }
    newData.columns[colIndex] = colBlocks;
    saveToParent(newData);
  };

  const handleKeyDown = (e: React.KeyboardEvent, colIndex: number, blockId: string, blockIndex: number) => {
    if (slashMenu.isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        return;
      }
    }

    const colBlocks = data.columns[colIndex];
    if (e.key === 'ArrowUp' && blockIndex > 0) {
      e.preventDefault();
      setActiveNestedBlockId(colBlocks[blockIndex - 1].id!);
    } else if (e.key === 'ArrowDown' && blockIndex < colBlocks.length - 1) {
      e.preventDefault();
      setActiveNestedBlockId(colBlocks[blockIndex + 1].id!);
    } else if (e.key === 'Backspace' && colBlocks[blockIndex].content === '') {
      e.preventDefault();
      if (colBlocks[blockIndex].type !== 'text') {
        updateNestedBlock(colIndex, blockId, '', 'text');
      } else {
        deleteNestedBlock(colIndex, blockId);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNestedBlockBelow(colIndex, blockId);
    }
  };

  const addColumn = () => {
    if (data.columns.length >= 4) return;
    const newData = {
      layout: [...data.layout, '1fr'],
      columns: [...data.columns, [{ id: generateId(), pageId: block.pageId, type: 'text' as const, content: '', order: 0 }]]
    };
    saveToParent(newData);
  };

  const removeColumn = () => {
    if (data.columns.length <= 2) return;
    const newData = {
      layout: data.layout.slice(0, -1),
      columns: data.columns.slice(0, -1)
    };
    saveToParent(newData);
  };

  const setLayout = (layoutStr: string) => {
    const layoutArray = layoutStr.split(' ');
    // Only apply if the number of columns matches
    if (layoutArray.length === data.columns.length) {
      saveToParent({ ...data, layout: layoutArray });
    }
  };

  const [slashMenu, setSlashMenu] = useState<{ isOpen: boolean; top: number; left: number; blockId: string; query: string; colIndex: number }>({
    isOpen: false, top: 0, left: 0, blockId: '', query: '', colIndex: 0
  });
  
  const handleSlashSelect = (type: BlockType) => {
    if (!slashMenu.blockId) return;
    updateNestedBlock(slashMenu.colIndex, slashMenu.blockId, '', type);
    setSlashMenu(prev => ({ ...prev, isOpen: false, query: '' }));
  };

  return (
    <div className="w-full relative group/columns-wrapper my-4">
      {/* Mini Toolbar */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-border shadow-md rounded-lg flex items-center p-1 gap-1 opacity-0 group-hover/columns-wrapper:opacity-100 transition-opacity z-20">
        <div className="text-xs text-text-muted px-2 border-r border-border flex items-center">
          <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" /> Columns
        </div>
        <Button variant="ghost" size="sm" onClick={removeColumn} disabled={data.columns.length <= 2} className="h-7 w-7 p-0" title="Remove Column"><Minus className="w-3.5 h-3.5" /></Button>
        <span className="text-xs font-mono">{data.columns.length}</span>
        <Button variant="ghost" size="sm" onClick={addColumn} disabled={data.columns.length >= 4} className="h-7 w-7 p-0" title="Add Column"><Plus className="w-3.5 h-3.5" /></Button>
        
        {data.columns.length === 2 && (
          <>
            <div className="w-px h-4 bg-border mx-1"></div>
            <Button variant="ghost" size="sm" onClick={() => setLayout('1fr 1fr')} className={cn("h-7 px-2 text-xs", data.layout[0] === '1fr' ? 'bg-surface-hover' : '')}>50/50</Button>
            <Button variant="ghost" size="sm" onClick={() => setLayout('7fr 3fr')} className={cn("h-7 px-2 text-xs", data.layout[0] === '7fr' ? 'bg-surface-hover' : '')}>70/30</Button>
            <Button variant="ghost" size="sm" onClick={() => setLayout('3fr 7fr')} className={cn("h-7 px-2 text-xs", data.layout[0] === '3fr' ? 'bg-surface-hover' : '')}>30/70</Button>
          </>
        )}
      </div>

      <div 
        className="w-full grid gap-6"
        style={{ gridTemplateColumns: data.layout.join(' ') }}
      >
        {data.columns.map((colBlocks, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-0 min-w-0 p-2 rounded-lg border border-transparent hover:border-border transition-colors">
            {colBlocks.map((b, bIndex) => (
              <BlockComponent
                key={b.id}
                block={b}
                index={bIndex}
                isActive={activeNestedBlockId === b.id}
                onUpdate={(id, content, type) => updateNestedBlock(colIndex, id, content, type)}
                onDelete={(id) => deleteNestedBlock(colIndex, id)}
                onAddBelow={(id) => addNestedBlockBelow(colIndex, id)}
                onFocus={(id) => setActiveNestedBlockId(id)}
                onKeyDown={(e, id, i) => handleKeyDown(e, colIndex, id, i)}
                onOpenSlashMenu={(top, left, id, query) => setSlashMenu({ isOpen: true, top, left, blockId: id, query, colIndex })}
                onCloseSlashMenu={() => setSlashMenu(prev => ({ ...prev, isOpen: false }))}
                onOpenMentionMenu={() => {}} // Nested mentions not fully supported yet to keep simple
                onCloseMentionMenu={() => {}}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDragEnd={() => {}}
                dragOverPosition={null}
              />
            ))}
          </div>
        ))}
      </div>

      <SlashCommand
        isOpen={slashMenu.isOpen}
        onClose={() => setSlashMenu(prev => ({ ...prev, isOpen: false, query: '' }))}
        onSelect={handleSlashSelect}
        position={{ top: slashMenu.top, left: slashMenu.left }}
        query={slashMenu.query}
      />
    </div>
  );
};

export const ColumnsBlock = React.memo(ColumnsBlockComponent, (prevProps, nextProps) => {
  return prevProps.block.content === nextProps.block.content;
});
