import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import type { Block } from '../../types';
import { cn } from '../../utils';
import { safeParse } from '../../utils/safeParse';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface KanbanBlockProps {
  block: Block;
  onUpdate: (id: string, content: string) => void;
}

export interface KanbanColumn {
  id: string;
  name: string;
}

export interface KanbanCard {
  id: string;
  colId: string;
  title: string;
}

export interface KanbanData {
  version: 1;
  columns: KanbanColumn[];
  cards: KanbanCard[];
  isFullWidth?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const KanbanBlock: React.FC<KanbanBlockProps> = ({ block, onUpdate }) => {
  const [data, setData] = useState<KanbanData | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const defaultCols: KanbanColumn[] = [
      { id: `col_${generateId()}`, name: 'To Do' },
      { id: `col_${generateId()}`, name: 'In Progress' },
      { id: `col_${generateId()}`, name: 'Done' }
    ];
    const defaultData: KanbanData = { version: 1, columns: defaultCols, cards: [] };

    const parsedData = safeParse<KanbanData>(block.content, defaultData, (parsed, defaults) => {
      // Just shallow merge the root to ensure properties like `isFullWidth` are preserved if added later
      const columns = Array.isArray(parsed.columns) ? parsed.columns : defaults.columns;
      const cards = Array.isArray(parsed.cards) ? parsed.cards : defaults.cards;
      
      return {
        ...defaults,
        ...parsed,
        version: 1,
        columns,
        cards
      };
    });

    setData(parsedData);
    
    // Only update DB if migration was needed
    if (block.content !== JSON.stringify(parsedData)) {
      onUpdate(block.id!, JSON.stringify(parsedData));
    }
  }, [block.content, block.id]);

  const updateState = (newData: KanbanData) => {
    setData(newData);
    onUpdate(block.id!, JSON.stringify(newData));
  };

  const addColumn = () => {
    if (!data) return;
    const newCol: KanbanColumn = { id: `col_${generateId()}`, name: 'New Column' };
    updateState({ ...data, columns: [...data.columns, newCol] });
  };

  const deleteColumn = (colId: string) => {
    if (!data) return;
    const newCols = data.columns.filter(c => c.id !== colId);
    const newCards = data.cards.filter(c => c.colId !== colId);
    updateState({ ...data, columns: newCols, cards: newCards });
  };

  const updateColumnName = (colId: string, name: string) => {
    if (!data) return;
    const newCols = data.columns.map(c => c.id === colId ? { ...c, name } : c);
    updateState({ ...data, columns: newCols });
  };

  const addCard = (colId: string) => {
    if (!data) return;
    const newCard: KanbanCard = { id: `card_${generateId()}`, colId, title: '' };
    updateState({ ...data, cards: [...data.cards, newCard] });
  };

  const updateCard = (cardId: string, title: string) => {
    if (!data) return;
    const newCards = data.cards.map(c => c.id === cardId ? { ...c, title } : c);
    updateState({ ...data, cards: newCards });
  };

  const deleteCard = (cardId: string) => {
    if (!data) return;
    const newCards = data.cards.filter(c => c.id !== cardId);
    updateState({ ...data, cards: newCards });
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('cardId', cardId);
    
    // Add visual feedback to dragged element
    setTimeout(() => {
      const el = document.getElementById(`kanban-card-${cardId}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    setDraggedCardId(null);
    const el = document.getElementById(`kanban-card-${cardId}`);
    if (el) el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!data || !draggedCardId) return;
    
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId !== draggedCardId) return; // Prevent interference from other dnd sources

    const newCards = data.cards.map(c => 
      c.id === cardId ? { ...c, colId: targetColId } : c
    );
    updateState({ ...data, cards: newCards });
    setDraggedCardId(null);
  };

  if (!data) return null;

  return (
    <div 
      className={cn(
        "my-4 relative transition-all duration-300",
        data.isFullWidth ? "w-full xl:w-[calc(100%+300px)] xl:-ml-[150px]" : "w-full"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Kanban Settings/Toolbar */}
      <div className={cn("absolute top-0 right-2 transition-opacity flex items-center gap-2 z-10", isHovered ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <button 
          onClick={() => updateState({ ...data, isFullWidth: !data.isFullWidth })}
          className="text-xs px-2 py-1 bg-surface-hover hover:bg-accent hover:text-white text-text-muted rounded-md transition-colors border border-border"
        >
          {data.isFullWidth ? 'Normal Width' : 'Full Width'}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 custom-scrollbar items-start">
        {data.columns.map(col => {
          const colCards = data.cards.filter(c => c.colId === col.id);
          
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-[280px] bg-surface/50 rounded-xl border border-border/50 flex flex-col max-h-[600px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b border-border/50 group/colheader">
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumnName(col.id, e.target.value)}
                  className="bg-transparent border-none outline-none font-medium text-sm text-text-primary focus:ring-1 focus:ring-accent rounded px-1 -ml-1 w-full"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover/colheader:opacity-100 p-1 hover:bg-surface-hover rounded text-text-muted transition-opacity">
                      <GripVertical className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem 
                      className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                      onClick={() => deleteColumn(col.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Column Cards Container */}
              <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-2 min-h-[50px]">
                {colCards.map(card => (
                  <div 
                    key={card.id}
                    id={`kanban-card-${card.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onDragEnd={(e) => handleDragEnd(e, card.id)}
                    className="group/card bg-card border border-border rounded-lg p-3 shadow-sm hover:border-accent/50 transition-colors cursor-grab active:cursor-grabbing relative"
                  >
                    <TextareaAutosize
                      value={card.title}
                      onChange={(e) => updateCard(card.id, e.target.value)}
                      placeholder="Card title..."
                      className="w-full bg-transparent border-none outline-none resize-none text-sm text-text-primary placeholder:text-text-muted/50"
                      minRows={1}
                    />
                    <button 
                      onClick={() => deleteCard(card.id)}
                      className="absolute top-2 right-2 p-1 bg-surface-hover hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Card Button */}
                <button 
                  onClick={() => addCard(col.id)}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover p-2 rounded-md transition-colors mt-1 w-full"
                >
                  <Plus className="w-4 h-4" /> Add card
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Column Button */}
        <button 
          onClick={addColumn}
          title="Add column"
          className={cn(
            "w-10 flex-shrink-0 h-10 flex items-center justify-center text-text-muted hover:text-text-primary bg-surface/30 hover:bg-surface border border-dashed border-border rounded-lg transition-all duration-200 mt-1",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
