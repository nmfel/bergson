import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown, FileText, MoreHorizontal, Edit, Copy, LayoutDashboard, Archive, Star, FolderInput } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useSidebar } from '../../hooks/useSidebar';
import { usePageManagement } from '../../hooks/usePageManagement';
import { cn } from '../../utils';
import type { Page } from '../../types';

interface SidebarItemProps {
  page: Page;
  level: number;
  hasChildren?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onMoveToFolder?: (draggedId: string, folderId: string) => void;
}

const SidebarItemComponent: React.FC<SidebarItemProps> = ({ 
  page, 
  level, 
  hasChildren = false,
  onRename, 
  onDelete, 
  onDuplicate,
  onMove,
  onMoveToFolder
}) => {
  const { expandedItems, toggleExpand, loadPages } = useSidebar();
  const { toggleFavorite } = usePageManagement();
  const [isDragOver, setIsDragOver] = React.useState(false);
  
  const isExpanded = page.id ? expandedItems.includes(page.id) : false;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (page.id) {
      toggleExpand(page.id);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (page.id) {
      await toggleFavorite(page.id);
      await loadPages();
    }
  };



  const paddingLeft = `${level * 16 + 4}px`;
  const Icon = page.type === 'whiteboard' ? LayoutDashboard : FileText;

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (page.id) {
      e.dataTransfer.setData('pageId', page.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const draggedId = e.dataTransfer.getData('pageId');
    if (draggedId && draggedId !== page.id) {
      onMoveToFolder?.(draggedId, page.id!);
    }
  };

  const innerContent = (isActive = false) => (
    <>
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-md" />
      )}
      
      <div className="flex items-center gap-1.5 flex-1 min-w-0 h-5">
        <button
          onClick={handleToggle}
          className={cn(
            "w-4 h-4 flex items-center justify-center rounded hover:bg-surface-hover text-text-muted transition-opacity",
            hasChildren ? "opacity-100" : "opacity-0"
          )}
          disabled={!hasChildren}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {page.icon ? (
          <span className="text-base leading-none w-4 h-4 flex items-center justify-center shrink-0">{page.icon}</span>
        ) : (
          <Icon className={cn("w-4 h-4 shrink-0", page.type === 'whiteboard' ? "text-purple-400" : "text-blue-400")} />
        )}
        <span className="truncate flex-1 min-w-0 leading-5" title={page.title}>
          {page.title 
            ? (page.title.length > 20 ? page.title.substring(0, 20) + '...' : page.title) 
            : 'Untitled'}
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 h-5">
        <button
          onClick={handleFavorite}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover transition-opacity",
            page.isFavorite 
              ? "opacity-100 text-yellow-400" 
              : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-yellow-400"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", page.isFavorite && "fill-yellow-400 text-yellow-400")} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-hover text-text-muted hover:text-text-primary outline-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-text-primary">
            <DropdownMenuItem 
              className="focus:bg-surface-hover focus:text-text-primary cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); onRename?.(); }}
            >
              <Edit className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="focus:bg-surface-hover focus:text-text-primary cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); onMove?.(); }}
            >
              <FolderInput className="w-4 h-4 mr-2" /> Move To...
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="focus:bg-surface-hover focus:text-text-primary cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
            >
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="focus:bg-orange-500/20 focus:text-orange-400 cursor-pointer text-orange-400"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              <Archive className="w-4 h-4 mr-2" /> Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <NavLink
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      to={page.type === 'whiteboard' ? `/app/whiteboard/${page.id}` : `/app/page/${page.id}`}
      onDoubleClick={(e) => {
        e.preventDefault();
        onRename?.();
      }}
      className={({ isActive }) => cn(
        "group flex items-center justify-between py-1.5 pr-1.5 w-full text-sm transition-colors duration-150 rounded-md relative overflow-hidden",
        "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
        isActive && "bg-popover text-text-primary",
        isDragOver && "bg-accent/20 outline outline-1 outline-accent"
      )}
      style={{ paddingLeft, marginLeft: '4px', marginRight: '4px', width: 'calc(100% - 8px)' }}
    >
      {({ isActive }) => innerContent(isActive)}
    </NavLink>
  );
};

export const SidebarItem = React.memo(SidebarItemComponent);
