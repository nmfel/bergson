import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, Trash2, Home, ChevronRight, Plus, Calendar, Network } from 'lucide-react';
import { cn } from '../../utils';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getPageUrl } from '../../utils/navigation';
import logo from '../../assets/logo.png';
import { SidebarItem } from './SidebarItem';
import { useSidebar } from '../../hooks/useSidebar';
import { usePageManagement } from '../../hooks/usePageManagement';
import { ScrollArea } from '../ui/scroll-area';
import { RenamePageDialog } from '../common/RenamePageDialog';
import { DeleteConfirmDialog } from '../common/DeleteConfirmDialog';
import { MoveToDialog } from '../common/MoveToDialog';
import { SettingsModal } from '../settings/SettingsModal';
import { CreatePageModal } from '../common/CreatePageModal';
import type { Page } from '../../types';

const SidebarSection: React.FC<{ 
  title: string; 
  children: React.ReactNode;
  onAdd?: () => void;
  onDropRoot?: (draggedId: string) => void;
}> = ({ title, children, onAdd, onDropRoot }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  
  return (
    <div className="mt-4">
      <div 
        className={cn(
          "flex items-center justify-between px-2 py-1.5 group transition-colors rounded-md",
          isDragOver && "bg-accent/20 outline outline-1 outline-accent"
        )}
        onDragOver={(e) => {
          if (onDropRoot) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          if (onDropRoot) {
            e.preventDefault();
            setIsDragOver(false);
            const draggedId = e.dataTransfer.getData('pageId');
            if (draggedId) {
              onDropRoot(draggedId);
            }
          }
        }}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 flex-1 text-xs font-semibold text-text-muted hover:text-text-primary uppercase tracking-wider transition-colors outline-none"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-90")} />
          {title}
        </button>
        {onAdd && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="flex-shrink-0 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 hover:bg-surface-hover rounded p-0.5 transition-all outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="flex flex-col px-2 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { pages, searchQuery, expandedItems, loadPages } = useSidebar();
  const { updatePage, deletePage, duplicatePage, createPage } = usePageManagement();
  const navigate = useNavigate();
  const location = useLocation();

  // Modals state
  const [renamePage, setRenamePage] = useState<Page | null>(null);
  const [deletePageConfirm, setDeletePageConfirm] = useState<Page | null>(null);
  const [movePage, setMovePage] = useState<Page | null>(null);
  
  // Search & Filter State
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'page' | 'whiteboard'>('page');

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
    }
    if (selectedTag) {
      result = result.filter(p => p.tags?.includes(selectedTag));
    }
    return result;
  }, [pages, searchQuery, selectedTag]);

  const importantPages = useMemo(() => {
    return pages.filter(p => p.status === 'important');
  }, [pages]);

  const handleRename = async (newTitle: string) => {
    if (renamePage) {
      await updatePage(renamePage.id!, { title: newTitle });
      await loadPages();
    }
  };

  const handleDelete = async (id: string) => {
    await deletePage(id);
    setDeletePageConfirm(null);
    await loadPages();
    
    if (location.pathname === `/app/page/${id}` || location.pathname === `/app/whiteboard/${id}`) {
      navigate('/app');
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicatePage(id);
    await loadPages();
  };

  const handleMove = async (newParentId: string | null) => {
    if (movePage && movePage.id) {
      await updatePage(movePage.id, { parentId: newParentId });
      setMovePage(null);
      await loadPages();
    }
  };

  const handleCreate = async (data: { title: string; type: 'page' | 'whiteboard' }) => {
    const page = await createPage(data);
    setIsCreateModalOpen(false);
    navigate(getPageUrl(page));
    await loadPages();
  };

  const handleMoveToFolder = async (draggedId: string, folderId: string | null) => {
    await updatePage(draggedId, { parentId: folderId });
    await loadPages();
  };

  const openCreateModal = (type: 'page' | 'whiteboard') => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  // Build tree
  const buildTree = (parentId: string | null = null, level: number = 0, filterRoot?: (p: Page) => boolean, visited: Set<string> = new Set()): React.ReactNode[] => {
    let children = filteredPages.filter(p => p.parentId === parentId);
    
    if (parentId === null && filterRoot) {
      children = children.filter(filterRoot);
    }

    return children.flatMap(page => {
      if (page.id && visited.has(page.id)) return [];
      const newVisited = new Set(visited);
      if (page.id) newVisited.add(page.id);

      const hasChildren = pages.some(p => p.parentId === page.id);
      const isExpanded = page.id ? expandedItems.includes(page.id) : false;
      
      const item = (
        <SidebarItem 
          key={page.id} 
          page={page} 
          level={level} 
          hasChildren={hasChildren} 
          onRename={() => setRenamePage(page)}
          onDelete={() => setDeletePageConfirm(page)}
          onDuplicate={() => handleDuplicate(page.id!)}
          onMove={() => setMovePage(page)}
          onMoveToFolder={handleMoveToFolder}
        />
      );

      if (hasChildren && isExpanded && !searchQuery) {
        return [item, ...buildTree(page.id!, level + 1, undefined, newVisited)];
      }

      return [item];
    });
  };

  const rootPages = buildTree(null, 0, p => p.type === 'page' || (p.type as string) === 'folder');
  const rootWhiteboards = buildTree(null, 0, p => p.type === 'whiteboard');

  // Compute unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    pages.forEach(p => {
      if (p.tags) {
        p.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [pages]);

  // Root drop handlers to move out of folders
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    const draggedId = e.dataTransfer.getData('pageId');
    if (draggedId) {
      handleMoveToFolder(draggedId, null);
    }
  };

  return (
    <>
      <aside 
        className="w-[280px] h-full flex-shrink-0 border-r border-border bg-card flex flex-col transition-all duration-300 relative"
      >
        <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
          <Link 
            to="/" 
            onClick={() => localStorage.removeItem('bergson_has_visited')}
            className="flex items-center gap-2 text-primary hover:text-accent-hover transition-colors"
          >
            <img src={logo} alt="Bergson Logo" className="w-5 h-5 rounded-md object-cover" />
            <span className="font-semibold text-sm tracking-tight text-text-primary">Bergson</span>
          </Link>
        </div>

        <ScrollArea 
          className={cn("flex-1", isRootDragOver && "bg-accent/5 outline outline-2 outline-accent -outline-offset-2 rounded-md")}
          onDragOver={handleRootDragOver}
          onDragLeave={() => setIsRootDragOver(false)}
          onDrop={handleRootDrop}
        >
          <div className="flex flex-col pb-4">
            <div className="px-2 mt-2">
              <NavLink
                to="/app"
                end
                className={({ isActive }) => `
                  group flex items-center gap-3 py-2 px-3 w-full text-sm transition-colors duration-150 rounded-md relative
                  text-text-secondary hover:text-text-primary hover:bg-surface-hover
                  ${isActive ? 'bg-popover text-text-primary' : ''}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full -ml-1" />
                    )}
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </>
                )}
              </NavLink>
            </div>
            
            <div className="px-2 mt-1">
              <NavLink
                to="/app/calendar"
                className={({ isActive }) => `
                  group flex items-center gap-3 py-2 px-3 w-full text-sm transition-colors duration-150 rounded-md relative
                  text-text-secondary hover:text-text-primary hover:bg-surface-hover
                  ${isActive ? 'bg-popover text-text-primary' : ''}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full -ml-1" />
                    )}
                    <Calendar className="w-4 h-4" />
                    <span>Calendar</span>
                  </>
                )}
              </NavLink>
            </div>

            <div className="px-2 mt-1">
              <NavLink
                to="/app/graph"
                className={({ isActive }) => `
                  group flex items-center gap-3 py-2 px-3 w-full text-sm transition-colors duration-150 rounded-md relative
                  text-text-secondary hover:text-text-primary hover:bg-surface-hover
                  ${isActive ? 'bg-popover text-text-primary' : ''}
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full -ml-1" />
                    )}
                    <Network className="w-4 h-4" />
                    <span>Graph View</span>
                  </>
                )}
              </NavLink>
            </div>

            {(searchQuery || selectedTag) ? (
              <SidebarSection title={selectedTag ? `Tag: #${selectedTag}` : "Search Results"}>
                {filteredPages.length > 0 ? (
                  filteredPages.map(page => (
                    <SidebarItem 
                      key={`search-${page.id}`} 
                      page={page} 
                      level={0} 
                      hasChildren={false} 
                      onRename={() => setRenamePage(page)}
                      onDelete={() => setDeletePageConfirm(page)}
                      onDuplicate={() => handleDuplicate(page.id!)}
                      onMove={() => setMovePage(page)}
                      onMoveToFolder={handleMoveToFolder}
                    />
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-text-muted italic">No results found</div>
                )}
              </SidebarSection>
            ) : (
              <>
                <SidebarSection title="Important">
              {importantPages.length > 0 ? (
                importantPages.map(page => (
                  <SidebarItem 
                    key={`important-${page.id}`} 
                    page={page} 
                    level={0} 
                    hasChildren={false} 
                    onRename={() => setRenamePage(page)}
                    onDelete={() => setDeletePageConfirm(page)}
                    onDuplicate={() => handleDuplicate(page.id!)}
                    onMove={() => setMovePage(page)}
                  />
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-text-muted italic">No important notes</div>
              )}
            </SidebarSection>



            <SidebarSection 
              title="Whiteboards"
              onAdd={() => openCreateModal('whiteboard')}
              onDropRoot={(draggedId) => handleMoveToFolder(draggedId, null)}
            >
              {rootWhiteboards.length > 0 ? (
                rootWhiteboards
              ) : (
                <div className="px-3 py-2 text-sm text-text-muted italic">No whiteboards found</div>
              )}
            </SidebarSection>

            <SidebarSection 
              title="Pages"
              onAdd={() => openCreateModal('page')}
              onDropRoot={(draggedId) => handleMoveToFolder(draggedId, null)}
            >
              {rootPages.length > 0 ? (
                rootPages
              ) : (
                <div className="px-3 py-2 text-sm text-text-muted italic">No pages found</div>
              )}
            </SidebarSection>
            </>
            )}
            
            {allTags.length > 0 && (
              <SidebarSection title="Tags">
                <div className="px-3 flex flex-wrap gap-1.5">
                  {allTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors focus:outline-none",
                        selectedTag === tag 
                          ? "bg-accent/20 border-accent text-accent" 
                          : "bg-surface-hover text-text-secondary border-border/50 hover:border-accent hover:text-accent"
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </SidebarSection>
            )}
          </div>
        </ScrollArea>

        <div className="mt-auto border-t border-border p-2 flex-shrink-0 flex flex-col gap-1">
          <NavLink 
            to="/app/trash"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 w-full rounded-md transition-colors duration-150 text-sm 
              ${isActive ? 'bg-popover text-text-primary border-l-2 border-accent -ml-[2px] pl-[14px]' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'}
            `}
          >
            <Trash2 className="w-4 h-4" />
            Trash
          </NavLink>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-surface-hover transition-colors duration-150 text-sm text-text-secondary hover:text-text-primary"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <RenamePageDialog 
        isOpen={!!renamePage}
        onClose={() => setRenamePage(null)}
        currentTitle={renamePage?.title || ''}
        onRename={handleRename}
      />

      <DeleteConfirmDialog 
        isOpen={!!deletePageConfirm}
        onClose={() => setDeletePageConfirm(null)}
        title={deletePageConfirm?.title || ''}
        onConfirm={async () => {
          if (deletePageConfirm) {
            await handleDelete(deletePageConfirm.id!);
          }
        }}
      />

      {movePage && (
        <MoveToDialog
          isOpen={!!movePage}
          onClose={() => setMovePage(null)}
          onMove={handleMove}
          pages={pages}
          currentPageId={movePage.id!}
        />
      )}

      <CreatePageModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
        defaultType={createType}
      />
    </>
  );
};
