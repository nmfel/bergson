import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus, Image as ImageIcon, Link as LinkIcon, FileText, Table, Columns, SplitSquareHorizontal, Workflow } from 'lucide-react';
import type { Block } from '../../types';

interface SlashCommandProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: Block['type']) => void;
  position: { top: number; left: number };
  query: string;
}

const COMMANDS: { icon: React.FC<any>, label: string, type: Block['type'], aliases?: string[] }[] = [
  { icon: Type, label: 'Text', type: 'text', aliases: ['paragraph', 'plain'] },
  { icon: Heading1, label: 'Heading 1', type: 'heading1', aliases: ['h1', 'title'] },
  { icon: Heading2, label: 'Heading 2', type: 'heading2', aliases: ['h2', 'subtitle'] },
  { icon: Heading3, label: 'Heading 3', type: 'heading3', aliases: ['h3'] },
  { icon: List, label: 'Bullet List', type: 'bullet', aliases: ['ul', 'list'] },
  { icon: ListOrdered, label: 'Numbered List', type: 'numbered', aliases: ['ol', 'number'] },
  { icon: CheckSquare, label: 'To-do List', type: 'todo', aliases: ['checkbox', 'task'] },
  { icon: Quote, label: 'Quote', type: 'quote', aliases: ['blockquote'] },
  { icon: Code, label: 'Code Block', type: 'code', aliases: ['pre', 'snippet'] },
  { icon: Workflow, label: 'Diagram / Flowchart', type: 'diagram', aliases: ['mermaid', 'chart', 'flowchart', 'mindmap', 'sequence'] },
  { icon: ImageIcon, label: 'Image', type: 'image', aliases: ['picture', 'photo'] },
  { icon: FileText, label: 'PDF Document', type: 'pdf', aliases: ['pdf', 'document', 'paper', 'reader'] },
  { icon: Table, label: 'Table', type: 'table', aliases: ['excel', 'grid', 'spreadsheet'] },
  { icon: Columns, label: 'Kanban Board', type: 'kanban', aliases: ['board', 'trello', 'tasks'] },
  { icon: SplitSquareHorizontal, label: '2 Columns', type: 'columns', aliases: ['split', 'half', 'layout', 'side'] },
  { icon: LinkIcon, label: 'Web Bookmark', type: 'link', aliases: ['url', 'website'] },
  { icon: FileText, label: 'Link To...', type: 'page-link', aliases: ['mention', 'page'] },
  { icon: Minus, label: 'Divider', type: 'divider', aliases: ['hr', 'line'] },
];



export const SlashCommand: React.FC<SlashCommandProps> = ({ isOpen, onClose, onSelect, position, query }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedTop, setAdjustedTop] = useState(position.top);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(query) || 
    cmd.type.toLowerCase().includes(query) ||
    cmd.aliases?.some(alias => alias.includes(query))
  );

  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (position.top + rect.height > window.innerHeight) {
        setAdjustedTop(Math.max(10, position.top - rect.height - 35));
      } else {
        setAdjustedTop(position.top);
      }
    }
  }, [isOpen, position.top, filteredCommands.length]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedIndex(0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          // If enter is pressed with no commands, let it just act like text
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filteredCommands[selectedIndex].type);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, selectedIndex, onSelect, onClose, filteredCommands]);

  if (!isOpen || filteredCommands.length === 0) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden py-1 flex flex-col max-h-[300px]"
      style={{ top: adjustedTop, left: position.left }}
    >
      <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0">
        Basic Blocks
      </div>
      <div className="overflow-y-auto flex-1 overscroll-contain">
        {filteredCommands.map((cmd, idx) => (
          <button
            key={cmd.type}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left
              ${idx === selectedIndex ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}
            `}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cmd.type);
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <cmd.icon className="w-4 h-4" />
            {cmd.label}
          </button>
        ))}
      </div>
    </div>
  );
};
