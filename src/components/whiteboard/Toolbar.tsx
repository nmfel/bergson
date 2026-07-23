import React, { useRef, useState } from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  Pencil,
  Eraser,
  Type,
  StickyNote,
  Image as ImageIcon,
  Trash2,
  Undo2,
  Redo2,
  ChevronDown,
  Palette,
  Link as LinkIcon,
  FileText,
  Download,
  ArrowRight,
  ImageDown
} from 'lucide-react';
import { cn } from '../../utils';

export type ToolType =
  | 'select' | 'grab'
  | 'pencil' | 'eraser'
  | 'rectangle' | 'circle' | 'line' | 'arrow'
  | 'text' | 'sticky'
  | 'image' | 'bookmark' | 'page-link';

/* ── Tool group definition ── */
interface SubTool {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
}
interface ToolGroup {
  key: string;
  tools: SubTool[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    key: 'pointer',
    tools: [
      { id: 'select', icon: <MousePointer2 className="w-4.5 h-4.5" />, label: 'Select (V)' },
      { id: 'grab', icon: <Hand className="w-4.5 h-4.5" />, label: 'Hand / Pan (H)' },
    ],
  },
  {
    key: 'draw',
    tools: [
      { id: 'pencil', icon: <Pencil className="w-4.5 h-4.5" />, label: 'Pencil (P)' },
      { id: 'eraser', icon: <Eraser className="w-4.5 h-4.5" />, label: 'Eraser (E)' },
    ],
  },
  {
    key: 'shape',
    tools: [
      { id: 'rectangle', icon: <Square className="w-4.5 h-4.5" />, label: 'Rectangle (R)' },
      { id: 'circle', icon: <Circle className="w-4.5 h-4.5" />, label: 'Circle (C)' },
      { id: 'line', icon: <Minus className="w-4.5 h-4.5" />, label: 'Line (L)' },
      { id: 'arrow', icon: <ArrowRight className="w-4.5 h-4.5" />, label: 'Arrow (A)' },
    ],
  },
  {
    key: 'content',
    tools: [
      { id: 'text', icon: <Type className="w-4.5 h-4.5" />, label: 'Text (T)' },
      { id: 'sticky', icon: <StickyNote className="w-4.5 h-4.5" />, label: 'Sticky Note' },
      { id: 'bookmark', icon: <LinkIcon className="w-4.5 h-4.5" />, label: 'Web Bookmark' },
      { id: 'page-link', icon: <FileText className="w-4.5 h-4.5" />, label: 'Link To...' },
    ],
  },
];

/* ── Props ── */
interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onImageSelect: (file: File) => void;
  onExportPDF: () => void;
  onExportImage: () => void;
}

/* ── Grouped tool button with flyout ── */
const GroupButton: React.FC<{
  group: ToolGroup;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}> = ({ group, activeTool, setActiveTool }) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Track last-selected tool per group
  const activeInGroup = group.tools.find((t) => t.id === activeTool);
  const displayTool = activeInGroup || group.tools[0];
  const isGroupActive = !!activeInGroup;
  const hasMultiple = group.tools.length > 1;

  const handleClick = () => {
    setActiveTool(displayTool.id);
    setOpen(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!hasMultiple) return;
    e.preventDefault();
    setOpen((prev) => !prev);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => setOpen(false), 300);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={`${displayTool.label}${hasMultiple ? ' (right-click for more)' : ''}`}
        className={cn(
          'p-2.5 rounded-lg flex items-center justify-center transition-colors relative',
          isGroupActive
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
        )}
      >
        {displayTool.icon}
        {hasMultiple && (
          <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-90" />
        )}
      </button>

      {/* Flyout */}
      {open && hasMultiple && (
        <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-0.5 p-1.5 bg-popover border border-border rounded-lg shadow-2xl z-[60] min-w-max">
          {group.tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors',
                activeTool === tool.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Toolbar ── */
export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onImageSelect,
  onExportPDF,
  onExportImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-2xl z-50">
      {/* Tool groups */}
      {TOOL_GROUPS.map((group) => (
        <GroupButton
          key={group.key}
          group={group}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />
      ))}

      {/* Image upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Insert Image"
        className="p-2.5 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
      >
        <ImageIcon className="w-4.5 h-4.5" />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) onImageSelect(e.target.files[0]);
          e.target.value = '';
        }}
        accept="image/*"
        className="hidden"
      />

      <div className="w-px h-7 bg-border mx-1" />

      {/* Color picker */}
      <button
        onClick={() => colorInputRef.current?.click()}
        title="Stroke / Fill Color"
        className="p-2 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-hover transition-colors relative"
      >
        <Palette className="w-4.5 h-4.5" />
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full"
          style={{ backgroundColor: activeColor }}
        />
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={activeColor}
        onChange={(e) => setActiveColor(e.target.value)}
        className="sr-only"
      />

      <div className="w-px h-7 bg-border mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className={cn(
          'p-2.5 rounded-lg flex items-center justify-center transition-colors',
          canUndo ? 'text-text-muted hover:text-text-primary hover:bg-surface-hover' : 'text-text-muted/30 cursor-not-allowed'
        )}
      >
        <Undo2 className="w-4.5 h-4.5" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className={cn(
          'p-2.5 rounded-lg flex items-center justify-center transition-colors',
          canRedo ? 'text-text-muted hover:text-text-primary hover:bg-surface-hover' : 'text-text-muted/30 cursor-not-allowed'
        )}
      >
        <Redo2 className="w-4.5 h-4.5" />
      </button>

      <div className="w-px h-7 bg-border mx-1" />

      <div className="w-px h-7 bg-border mx-1" />

      {/* Export PDF */}
      <button
        onClick={onExportPDF}
        title="Export to PDF"
        className="p-2.5 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
      >
        <Download className="w-4.5 h-4.5" />
      </button>

      {/* Export Image */}
      <button
        onClick={onExportImage}
        title="Export to High-Res PNG"
        className="p-2.5 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
      >
        <ImageDown className="w-4.5 h-4.5" />
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        title="Clear Board"
        className="p-2.5 rounded-lg flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <Trash2 className="w-4.5 h-4.5" />
      </button>
    </div>
  );
};
