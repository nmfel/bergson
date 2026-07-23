import React from 'react';
import { GripVertical, Plus, Trash2, Copy } from 'lucide-react';

interface BlockToolbarProps {
  onDelete: () => void;
  onAddBelow: () => void;
  onCopy: () => void;
  isVisible: boolean;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({ onDelete, onAddBelow, onCopy, isVisible }) => {
  return (
    <div 
      className={`absolute right-full mr-2 top-1.5 flex items-center gap-0.5 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      contentEditable={false}
    >
      {/* Invisible bridge to connect hover area */}
      <div className="absolute -right-4 top-0 w-4 h-full bg-transparent" />

      <button 
        className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
        onClick={onAddBelow}
        title="Add block below"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
        onClick={onCopy}
        title="Copy block"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        draggable={true}
        onDragStart={(e) => {
          const blockContainer = e.currentTarget.closest('.group\\/block');
          if (blockContainer) {
            e.dataTransfer.setDragImage(blockContainer, 0, 0);
          }
        }}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button 
        className="p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        onClick={onDelete}
        title="Delete block"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
