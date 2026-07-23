import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, LayoutDashboard, Home } from 'lucide-react';
import type { Page } from '@/types';
import { cn } from '@/utils';

interface MoveToDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (newParentId: string | null) => void;
  pages: Page[];
  currentPageId: string;
}

export const MoveToDialog: React.FC<MoveToDialogProps> = ({
  isOpen,
  onClose,
  onMove,
  pages,
  currentPageId,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Filter out current page to prevent moving into self
  const availableParents = pages.filter(p => p.id !== currentPageId);

  const handleMove = () => {
    onMove(selectedParentId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-surface border-border text-text-primary sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move To...</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          <button
            onClick={() => setSelectedParentId(null)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
              selectedParentId === null 
                ? "border-accent bg-accent/10 text-accent" 
                : "border-border hover:bg-surface-hover text-text-primary"
            )}
          >
            <Home className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-medium">Root</div>
              <div className="text-xs text-text-muted mt-0.5">Move to top level</div>
            </div>
          </button>

          {availableParents.map(parent => (
            <button
              key={parent.id}
              onClick={() => setSelectedParentId(parent.id!)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                selectedParentId === parent.id 
                  ? "border-accent bg-accent/10 text-accent" 
                  : "border-border hover:bg-surface-hover text-text-primary"
              )}
            >
              {parent.type === 'whiteboard' ? (
                <LayoutDashboard className="w-5 h-5 shrink-0 text-purple-400" />
              ) : (
                <FileText className="w-5 h-5 shrink-0 text-blue-400" />
              )}
              <div className="truncate">
                <div className="font-medium truncate">{parent.title || 'Untitled'}</div>
              </div>
            </button>
          ))}

          {availableParents.length === 0 && (
            <div className="text-center p-4 text-sm text-text-muted">
              No parent documents available
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-text-secondary hover:bg-surface-hover hover:text-text-primary">
            Cancel
          </Button>
          <Button onClick={handleMove} className="btn-primary border-none">
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
